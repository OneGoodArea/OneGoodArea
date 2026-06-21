import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { resolveOrgId } from "@/lib/server/org";
import { callApi } from "@/lib/server/api-client";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await resolveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  const { id: bundleId } = await params;
  const body = await req.json().catch(() => undefined);
  const res = await callApi(`/v1/orgs/${orgId}/bundles/${bundleId}`, { userId, method: "PATCH", body });
  return NextResponse.json(res.data, { status: res.status });
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await resolveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  const { id: bundleId } = await params;
  const res = await callApi(`/v1/orgs/${orgId}/bundles/${bundleId}`, { userId, method: "DELETE" });
  return NextResponse.json(res.data, { status: res.status });
};
