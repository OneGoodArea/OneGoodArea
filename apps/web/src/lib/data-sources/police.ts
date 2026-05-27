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

export interface CrimeSummary {
  total_crimes: number;
  months_covered: number;
  by_category: Record<string, number>;
  top_streets: { name: string; count: number }[];
  outcome_breakdown: Record<string, number>;
  monthly_trend: { month: string; count: number }[];
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

async function fetchCrimesForMonth(
  lat: number,
  lng: number,
  month: string
): Promise<PoliceCrime[]> {
  try {
    const res = await fetch(
      `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${month}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getCrimeData(lat: number, lng: number): Promise<CrimeSummary | null> {
  try {
    const months = getRecentMonths(3);

    // Fetch all months in parallel
    const results = await Promise.all(
      months.map((month) => fetchCrimesForMonth(lat, lng, month))
    );

    const allCrimes = results.flat();
    if (allCrimes.length === 0) return null;

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
      months_covered: results.filter((r) => r.length > 0).length,
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
