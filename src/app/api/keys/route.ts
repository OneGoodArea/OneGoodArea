import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserPlan } from "@/lib/usage";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await listApiKeys(userId);
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await getUserPlan(userId);
  if (plan !== "api") {
    return NextResponse.json(
      { error: "API keys require the API plan. Upgrade at /pricing." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name || "Default";

  const key = await createApiKey(userId, name);
  return NextResponse.json({ key });
}
