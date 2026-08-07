import { NextResponse } from "next/server";
import { getPortfolioChanges } from "@/lib/showcase/api";
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
