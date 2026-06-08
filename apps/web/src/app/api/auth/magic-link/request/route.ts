/* AR-250 [AR-248-B] POST /api/auth/magic-link/request

   Mints a magic-link token for the given email, persists to
   magic_link_tokens, and triggers a sign-in email via the configured
   provider (Resend in prod, mailhog in local-stack dev).

   Behaviour notes:
   - Tighter rate limit than register (3/min per IP) — each call sends
     a real email; we don't want to be an outbound spam vector if the
     endpoint is scraped
   - 15-minute TTL on the token per industry norm (AR-248 proposal
     §14 "Magic link token TTL")
   - **Always returns 200** for non-existent emails, to avoid
     enumeration. The actual send happens only when the email maps to
     a real user; otherwise the endpoint silently succeeds. (Same
     pattern as /api/auth/forgot-password.)
   - Email send failure is logged but does NOT fail the request — the
     UI tells the user "if that email exists, we sent a link," and
     they can click "resend" if nothing arrives. Better than leaking
     "this email didn't send" which would also be an enumeration
     signal. */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";
import { generateToken } from "@/lib/crypto";
import { generateId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/config";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  ensureUsersTable,
  ensureMagicLinkTokensTable,
} from "@/lib/db-schema";
import { row, UserRow } from "@/lib/db-types";

const TOKEN_TTL_MS = 15 * 60 * 1000;

let _tablesReady = false;
async function ensureTables() {
  if (_tablesReady) return;
  await Promise.all([ensureUsersTable(), ensureMagicLinkTokensTable()]);
  _tablesReady = true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(
    `magic-link-request:${ip}`,
    RATE_LIMITS.authMagicLinkRequest,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      {
        status: 429,
        headers: rateLimitHeaders(RATE_LIMITS.authMagicLinkRequest.max, rl),
      },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const rawEmail = body.email;

  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();
  if (email.length === 0 || !email.includes("@")) {
    /* Treat malformed emails as the success path so the response
       shape is uniform — no signal back to the caller about which
       inputs map to real users. */
    return NextResponse.json({ ok: true });
  }

  try {
    await ensureTables();

    const users = await sql`SELECT id, provider FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      /* No account for that email — silently succeed (no enumeration). */
      return NextResponse.json({ ok: true });
    }

    const user = row<Pick<UserRow, "id" | "provider">>(users[0]);
    /* Magic link signs the user in via the credentials provider's
       magic-link variant; OAuth-rooted accounts can't use it (they
       don't have a credentials session to mint). Silently succeed
       rather than leak that this is a Google/GitHub account. */
    if (user.provider && user.provider !== "credentials") {
      return NextResponse.json({ ok: true });
    }

    const tokenId = generateId("mlt");
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    await sql`
      INSERT INTO magic_link_tokens (id, user_id, email, token, expires_at)
      VALUES (${tokenId}, ${user.id}, ${email}, ${token}, ${expiresAt})
    `;

    try {
      await sendMagicLinkEmail(email, token);
    } catch (e) {
      /* Email send failure is logged but NOT surfaced — see notes at
         the top of the file. The UI's "didn't receive it? resend"
         flow gives the user agency to retry. */
      logger.error("Magic link email send failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("Magic link request error:", e);
    /* Even on internal failure, return 200 to keep the enumeration
       surface uniform. The user retries via the resend button if
       nothing arrives. */
    return NextResponse.json({ ok: true });
  }
}
