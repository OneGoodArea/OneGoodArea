/* AR-249 [AR-248-A] /get-started email-first existence check.

   Powers the email-first branching on /get-started: returns whether
   an account exists for the given email so the client can reveal the
   appropriate next step (password-only sign-in form vs full sign-up
   form). Also surfaces the auth provider (credentials / google /
   github) so we can route OAuth-rooted accounts back to their
   provider's button — though /get-started itself doesn't show OAuth
   buttons (per AR-248 proposal lock), this prevents a confusing
   "password doesn't work" loop for a user who originally signed up
   via Google on the legacy /sign-in page.

   Note on enumeration: the existing /api/auth/register endpoint
   already discloses "email_taken" + provider via its 409 response,
   so this endpoint isn't a new disclosure surface — it just makes
   that signal explicit and rate-limits it tighter (20/min vs 5/min)
   to discourage scripted enumeration.

   Response shape:
     200 { exists: true,  provider: "credentials" | "google" | "github" }
     200 { exists: false }
     400 { error: "Email is required" }
     429 { error: "Too many attempts. Please try again later." }
*/

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { RATE_LIMITS } from "@/lib/config";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { ensureUsersTable } from "@/lib/db-schema";
import { row, UserRow } from "@/lib/db-types";

let _tableReady = false;
async function ensureTable() {
  if (_tableReady) return;
  await ensureUsersTable();
  _tableReady = true;
}

export async function POST(req: NextRequest) {
  /* Rate limit by IP. Tighter than register; emails are typed once per
     real visit so the cap is generous against humans, restrictive against
     scripted lookup. */
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`check-email:${ip}`, RATE_LIMITS.authCheckEmail);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: rateLimitHeaders(RATE_LIMITS.authCheckEmail.max, rl),
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
    /* Treat malformed emails as non-existent rather than 400 so the
       client UX stays consistent (one happy path for "no account
       found"). The proper validation lives at the form layer. */
    return NextResponse.json({ exists: false });
  }

  await ensureTable();
  const result = await sql`SELECT provider FROM users WHERE email = ${email}`;
  if (result.length === 0) {
    return NextResponse.json({ exists: false });
  }

  const { provider } = row<Pick<UserRow, "provider">>(result[0]);
  return NextResponse.json({
    exists: true,
    provider: provider ?? "credentials",
  });
}
