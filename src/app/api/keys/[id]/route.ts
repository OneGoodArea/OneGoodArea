import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revokeApiKey } from "@/lib/api-keys";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const revoked = await revokeApiKey(userId, id);

  if (!revoked) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
