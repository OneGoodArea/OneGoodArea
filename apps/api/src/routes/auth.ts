import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { hashPassword, verifyPassword, generateToken } from "../modules/auth/crypto";
import { normalizeSignupSource } from "../modules/auth/signup-source";
import { sendVerificationEmail, sendPasswordResetEmail, sendMagicLinkEmail } from "../infrastructure/email/senders";
import { sql } from "../infrastructure/db/client";
import { row, type UserRow, type PasswordResetTokenRow } from "../infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS, APP_URL } from "../infrastructure/config";
import { generateId } from "../infrastructure/utils/id";
import { createPersonalOrgForUser } from "../modules/orgs";
import { authenticateSession } from "../shared/auth-session";
import { headerString } from "../shared/http";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";

import { trackEvent } from "../modules/tracking/activity";
/** auth route handlers — extracted from app.ts per AR-286. */
export function registerAuthRoutes(app: FastifyInstance): void {
    app.delete("/settings/delete-account", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        await sql`
          BEGIN;
          DELETE FROM api_keys WHERE user_id = ${userId};
          DELETE FROM activity_events WHERE user_id = ${userId};
          DELETE FROM email_verification_tokens WHERE user_id = ${userId};
          DELETE FROM subscriptions WHERE user_id = ${userId};
          DELETE FROM users WHERE id = ${userId};
          COMMIT;
        `;

        return reply.send({ success: true });
      } catch (error) {
        logger.error("Account deletion error:", error);
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        return reply.code(500).send({ error: "Failed to delete account" });
      }
    });

    app.post("/auth/register", async (request, reply) => {
      try {
        const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
        const rl = await rateLimit(`register:${ip}`, RATE_LIMITS.authRegister);
        if (!rl.success) {
          reply.headers(rateLimitHeaders(RATE_LIMITS.authRegister.max, rl));
          return reply.code(429).send({ error: "Too many attempts. Please try again later." });
        }

        const { email, password, signup_source } = (request.body ?? {}) as { email?: unknown; password?: unknown; signup_source?: unknown };
        const signupSource = normalizeSignupSource(typeof signup_source === "string" ? signup_source : undefined);
        if (!email || typeof email !== "string") {
          return reply.code(400).send({ error: "Email is required" });
        }
        if (!password || typeof password !== "string" || password.length < 8) {
          return reply.code(400).send({ error: "Password must be at least 8 characters" });
        }

        const sanitized = email.trim().toLowerCase();

        const existing = await sql`SELECT id, provider FROM users WHERE email = ${sanitized}`;
        if (existing.length > 0) {
          const { provider } = row<Pick<UserRow, "id" | "provider">>(existing[0]);
          if (provider === "google") {
            return reply.code(409).send({
              error: "email_oauth",
              message: "This email is linked to a Google account. Try signing in with Google instead.",
            });
          }
          if (provider === "github") {
            /* AR-415: GitHub sign-in removed. Legacy github-provider
               accounts land here on any password path; point them at
               support for account migration rather than a dead-end. */
            return reply.code(409).send({
              error: "email_github_removed",
              message: "This email signed up with GitHub. GitHub sign-in has been removed — contact support@onegoodarea.com to migrate your account.",
            });
          }
          return reply.code(409).send({
            error: "email_taken",
            message: "An account with this email already exists. Try signing in instead.",
          });
        }

        const id = generateId("user");
        const name = sanitized.split("@")[0];
        const hash = await hashPassword(password);

        await sql`
          INSERT INTO users (id, email, name, password_hash, provider, email_verified, signup_source)
          VALUES (${id}, ${sanitized}, ${name}, ${hash}, 'credentials', FALSE, ${signupSource})
        `;

        // Levers (AR-194): every new user gets a personal org auto-created
        // (matches the migration backfill formula). Idempotent — safe if the
        // user re-signs-up after deletion or if the helper races with anything.
        // Best-effort: a failure here does NOT block account creation; the
        // lazy ensure-org path on /v1/orgs covers it.
        try {
          await createPersonalOrgForUser(id, sanitized);
        } catch (e) {
          logger.error("Failed to create personal org for new user:", e);
        }

        // Send verification email (best-effort; account is created regardless).
        try {
          const token = generateToken();
          const tokenId = generateId("evt");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await sql`
            INSERT INTO email_verification_tokens (id, user_id, email, token, expires_at)
            VALUES (${tokenId}, ${id}, ${sanitized}, ${token}, ${expiresAt})
          `;
          await sendVerificationEmail(sanitized, token);
        } catch (e) {
          logger.error("Failed to send verification email:", e);
        }

        return reply.send({ ok: true });
      } catch (error) {
        logger.error("Register error:", error);
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        return reply.code(500).send({ error: "server_error", message: "Something went wrong. Please try again." });
      }
    });

    app.post("/auth/resend-verification", async (request, reply) => {
      try {
        const { email } = (request.body ?? {}) as { email?: unknown };
        if (!email || typeof email !== "string") {
          return reply.code(400).send({ error: "Email is required" });
        }
        const sanitized = email.trim().toLowerCase();

        const result = await sql`
          SELECT id, email_verified, provider FROM users WHERE email = ${sanitized}
        `;
        if (result.length === 0) return reply.send({ ok: true });

        const user = result[0];
        if (user.email_verified || user.provider !== "credentials") return reply.send({ ok: true });

        const recentTokens = await sql`
          SELECT COUNT(*) as count FROM email_verification_tokens
          WHERE email = ${sanitized} AND created_at > NOW() - INTERVAL '1 hour'
        `;
        if (Number(recentTokens[0].count) >= 3) {
          return reply.code(429).send({ error: "Too many requests. Please try again later." });
        }

        await sql`
          UPDATE email_verification_tokens SET used = TRUE
          WHERE user_id = ${user.id} AND used = FALSE
        `;

        const token = generateToken();
        const tokenId = generateId("evt");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await sql`
          INSERT INTO email_verification_tokens (id, user_id, email, token, expires_at)
          VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
        `;
        await sendVerificationEmail(sanitized, token);

        return reply.send({ ok: true });
      } catch (error) {
        logger.error("[resend-verification] Error:", error);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/auth/forgot-password", async (request, reply) => {
      try {
        const { email } = (request.body ?? {}) as { email?: unknown };
        if (!email || typeof email !== "string") {
          return reply.code(400).send({ error: "Email is required" });
        }
        const sanitized = email.trim().toLowerCase();

        const result = await sql`
          SELECT id, email, provider, password_hash FROM users WHERE email = ${sanitized}
        `;
        if (result.length === 0) return reply.send({ ok: true });

        const user = result[0];
        // No password to reset for OAuth-only users.
        if (user.provider !== "credentials" && !user.password_hash) return reply.send({ ok: true });

        const recentTokens = await sql`
          SELECT COUNT(*) as count FROM password_reset_tokens
          WHERE email = ${sanitized} AND created_at > NOW() - INTERVAL '1 hour'
        `;
        if (Number(recentTokens[0].count) >= 3) return reply.send({ ok: true });

        await sql`
          UPDATE password_reset_tokens SET used = TRUE
          WHERE user_id = ${user.id} AND used = FALSE
        `;

        const token = generateToken();
        const tokenId = generateId("prt");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await sql`
          INSERT INTO password_reset_tokens (id, user_id, email, token, expires_at)
          VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
        `;
        await sendPasswordResetEmail(sanitized, token);

        return reply.send({ ok: true });
      } catch (error) {
        logger.error("[forgot-password] Error:", error);
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/auth/reset-password", async (request, reply) => {
      try {
        const { token, password } = (request.body ?? {}) as { token?: unknown; password?: unknown };
        if (!token || typeof token !== "string") {
          return reply.code(400).send({ error: "Invalid reset link" });
        }
        if (!password || typeof password !== "string" || password.length < 8) {
          return reply.code(400).send({ error: "Password must be at least 8 characters" });
        }

        const result = await sql`
          SELECT user_id, email, expires_at, used FROM password_reset_tokens WHERE token = ${token}
        `;
        if (result.length === 0) {
          return reply.code(400).send({ error: "Invalid or expired reset link" });
        }

        const record = row<Pick<PasswordResetTokenRow, "user_id" | "email" | "expires_at" | "used">>(result[0]);
        if (record.used) {
          return reply.code(400).send({ error: "This reset link has already been used" });
        }
        if (new Date(record.expires_at) < new Date()) {
          return reply.code(400).send({ error: "This reset link has expired. Please request a new one." });
        }

        const hash = await hashPassword(password);
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${record.user_id}`;
        await sql`UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}`;

        return reply.send({ ok: true });
      } catch (error) {
        logger.error("[reset-password] Error:", error);
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/auth/login", async (request, reply) => {
      try {
        const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
        const rl = await rateLimit(`login:${ip}`, {
          max: 5,
          windowSeconds: 60,
        });
        if (!rl.success) {
          reply.headers(rateLimitHeaders(5, rl));
          return reply.code(429).send({ error: "Too many attempts. Please try again later." });
        }

        const { email, password } = (request.body ?? {}) as { email?: unknown; password?: unknown };
        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
          return reply.code(400).send({ error: "Email and password are required" });
        }

        const sanitized = email.trim().toLowerCase();
        const result = await sql`
          SELECT id, email, name, image, password_hash FROM users
          WHERE email = ${sanitized} AND provider = 'credentials'
        `;
        if (result.length === 0 || !result[0].password_hash) {
          return reply.code(401).send({ error: "invalid_credentials" });
        }

        const foundUser = row<
          Pick<UserRow, "id" | "email" | "name" | "image" | "password_hash">
        >(result[0]);

        const { valid, needsRehash } = await verifyPassword(password as string, foundUser.password_hash!);
        if (!valid) {
          return reply.code(401).send({ error: "invalid_credentials" });
        }

        // Transparently upgrade legacy SHA-256 hashes to PBKDF2
        if (needsRehash) {
          const newHash = await hashPassword(password as string);
          sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${foundUser.id}`.catch(() => {});
        }

        return reply.send({
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
        });
      } catch (error) {
        logger.error("Login error:", error);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/auth/magic-link/request", async (request, reply) => {
      try {
        const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
        const rl = await rateLimit(`magic-link-request:${ip}`, {
          max: 3,
          windowSeconds: 60,
        });
        if (!rl.success) {
          reply.headers(rateLimitHeaders(3, rl));
          return reply.code(429).send({ error: "Too many attempts. Please try again in a minute." });
        }

        const { email } = (request.body ?? {}) as { email?: unknown };
        if (!email || typeof email !== "string" || email.trim().length === 0 || !email.includes("@")) {
          return reply.send({ ok: true });
        }

        const sanitized = email.trim().toLowerCase();

        const users = await sql`SELECT id, provider FROM users WHERE email = ${sanitized}`;
        if (users.length === 0 || (users[0].provider && users[0].provider !== "credentials")) {
          return reply.send({ ok: true });
        }

        const user = row<Pick<UserRow, "id" | "provider">>(users[0]);
        const token = generateToken();
        const tokenId = generateId("mlt");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await sql`
          INSERT INTO magic_link_tokens (id, user_id, email, token, expires_at)
          VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
        `;

        try {
          await sendMagicLinkEmail(sanitized, token);
        } catch (e) {
          logger.error("Magic link email send failed:", e);
        }

        return reply.send({ ok: true });
      } catch (e) {
        logger.error("Magic link request error:", e);
        return reply.send({ ok: true });
      }
    });

    app.get("/auth/check-email", async (request, reply) => {
      try {
        const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
        const rl = await rateLimit(`check-email:${ip}`, {
          max: 20,
          windowSeconds: 60,
        });
        if (!rl.success) {
          reply.headers(rateLimitHeaders(20, rl));
          return reply.code(429).send({ error: "Too many attempts. Please try again later." });
        }

        const query = request.query as { email?: string };
        const rawEmail = query.email;
        if (!rawEmail || typeof rawEmail !== "string") {
          return reply.code(400).send({ error: "Email is required" });
        }

        const email = rawEmail.trim().toLowerCase();
        if (email.length === 0 || !email.includes("@")) {
          return reply.send({ exists: false });
        }

        const result = await sql`SELECT provider FROM users WHERE email = ${email}`;
        if (result.length === 0) {
          return reply.send({ exists: false });
        }

        const { provider } = row<Pick<UserRow, "provider">>(result[0]);
        return reply.send({ exists: true, provider: provider ?? "credentials" });
      } catch (error) {
        logger.error("[check-email] Error:", error);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/auth/check-email", async (request, reply) => {
      try {
        const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
        const rl = await rateLimit(`check-email:${ip}`, {
          max: 20,
          windowSeconds: 60,
        });
        if (!rl.success) {
          reply.headers(rateLimitHeaders(20, rl));
          return reply.code(429).send({ error: "Too many attempts. Please try again later." });
        }

        const body = request.body as { email?: unknown } | undefined;
        const rawEmail = body?.email;
        if (!rawEmail || typeof rawEmail !== "string") {
          return reply.code(400).send({ error: "Email is required" });
        }

        const email = rawEmail.trim().toLowerCase();
        if (email.length === 0 || !email.includes("@")) {
          return reply.send({ exists: false });
        }

        const result = await sql`SELECT provider FROM users WHERE email = ${email}`;
        if (result.length === 0) {
          return reply.send({ exists: false });
        }

        const { provider } = row<Pick<UserRow, "provider">>(result[0]);
        return reply.send({ exists: true, provider: provider ?? "credentials" });
      } catch (error) {
        logger.error("[check-email] Error:", error);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/auth/oauth-callback", async (request, reply) => {
      try {
        const { email, name, image, provider } = (request.body ?? {}) as {
          email?: unknown;
          name?: unknown;
          image?: unknown;
          provider?: unknown;
        };

        if (!email || typeof email !== "string") {
          return reply.code(400).send({ error: "Email is required" });
        }
        /* AR-415: only Google OAuth is supported. GitHub was removed;
           the callback route rejects it explicitly so a stray legacy
           client can't create a github-provider user. */
        const safeProvider = provider === "google" ? provider : undefined;
        if (!safeProvider) {
          return reply.code(400).send({ error: "Provider must be google" });
        }

        const sanitized = email.trim().toLowerCase();
        const existing = await sql`SELECT id FROM users WHERE email = ${sanitized}`;

        let id: string;
        if (existing.length === 0) {
          id = generateId("user");
          await sql`
            INSERT INTO users (id, email, name, image, provider, email_verified)
            VALUES (${id}, ${sanitized}, ${String(name ?? "")}, ${image ? String(image) : null}, ${safeProvider}, TRUE)
          `;
        } else {
          id = row<Pick<UserRow, "id">>(existing[0]).id;
          await sql`
            UPDATE users SET name = ${String(name ?? "")}, image = ${image ? String(image) : null}
            WHERE id = ${id}
          `;
        }

        trackEvent("auth.signin", id, { provider: safeProvider });

        return reply.send({ id });
      } catch (error) {
        logger.error("OAuth callback error:", error);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });

    app.post("/settings/password", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        const { currentPassword, newPassword } = (request.body ?? {}) as {
          currentPassword?: unknown;
          newPassword?: unknown;
        };

        if (!currentPassword || !newPassword) {
          return reply.code(400).send({ error: "Both fields are required" });
        }
        if (typeof newPassword !== "string" || newPassword.length < 8) {
          return reply.code(400).send({ error: "New password must be at least 8 characters" });
        }

        const result = await sql`SELECT password_hash, provider FROM users WHERE id = ${userId}`;
        if (result.length === 0) {
          return reply.code(404).send({ error: "User not found" });
        }

        const userRecord = row<Pick<UserRow, "password_hash" | "provider">>(result[0]);
        if (userRecord.provider !== "credentials" || !userRecord.password_hash) {
          return reply.code(400).send({ error: "Password change is only available for email/password accounts" });
        }

        const { valid } = await verifyPassword(currentPassword as string, userRecord.password_hash);
        if (!valid) {
          return reply.code(403).send({ error: "Current password is incorrect" });
        }

        const newHash = await hashPassword(newPassword);
        await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${userId}`;

        return reply.send({ success: true });
      } catch (error) {
        logger.error("Password change error:", error);
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        return reply.code(500).send({ error: "Failed to change password" });
      }
    });
}
