/* modules/monitor — the Monitor product (the 3rd product).

   A portfolio is a user's tracked book of areas. v1: create / list / get /
   delete + add areas + bulk enrich (score every area). Change detection +
   signal.changed/score.changed alerts ride the time-series in a later pass.

   Everything is scoped by user_id (ownership): every query filters on the
   api-key's user, so one user can never touch another's portfolios. Re-scopes to
   org_id when Levers (tenancy) land. See ADR 0009. */

import { sql } from "../../infrastructure/db/client";
import { rows } from "../../infrastructure/db/types";
import { generateId } from "../../infrastructure/utils/id";
import { logger } from "../tracking/structured-logger";
import { scoreArea } from "../scoring";
import type { Portfolio, PortfolioDetail, PortfolioEnrichItem } from "@onegoodarea/contracts";

/** Max areas accepted in one add call + max enriched per request (enrich is
    synchronous + live-fetches per area; large books move to an async job later). */
export const PORTFOLIO_ADD_MAX = 200;
export const PORTFOLIO_ENRICH_MAX = 50;
const ENRICH_CONCURRENCY = 5;

interface PortfolioRow { id: string; name: string; created_at: string; area_count?: number }
interface AreaRow { id: string; area: string; label: string | null; created_at: string }

export async function createPortfolio(userId: string, name: string): Promise<Portfolio> {
  const id = generateId("pf");
  await sql`INSERT INTO portfolios (id, user_id, name) VALUES (${id}, ${userId}, ${name})`;
  return { id, name, area_count: 0 };
}

export async function listPortfolios(userId: string): Promise<Portfolio[]> {
  const result = rows<PortfolioRow>(await sql`
    SELECT p.id, p.name, p.created_at, COUNT(a.id)::int AS area_count
    FROM portfolios p
    LEFT JOIN portfolio_areas a ON a.portfolio_id = p.id
    WHERE p.user_id = ${userId}
    GROUP BY p.id, p.name, p.created_at
    ORDER BY p.created_at DESC
  `);
  return result.map((p) => ({ id: p.id, name: p.name, area_count: p.area_count, created_at: p.created_at }));
}

/** A portfolio + its areas, or null if it does not exist / is not owned. */
export async function getPortfolio(userId: string, id: string): Promise<PortfolioDetail | null> {
  const p = rows<PortfolioRow>(await sql`SELECT id, name, created_at FROM portfolios WHERE id = ${id} AND user_id = ${userId}`)[0];
  if (!p) return null;
  const areas = rows<AreaRow>(await sql`SELECT id, area, label, created_at FROM portfolio_areas WHERE portfolio_id = ${id} ORDER BY created_at`);
  return { id: p.id, name: p.name, created_at: p.created_at, area_count: areas.length, areas };
}

export async function deletePortfolio(userId: string, id: string): Promise<boolean> {
  const owned = rows(await sql`SELECT id FROM portfolios WHERE id = ${id} AND user_id = ${userId}`);
  if (owned.length === 0) return false;
  await sql`DELETE FROM portfolio_areas WHERE portfolio_id = ${id}`;
  await sql`DELETE FROM portfolios WHERE id = ${id} AND user_id = ${userId}`;
  return true;
}

/** Add areas to a portfolio (dedup on (portfolio_id, area)). Returns the number
    actually inserted, or null if the portfolio is not owned. */
export async function addAreas(
  userId: string,
  portfolioId: string,
  areas: { area: string; label?: string | null }[],
): Promise<{ added: number } | null> {
  const owned = rows(await sql`SELECT id FROM portfolios WHERE id = ${portfolioId} AND user_id = ${userId}`);
  if (owned.length === 0) return null;

  let added = 0;
  for (const a of areas) {
    const res = await sql`
      INSERT INTO portfolio_areas (id, portfolio_id, area, label)
      VALUES (${generateId("pfa")}, ${portfolioId}, ${a.area}, ${a.label ?? null})
      ON CONFLICT (portfolio_id, area) DO NOTHING
      RETURNING id
    `;
    if (res.length > 0) added++;
  }
  await sql`UPDATE portfolios SET updated_at = NOW() WHERE id = ${portfolioId}`;
  return { added };
}

/** Map with bounded concurrency (don't fan out N live-fetches at once). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** Score every area in a portfolio (bulk enrich). Returns null if not owned.
    Per-area failures are captured (error) rather than failing the whole call. */
export async function enrichPortfolio(
  userId: string,
  id: string,
  preset: Parameters<typeof scoreArea>[0]["preset"] = "research",
): Promise<PortfolioEnrichItem[] | null> {
  const detail = await getPortfolio(userId, id);
  if (!detail) return null;

  const areas = detail.areas.slice(0, PORTFOLIO_ENRICH_MAX);
  const results = await mapLimit(areas, ENRICH_CONCURRENCY, async (a): Promise<PortfolioEnrichItem> => {
    try {
      const score = await scoreArea({ area: a.area, preset });
      return { area: a.area, label: a.label, score, error: score ? null : "Could not resolve area" };
    } catch (err) {
      logger.error(`[monitor] enrich failed for "${a.area}":`, err);
      return { area: a.area, label: a.label, score: null, error: "Enrichment failed" };
    }
  });

  logger.info(`[monitor] enriched portfolio ${id}: ${results.length} areas (${results.filter((r) => r.score).length} scored)`);
  return results;
}
