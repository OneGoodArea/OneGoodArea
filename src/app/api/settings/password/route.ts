import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { isAppError } from "@/lib/errors";
import { row, UserRow } from "@/lib/db-types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both fields are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Check user exists and has a password (credentials provider)
    const rows = await sql`
      SELECT password_hash, provider FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userRecord = row<Pick<UserRow, "password_hash" | "provider">>(rows[0]);

    if (userRecord.provider !== "credentials" || !userRecord.password_hash) {
      return NextResponse.json(
        { error: "Password change is only available for email/password accounts" },
        { status: 400 }
      );
    }

    // Verify current password
    const { valid } = await verifyPassword(currentPassword, userRecord.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    // Update password (always uses PBKDF2)
    const newHash = await hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
