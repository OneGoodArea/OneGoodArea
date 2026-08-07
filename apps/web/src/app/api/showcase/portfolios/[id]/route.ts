import { NextResponse } from "next/server";
import { getPortfolio, deletePortfolio } from "@/lib/showcase/api";
import { handleApiError } from "../../_shared";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const portfolio = await getPortfolio(id);
    return NextResponse.json(portfolio);
  } catch (err) {
    return handleApiError(err, "Failed to fetch portfolio.");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deletePortfolio(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleApiError(err, "Failed to delete portfolio.");
  }
}
