import { NextResponse } from "next/server";
import { getPortfolioChanges, triggerPortfolioChanges } from "@/lib/showcase/api";
import { handleApiError } from "../../../_shared";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const report = await getPortfolioChanges(id);
    return NextResponse.json(report);
  } catch (err) {
    return handleApiError(err, "Failed to check portfolio changes.");
  }
}

/* AR-764: side-effect-capable variant. The demo hardcodes emit:false so a
   "Re-scan" computes the report without firing material-change webhooks. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as {
      baseline?: "previous" | "first";
      threshold_pct?: number;
      min_transactions?: number;
    } | null;
    const report = await triggerPortfolioChanges(id, body ?? {});
    return NextResponse.json(report);
  } catch (err) {
    return handleApiError(err, "Failed to rescan portfolio changes.");
  }
}
