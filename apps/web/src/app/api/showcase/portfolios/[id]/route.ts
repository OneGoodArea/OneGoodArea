import { NextResponse } from "next/server";
import { getPortfolio, deletePortfolio, renamePortfolio } from "@/lib/showcase/api";
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json() as { name?: string };
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Missing required 'name'." }, { status: 400 });
    }
    const portfolio = await renamePortfolio(id, body.name.trim());
    return NextResponse.json(portfolio);
  } catch (err) {
    return handleApiError(err, "Failed to rename portfolio.");
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
