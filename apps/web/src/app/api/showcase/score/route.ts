import { NextRequest, NextResponse } from "next/server";
import { getScores } from "@/lib/showcase/api";
import type { Preset } from "@/lib/showcase/types";

export async function GET(req: NextRequest) {
  const area = req.nextUrl.searchParams.get("area")?.trim();
  if (!area) {
    return NextResponse.json({ error: "area is required" }, { status: 400 });
  }
  const presetRaw = req.nextUrl.searchParams.get("preset") || undefined;
  const preset = presetRaw as Preset | undefined;
  try {
    const result = await getScores(area, preset);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch scores." },
      { status: 502 },
    );
  }
}