import { NextRequest, NextResponse } from "next/server";
import { ApiError, getForecast } from "@/lib/showcase/api";
import { handleApiError } from "../_shared";

export async function GET(req: NextRequest) {
  const postcode = req.nextUrl.searchParams.get("postcode")?.trim();
  if (!postcode) {
    return NextResponse.json({ error: "postcode is required" }, { status: 400 });
  }
  try {
    const forecast = await getForecast(postcode);
    return NextResponse.json({ forecast });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return NextResponse.json({ forecast: null });
    }
    return handleApiError(err, "Failed to fetch forecast.");
  }
}
