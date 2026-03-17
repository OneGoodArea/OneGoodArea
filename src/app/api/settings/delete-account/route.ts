import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isAppError } from "@/lib/errors";

export async function DELETE() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all user data in a single transaction (child tables first, user row last)
    await sql`
      BEGIN;
      DELETE FROM reports WHERE user_id = ${userId};
      DELETE FROM api_keys WHERE user_id = ${userId};
      DELETE FROM activity_events WHERE user_id = ${userId};
      DELETE FROM email_verification_tokens WHERE user_id = ${userId};
      DELETE FROM subscriptions WHERE user_id = ${userId};
      DELETE FROM users WHERE id = ${userId};
      COMMIT;
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
