import { NextRequest, NextResponse } from "next/server";
import { listPortfolios, createPortfolio } from "@/lib/showcase/api";
import { handleApiError } from "../_shared";

export async function GET() {
  try {
    const portfolios = await listPortfolios();
    return NextResponse.json({ portfolios });
  } catch (err) {
    return handleApiError(err, "Failed to list portfolios.");
  }
}

export async function POST(req: NextRequest) {
  let name: string;
  try {
    const body = await req.json();
    name = typeof body?.name === "string" ? body.name.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  try {
    const portfolio = await createPortfolio(name);
    return NextResponse.json(portfolio, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Failed to create portfolio.");
  }
}
