import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { sendWelcomeEmail } from "@/lib/email";
import { row, VerificationTokenRow, UserRow } from "@/lib/db-types";
import VerifyClient from "@/app/design-v2/verify/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | OneGoodArea",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string; state?: string }>;
}

/* AR-342 (epic AR-340): the per-render CREATE TABLE IF NOT EXISTS for
   email_verification_tokens was removed. The apps/api migrator owns
   that table; bootstrapping it on every /verify render was a wasted
   roundtrip. Direct SQL here is auth-flow-adjacent — same documented
   exception as lib/auth.ts (see feedback_no_db_in_web). */
async function verifyToken(token: string): Promise<{ success: boolean }> {
  try {
    const rows = await sql`
      SELECT user_id, email, expires_at, used FROM email_verification_tokens
      WHERE token = ${token}
    `;

    if (rows.length === 0) return { success: false };

    const record = row<Pick<VerificationTokenRow, "user_id" | "email" | "expires_at" | "used">>(rows[0]);
    if (record.used) return { success: false };
    if (new Date(record.expires_at) < new Date()) return { success: false };

    await sql`UPDATE email_verification_tokens SET used = TRUE WHERE token = ${token}`;
    await sql`UPDATE users SET email_verified = TRUE WHERE id = ${record.user_id}`;

    try {
      const userRows = await sql`SELECT name FROM users WHERE id = ${record.user_id}`;
      const name = (userRows.length > 0 ? row<Pick<UserRow, "name">>(userRows[0]).name : null) || "there";
      await sendWelcomeEmail(record.email, name);
    } catch {
      // Welcome email is best-effort
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

export default async function VerifyPage({ searchParams }: Props) {
  const { token, state } = await searchParams;

  if (token) {
    const result = await verifyToken(token);
    redirect(`/verify?state=${result.success ? "success" : "failure"}`);
  }

  if (!state) redirect("/");

  return <VerifyClient />;
}
