import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-283: rotate the signing secret on an active subscription.
   Direct-DB write matching the other /api/me/webhooks paths. Returns
   the new plaintext secret ONCE for the dashboard's one-time-reveal
   panel. The old secret stops verifying signatures the instant this
   commits -- deliveries in the retry queue at rotation will fail
   signature verification on the receiver side. */

const SECRET_PREFIX = "whsec_";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const newSecret = `${SECRET_PREFIX}${randomBytes(24).toString("hex")}`;

  const result = await sql`
    UPDATE webhook_subscriptions
       SET secret = ${newSecret}
     WHERE id = ${id} AND user_id = ${userId} AND status = 'active'
     RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json(
      { error: "Webhook not found or already revoked" },
      { status: 404 },
    );
  }
  return NextResponse.json({ id, secret: newSecret });
}
