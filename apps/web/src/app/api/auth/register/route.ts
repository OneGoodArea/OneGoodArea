import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { hashPassword, generateToken } from "@/lib/crypto";
import { generateId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/config";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { ensureUsersTable, ensureVerificationTable } from "@/lib/db-schema";
import { isAppError } from "@/lib/errors";
import { row, UserRow } from "@/lib/db-types";
import {
  normalizeSignupSource,
  SIGNUP_SOURCE_DEFAULT,
} from "@/lib/signup-source";

let _registerTablesReady = false;
async function ensureRegisterTables() {
  if (_registerTablesReady) return;
  await Promise.all([ensureUsersTable(), ensureVerificationTable()]);
  _registerTablesReady = true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP to prevent spam signups
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(`register:${ip}`, RATE_LIMITS.authRegister);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(RATE_LIMITS.authRegister.max, rl) }
      );
    }

    const body = await req.json();
    const { email, password } = body as { email?: unknown; password?: unknown };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    /* signup_source attribution — comes from /get-started's
       ?source=... URL param via cookie. Falls back to "direct" if the
       client didn't include it OR if it's a malformed value. The
       client passes it explicitly rather than us reading the cookie
       here so this endpoint stays usable from non-browser callers
       (e.g. integration tests, CLI). */
    const rawSignupSource = (body as { signup_source?: unknown }).signup_source;
    const signupSource =
      typeof rawSignupSource === "string"
        ? normalizeSignupSource(rawSignupSource)
        : SIGNUP_SOURCE_DEFAULT;

    const sanitized = email.trim().toLowerCase();
    await ensureRegisterTables();

    // Check if email already exists
    const existing = await sql`SELECT id, provider FROM users WHERE email = ${sanitized}`;
    if (existing.length > 0) {
      const { provider } = row<Pick<UserRow, "id" | "provider">>(existing[0]);
      if (provider === "google" || provider === "github") {
        return NextResponse.json(
          { error: "email_oauth", message: `This email is linked to a ${provider === "google" ? "Google" : "GitHub"} account. Try signing in with ${provider === "google" ? "Google" : "GitHub"} instead.` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "email_taken", message: "An account with this email already exists. Try signing in instead." },
        { status: 409 }
        );
    }

    // Create user
    const id = generateId("user");
    const name = sanitized.split("@")[0];
    const hash = await hashPassword(password);

    await sql`
      INSERT INTO users (id, email, name, password_hash, provider, email_verified, signup_source)
      VALUES (${id}, ${sanitized}, ${name}, ${hash}, 'credentials', FALSE, ${signupSource})
    `;

    // Send verification email
    try {
      await ensureRegisterTables();
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Register error:", error);
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "server_error", message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
