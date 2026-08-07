import { NextRequest, NextResponse } from "next/server";
import { addPortfolioAreas } from "@/lib/showcase/api";
import { handleApiError } from "../../../_shared";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let areas: { area: string; label?: string | null }[];
  try {
    const body = await req.json();
    areas = Array.isArray(body?.areas) ? body.areas : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const cleaned = areas
    .map((a) => ({ area: typeof a?.area === "string" ? a.area.trim() : "", label: typeof a?.label === "string" ? a.label : null }))
    .filter((a) => a.area.length > 0);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "areas must be a non-empty array of { area }." }, { status: 400 });
  }
  try {
    const result = await addPortfolioAreas(params.id, cleaned);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, "Failed to add areas to portfolio.");
  }
}
