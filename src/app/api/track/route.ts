import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensurePageviewTable } from "@/lib/db-schema";

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await ensurePageviewTable();
  await sql`CREATE INDEX IF NOT EXISTS idx_pageviews_created ON pageviews (created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pageviews_path ON pageviews (path)`;
  tableReady = true;
}

export async function POST(req: NextRequest) {
  try {
    const { path, referrer, sessionId } = await req.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Skip tracking for admin, API, and static asset paths
    if (path.startsWith("/api") || path.startsWith("/admin") || path.startsWith("/_next")) {
      return NextResponse.json({ ok: true });
    }

    await ensureTable();

    // Simple device detection from user-agent
    const ua = req.headers.get("user-agent") || "";
    const device = /Mobile|Android|iPhone/i.test(ua) ? "mobile"
      : /Tablet|iPad/i.test(ua) ? "tablet"
      : "desktop";

    // Country from Vercel geo header
    const country = req.headers.get("x-vercel-ip-country") || null;

    // Clean referrer (strip query params, only keep external)
    let cleanReferrer: string | null = null;
    if (referrer && typeof referrer === "string") {
      try {
        const refUrl = new URL(referrer);
        if (!refUrl.hostname.includes("onegoodarea.com") && !refUrl.hostname.includes("localhost")) {
          cleanReferrer = refUrl.hostname;
        }
      } catch {
        // Invalid URL, skip
      }
    }

    await sql`
      INSERT INTO pageviews (path, referrer, country, device, session_id)
      VALUES (${path.slice(0, 200)}, ${cleanReferrer}, ${country}, ${device}, ${sessionId || null})
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail visibly
  }
}
