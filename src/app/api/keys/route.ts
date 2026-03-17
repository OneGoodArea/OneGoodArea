import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { hasApiAccess } from "@/lib/usage";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

export const GET = withAuth(async (_req, { userId }) => {
  const keys = await listApiKeys(userId);
  return NextResponse.json({ keys });
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const apiAllowed = await hasApiAccess(userId);
  if (!apiAllowed) {
    return NextResponse.json(
      { error: "API keys require a Developer, Business, or Growth plan. Upgrade at /pricing." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name || "Default";

  const key = await createApiKey(userId, name);
  return NextResponse.json({ key });
});
