import { NextResponse } from "next/server";
import { ApiError, removePortfolioArea } from "@/lib/showcase/api";
import { handleApiError } from "../../../../_shared";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; area: string }> },
) {
  try {
    const { id, area } = await params;
    await removePortfolioArea(id, area);
    return NextResponse.json({ removed: true });
  } catch (err) {
    /* Idempotent delete: the API 404s when the area is already gone — treat
       that as success so the UI can refetch without a spurious error. */
    if (err instanceof ApiError && err.status === 404) {
      return NextResponse.json({ removed: true });
    }
    return handleApiError(err, "Failed to remove area from portfolio.");
  }
}
