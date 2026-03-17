import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ensureWatchlistTable } from "@/lib/db-schema";

let _watchlistReady = false;
async function ensureTable() {
  if (_watchlistReady) return;
  await ensureWatchlistTable();
  _watchlistReady = true;
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTable();

    const rows = await sql`
      SELECT id, postcode, label, intent, created_at
      FROM saved_areas
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ areas: rows });
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const postcode = (body.postcode || "").trim().toUpperCase();
    const label = (body.label || "").trim();
    const intent = body.intent || null;

    if (!postcode) {
      return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
    }

    await ensureTable();

    const rows = await sql`
      INSERT INTO saved_areas (user_id, postcode, label, intent)
      VALUES (${userId}, ${postcode}, ${label}, ${intent})
      ON CONFLICT (user_id, postcode) DO NOTHING
      RETURNING id, postcode, label, intent, created_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Area already saved" }, { status: 409 });
    }

    return NextResponse.json({ area: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Watchlist add error:", error);
    return NextResponse.json({ error: "Failed to save area" }, { status: 500 });
  }
}
