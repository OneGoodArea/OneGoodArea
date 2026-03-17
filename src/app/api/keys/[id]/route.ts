import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/with-auth";
import { revokeApiKey } from "@/lib/api-keys";

export const DELETE = withAuthParams<{ id: string }>(
  async (_req: NextRequest, { userId, params }) => {
    const revoked = await revokeApiKey(userId, params.id);

    if (!revoked) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  }
);
