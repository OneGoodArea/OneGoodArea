import { NextRequest, NextResponse } from "next/server";
import { getRuntimeConfig, getRuntimeDiagnostics } from "@/lib/runtime/env";
import { requireTestingRouteAccess } from "@/lib/runtime/testing/guards";

export async function GET(req: NextRequest) {
  const forbidden = requireTestingRouteAccess(req);
  if (forbidden) {
    return forbidden;
  }

  const config = await getRuntimeConfig();

  if (!config.localRuntimeEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  return NextResponse.json(await getRuntimeDiagnostics());
}
