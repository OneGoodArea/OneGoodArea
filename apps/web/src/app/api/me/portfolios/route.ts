import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-263: list the signed-in user's portfolios + their areas.
   Paginated + search-filtered to keep response sizes bounded as
   accounts grow (10k+ portfolios was Pedro's stress case).

   Query params:
     ?page=1
     ?page_size=20    (capped at 100)
     ?q=<substring>   (case-insensitive substring match against name)

   Areas come back inline for the rows on the current page only.
   Future big-portfolio accounts get a per-portfolio detail endpoint
   so we don't ship 1000 areas in the list response. */

interface PortfolioRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface AreaRow {
  id: string;
  portfolio_id: string;
  area: string;
  label: string | null;
  created_at: string;
}

interface CountRow {
  total: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const rawSize = Number.parseInt(
    url.searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE),
    10,
  );
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize))
    : DEFAULT_PAGE_SIZE;
  const q = (url.searchParams.get("q") ?? "").trim();
  const qLike = q ? `%${q}%` : null;
  const offset = (page - 1) * pageSize;

  try {
    /* Total count (search-aware) for the paginator UI. */
    const countRows = (qLike
      ? ((await sql`
          SELECT COUNT(*)::int AS total
            FROM portfolios
           WHERE user_id = ${userId}
             AND name ILIKE ${qLike}
        `) as CountRow[])
      : ((await sql`
          SELECT COUNT(*)::int AS total
            FROM portfolios
           WHERE user_id = ${userId}
        `) as CountRow[]));
    const total = countRows[0]?.total ?? 0;

    /* Page rows. */
    const portfolios = (qLike
      ? ((await sql`
          SELECT id, name, created_at, updated_at
            FROM portfolios
           WHERE user_id = ${userId}
             AND name ILIKE ${qLike}
           ORDER BY created_at DESC
           LIMIT ${pageSize}
          OFFSET ${offset}
        `) as PortfolioRow[])
      : ((await sql`
          SELECT id, name, created_at, updated_at
            FROM portfolios
           WHERE user_id = ${userId}
           ORDER BY created_at DESC
           LIMIT ${pageSize}
          OFFSET ${offset}
        `) as PortfolioRow[]));

    if (portfolios.length === 0) {
      return NextResponse.json({
        portfolios: [],
        total,
        page,
        page_size: pageSize,
      });
    }

    /* Areas only for the portfolios on THIS page. Bounded regardless
       of total. portfolio_ids array has at most page_size entries. */
    const portfolioIds = portfolios.map((p) => p.id);
    const areas = (await sql`
      SELECT id, portfolio_id, area, label, created_at
        FROM portfolio_areas
       WHERE portfolio_id = ANY(${portfolioIds})
       ORDER BY created_at ASC
    `) as AreaRow[];

    const areasByPortfolio: Record<string, AreaRow[]> = {};
    for (const a of areas) {
      (areasByPortfolio[a.portfolio_id] ||= []).push(a);
    }

    const out = portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      updated_at: p.updated_at,
      area_count: (areasByPortfolio[p.id] ?? []).length,
      areas: (areasByPortfolio[p.id] ?? []).map((a) => ({
        id: a.id,
        area: a.area,
        label: a.label,
      })),
    }));

    return NextResponse.json({
      portfolios: out,
      total,
      page,
      page_size: pageSize,
    });
  } catch {
    return NextResponse.json({
      portfolios: [],
      total: 0,
      page,
      page_size: pageSize,
    });
  }
}
