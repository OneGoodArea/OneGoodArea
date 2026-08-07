import { NextResponse } from "next/server";
import { ApiError } from "@/lib/showcase/api";

/** Map a lib/ApiError to the proxy response, mirroring the existing
    showcase BFF routes (score/transactions). */
export function handleApiError(err: unknown, fallback: string): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      err.body ?? { error: err.message },
      { status: err.status },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 502 });
}
