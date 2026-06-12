import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const body = await req.json().catch(() => undefined);
  const res = await callApi(`/v1/invitations/${token}/accept`, { userId, method: "POST", body });
  return NextResponse.json(res.data, { status: res.status });
};
