import { NextRequest, NextResponse } from "next/server";
import { ApiError, getTransactions } from "@/lib/showcase/api";

export async function GET(req: NextRequest) {
  const postcode = req.nextUrl.searchParams.get("postcode")?.trim();
  if (!postcode) {
    return NextResponse.json({ error: "postcode is required" }, { status: 400 });
  }
  try {
    const result = await getTransactions(postcode);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        err.body ?? { error: err.message },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch transactions." },
      { status: 502 },
    );
  }
}
