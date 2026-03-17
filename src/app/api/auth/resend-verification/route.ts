import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { generateToken } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/id";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const sanitized = email.trim().toLowerCase();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({ ok: true });

    // Check user exists and is unverified credentials user
    const rows = await sql`
      SELECT id, email_verified, provider FROM users WHERE email = ${sanitized}
    `;

    if (rows.length === 0) return successResponse;

    const user = rows[0];
    if (user.email_verified || user.provider !== "credentials") return successResponse;

    // Rate limit: max 3 verification emails per hour
    const recentTokens = await sql`
      SELECT COUNT(*) as count FROM email_verification_tokens
      WHERE email = ${sanitized} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (Number(recentTokens[0].count) >= 3) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    // Invalidate old tokens
    await sql`
      UPDATE email_verification_tokens SET used = TRUE
      WHERE user_id = ${user.id} AND used = FALSE
    `;

    // Create new token (24 hour expiry)
    const token = generateToken();
    const tokenId = generateId("evt");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO email_verification_tokens (id, user_id, email, token, expires_at)
      VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
    `;

    await sendVerificationEmail(sanitized, token);

    return successResponse;
  } catch (error) {
    logger.error("[resend-verification] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
