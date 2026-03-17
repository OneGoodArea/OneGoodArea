import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateToken } from "@/lib/crypto";
import { ensurePasswordResetTable } from "@/lib/db-schema";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/id";

let _resetTableReady = false;
async function ensureTable() {
  if (_resetTableReady) return;
  await ensurePasswordResetTable();
  _resetTableReady = true;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const sanitized = email.trim().toLowerCase();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({ ok: true });

    // Check if user exists and uses credentials
    const rows = await sql`
      SELECT id, email, provider, password_hash FROM users WHERE email = ${sanitized}
    `;

    if (rows.length === 0) return successResponse;

    const user = rows[0];

    // Don't send reset for OAuth-only users (no password to reset)
    if (user.provider !== "credentials" && !user.password_hash) {
      return successResponse;
    }

    // Rate limit: max 3 reset emails per hour per email
    await ensureTable();
    const recentTokens = await sql`
      SELECT COUNT(*) as count FROM password_reset_tokens
      WHERE email = ${sanitized} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (Number(recentTokens[0].count) >= 3) return successResponse;

    // Invalidate any existing unused tokens for this user
    await sql`
      UPDATE password_reset_tokens SET used = TRUE
      WHERE user_id = ${user.id} AND used = FALSE
    `;

    // Create new token (1 hour expiry)
    const token = generateToken();
    const tokenId = generateId("prt");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO password_reset_tokens (id, user_id, email, token, expires_at)
      VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
    `;

    await sendPasswordResetEmail(sanitized, token);

    return successResponse;
  } catch (error) {
    logger.error("[forgot-password] Error:", error);
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
