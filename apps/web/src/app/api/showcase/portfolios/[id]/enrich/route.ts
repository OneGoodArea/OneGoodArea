import { NextRequest, NextResponse } from "next/server";
import { enrichPortfolio } from "@/lib/showcase/api";
import { handleApiError } from "../../../_shared";
import type { Preset } from "@/lib/showcase/types";

const PRESETS: Preset[] = ["moving", "business", "investing", "research"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let preset: Preset | undefined;
  try {
    const body = await req.json();
    if (body?.preset !== undefined) {
      if (typeof body.preset !== "string" || !PRESETS.includes(body.preset as Preset)) {
        return NextResponse.json(
          { error: "preset must be one of: moving, business, investing, research." },
          { status: 400 },
        );
      }
      preset = body.preset as Preset;
    }
  } catch {
    /* no body → use the API default preset */
  }
  try {
    const { id } = await params;
    const results = await enrichPortfolio(id, preset);
    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return handleApiError(err, "Failed to enrich portfolio.");
  }
}
