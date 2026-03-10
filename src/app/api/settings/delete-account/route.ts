import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all user data in dependency order (child tables first, user row last)
    await sql`DELETE FROM reports WHERE user_id = ${userId}`;
    await sql`DELETE FROM api_keys WHERE user_id = ${userId}`;
    await sql`DELETE FROM activity_events WHERE user_id = ${userId}`;
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;
    await sql`DELETE FROM subscriptions WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
