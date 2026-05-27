import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const rows = await sql`
      DELETE FROM saved_areas
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Watchlist delete error:", error);
    return NextResponse.json({ error: "Failed to remove area" }, { status: 500 });
  }
}
