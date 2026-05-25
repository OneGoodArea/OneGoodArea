import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { isAppError } from "@/lib/errors";
import { row, PasswordResetTokenRow } from "@/lib/db-types";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid reset link" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Look up token
    const rows = await sql`
      SELECT user_id, email, expires_at, used FROM password_reset_tokens
      WHERE token = ${token}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const record = row<Pick<PasswordResetTokenRow, "user_id" | "email" | "expires_at" | "used">>(rows[0]);

    if (record.used) {
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Update password
    const hash = await hashPassword(password);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${record.user_id}`;

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[reset-password] Error:", error);
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
