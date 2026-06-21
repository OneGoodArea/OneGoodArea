import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-281: revoke a webhook subscription. Soft-delete via status =
   'revoked' (mirrors apps/api's behaviour — the row stays for delivery
   audit history; the delivery worker filters on status = 'active'). */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await sql`
    UPDATE webhook_subscriptions
       SET status = 'revoked'
     WHERE id = ${id} AND user_id = ${userId} AND status = 'active'
     RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json(
      { error: "Webhook not found or already revoked" },
      { status: 404 },
    );
  }
  return NextResponse.json({ revoked: true });
}
