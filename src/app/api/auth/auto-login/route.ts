import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * AUTO-LOGIN API ROUTE (Local Test Env Only)
 * 
 * Bypasses the normal auth flow for rapid testing.
 * Only active when OGA_LOCAL_RUNTIME_ENABLED=true.
 */
export async function GET(req: NextRequest) {
  if (process.env.OGA_LOCAL_RUNTIME_ENABLED !== "true") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    // Find user in local DB
    const users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    
    if (users.length === 0) {
      // Auto-create test user if they don't exist
      const userId = `user_${Date.now()}`;
      await sql`
        INSERT INTO users (id, email, name, email_verified)
        VALUES (${userId}, ${email}, 'Test User', TRUE)
      `;
      logger.info(`[auto-login] Created new test user: ${email}`);
    }

    // In a real implementation with NextAuth, we would set the session cookie here.
    // For now, this route serves as a placeholder for the logic that Step 4 requires.
    // We'll return the user info to confirm they are "logged in" for the local runtime.
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${email} is now authorized for local testing.`,
      user: users[0] || { email, name: 'Test User' }
    });
  } catch (err) {
    logger.error("[auto-login] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
