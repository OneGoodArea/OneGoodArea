import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { sendWelcomeEmail } from "@/lib/email";
import { row, VerificationTokenRow, UserRow } from "@/lib/db-types";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | AreaIQ",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

async function verifyToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const rows = await sql`
      SELECT user_id, email, expires_at, used FROM email_verification_tokens
      WHERE token = ${token}
    `;

    if (rows.length === 0) return { success: false, error: "Invalid verification link." };

    const record = row<Pick<VerificationTokenRow, "user_id" | "email" | "expires_at" | "used">>(rows[0]);
    if (record.used) return { success: false, error: "This link has already been used." };
    if (new Date(record.expires_at) < new Date()) return { success: false, error: "This link has expired. Please sign up again." };

    // Mark token as used
    await sql`UPDATE email_verification_tokens SET used = TRUE WHERE token = ${token}`;

    // Mark user as verified
    await sql`UPDATE users SET email_verified = TRUE WHERE id = ${record.user_id}`;

    // Send welcome email
    try {
      const userRows = await sql`SELECT name FROM users WHERE id = ${record.user_id}`;
      const name = (userRows.length > 0 ? row<Pick<UserRow, "name">>(userRows[0]).name : null) || "there";
      await sendWelcomeEmail(record.email, name);
    } catch {
      // Welcome email is best-effort
    }

    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export default async function VerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect("/");

  const result = await verifyToken(token);

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] text-center">
          {result.success ? (
            <>
              <div
                className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-[20px]"
                style={{ background: "var(--neon-green-dim)", color: "var(--neon-green)" }}
              >
                ✓
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                Email verified
              </h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--text-secondary)" }}>
                Your account is ready. Sign in to generate your first report.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex h-10 px-6 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                style={{ background: "var(--text-primary)", color: "var(--bg)" }}
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              <div
                className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-[20px]"
                style={{ background: "var(--neon-red-dim)", color: "var(--neon-red)" }}
              >
                ✕
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                Verification failed
              </h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--text-secondary)" }}>
                {result.error}
              </p>
              <Link
                href="/sign-up"
                className="inline-flex h-10 px-6 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                style={{ background: "var(--text-primary)", color: "var(--bg)" }}
              >
                Sign Up Again
              </Link>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
