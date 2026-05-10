import { NextResponse } from "next/server";
import { getRuntimeConfig, getRuntimeDiagnostics } from "@/lib/runtime/env";

export async function GET() {
  const config = await getRuntimeConfig();

  if (!config.localRuntimeEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  return NextResponse.json(await getRuntimeDiagnostics());
}
