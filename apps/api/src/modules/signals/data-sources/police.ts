import type { CrimeSummary } from "../inputs";

/* Migrated VERBATIM from legacy src/lib/data-sources/police.ts. Only change:
   the exported CrimeSummary result type now lives in ../inputs (the canonical
   data-source type module the scoring engine already imports), so it is
   imported here instead of re-declared. Runtime behaviour is unchanged. */

interface PoliceCrime {
  category: string;
  location_type: string;
  location: {
    latitude: string;
    longitude: string;
    street: {
      id: number;
      name: string;
    };
  };
  context: string;
  outcome_status: {
    category: string;
    date: string;
  } | null;
  month: string;
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  // Police.uk data typically lags 2-3 months
  now.setMonth(now.getMonth() - 3);

  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/* AR-268: tagged fetch result so the aggregator can tell "HTTP 200 with []"
   (genuine zero-crime month in covered area) from "request failed"
   (timeout / 5xx / network). Conflating the two made area-profile.ts label
   every England/Wales postcode that happens to have low recorded crime as
   "No police.uk coverage" — false for M20 2RN and any low-traffic LSOA. */
type MonthFetch = { ok: true; crimes: PoliceCrime[] } | { ok: false };

async function fetchCrimesForMonth(
  lat: number,
  lng: number,
  month: string
): Promise<MonthFetch> {
  try {
    const res = await fetch(
      `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${month}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return { ok: false };
    return { ok: true, crimes: (await res.json()) as PoliceCrime[] };
  } catch {
    return { ok: false };
  }
}

export async function getCrimeData(lat: number, lng: number): Promise<CrimeSummary | null> {
  try {
    const months = getRecentMonths(3);

    // Fetch all months in parallel
    const results = await Promise.all(
      months.map((month) => fetchCrimesForMonth(lat, lng, month))
    );

    /* Null only when EVERY month errored. If at least one fetch succeeded
       (even with []) the area is covered and we return an empty summary
       so downstream can say "zero crimes recorded" instead of "no coverage". */
    const okResults = results.filter((r): r is { ok: true; crimes: PoliceCrime[] } => r.ok);
    if (okResults.length === 0) return null;

    const allCrimes = okResults.flatMap((r) => r.crimes);
    const monthsWithCrimes = okResults.filter((r) => r.crimes.length > 0).length;

    if (allCrimes.length === 0) {
      /* months_covered keeps the legacy "months with crimes" semantic
         (engine v2 divides by it). The mere presence of a non-null
         summary tells area-profile.ts that police.uk DID respond. */
      return {
        total_crimes: 0,
        months_covered: 0,
        by_category: {},
        top_streets: [],
        outcome_breakdown: {},
        monthly_trend: [],
      };
    }

    // Aggregate by category
    const byCategory: Record<string, number> = {};
    const streetCounts: Record<string, number> = {};
    const outcomeCounts: Record<string, number> = {};
    const monthlyCounts: Record<string, number> = {};

    for (const crime of allCrimes) {
      // Category
      const cat = formatCategory(crime.category);
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      // Streets
      const street = crime.location?.street?.name || "Unknown";
      if (street !== "On or near " && street !== "") {
        streetCounts[street] = (streetCounts[street] || 0) + 1;
      }

      // Outcomes
      const outcome = crime.outcome_status?.category || "Under investigation";
      outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;

      // Monthly
      monthlyCounts[crime.month] = (monthlyCounts[crime.month] || 0) + 1;
    }

    // Top streets
    const topStreets = Object.entries(streetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Monthly trend (sorted chronologically)
    const monthlyTrend = Object.entries(monthlyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    return {
      total_crimes: allCrimes.length,
      months_covered: monthsWithCrimes,
      by_category: byCategory,
      top_streets: topStreets,
      outcome_breakdown: outcomeCounts,
      monthly_trend: monthlyTrend,
    };
  } catch {
    return null;
  }
}

function formatCategory(category: string): string {
  return category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatCrimeDataForPrompt(data: CrimeSummary): string {
  const lines: string[] = [
    `REAL CRIME DATA (Source: police.uk, last ${data.months_covered} months):`,
    `Total recorded crimes: ${data.total_crimes}`,
    "",
    "Crime breakdown by category:",
  ];

  const sortedCategories = Object.entries(data.by_category)
    .sort((a, b) => b[1] - a[1]);

  for (const [cat, count] of sortedCategories) {
    const pct = ((count / data.total_crimes) * 100).toFixed(1);
    lines.push(`  - ${cat}: ${count} (${pct}%)`);
  }

  if (data.top_streets.length > 0) {
    lines.push("");
    lines.push("Highest-crime streets:");
    for (const s of data.top_streets) {
      lines.push(`  - ${s.name}: ${s.count} incidents`);
    }
  }

  if (data.monthly_trend.length > 1) {
    lines.push("");
    lines.push("Monthly trend:");
    for (const m of data.monthly_trend) {
      lines.push(`  - ${m.month}: ${m.count} crimes`);
    }
  }

  return lines.join("\n");
}
