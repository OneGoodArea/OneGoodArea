export interface PropertyPriceData {
  postcode_area: string;
  median_price: number;
  mean_price: number;
  transaction_count: number;
  price_change_pct: number | null;
  by_property_type: { type: string; median: number; count: number }[];
  tenure_split: { freehold: number; leasehold: number };
  price_range: { min: number; max: number };
  period: string;
  prior_median: number | null;
}

interface SparqlBinding {
  price: { value: string };
  date: { value: string };
  type: { value: string };
  estate: { value: string };
}

function extractOutcode(postcode: string): string {
  // "SW11 1AA" -> "SW11", "EC2A 4BX" -> "EC2A", "B1 1BB" -> "B1"
  const parts = postcode.trim().toUpperCase().split(/\s+/);
  return parts[0] || postcode.trim().toUpperCase();
}

function formatPropertyType(uri: string): string {
  const type = uri.split("/").pop() || uri;
  const map: Record<string, string> = {
    detached: "Detached",
    "semi-detached": "Semi-Detached",
    terraced: "Terraced",
    "flat-maisonette": "Flat",
    otherPropertyType: "Other",
  };
  return map[type] || type;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function getPropertyPrices(postcode: string): Promise<PropertyPriceData | null> {
  try {
    const outcode = extractOutcode(postcode);

    // Query last 24 months for YoY comparison
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
    const startDate = twoYearsAgo.toISOString().split("T")[0];

    const query = `
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?price ?date ?type ?estate
WHERE {
  ?txn lrppi:pricePaid ?price ;
       lrppi:transactionDate ?date ;
       lrppi:propertyType ?type ;
       lrppi:estateType ?estate ;
       lrppi:propertyAddress ?addr .
  ?addr lrcommon:postcode ?postcode .
  FILTER(STRSTARTS(?postcode, "${outcode} "))
  FILTER(?date >= "${startDate}"^^xsd:date)
}
ORDER BY DESC(?date)
LIMIT 1500`;

    const res = await fetch("http://landregistry.data.gov.uk/landregistry/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
      },
      body: `query=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const bindings: SparqlBinding[] = data?.results?.bindings || [];
    if (bindings.length === 0) return null;

    // Split into current year (last 12 months) and prior year (12-24 months ago)
    const oneYearAgo = new Date(now);
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
    const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0];

    const currentYear: { price: number; type: string; estate: string }[] = [];
    const priorYear: number[] = [];

    for (const b of bindings) {
      const price = parseFloat(b.price.value);
      const date = b.date.value;
      const type = b.type.value;
      const estate = b.estate.value;

      if (isNaN(price) || price <= 0) continue;

      if (date >= oneYearAgoStr) {
        currentYear.push({ price, type, estate });
      } else {
        priorYear.push(price);
      }
    }

    if (currentYear.length === 0) return null;

    // Current year stats
    const currentPrices = currentYear.map(t => t.price);
    const medianPrice = median(currentPrices);
    const meanPrice = Math.round(currentPrices.reduce((s, p) => s + p, 0) / currentPrices.length);

    // YoY change
    const priorMedian = priorYear.length >= 5 ? median(priorYear) : null;
    const priceChangePct = priorMedian
      ? Math.round(((medianPrice - priorMedian) / priorMedian) * 1000) / 10
      : null;

    // By property type
    const typeGroups: Record<string, number[]> = {};
    for (const t of currentYear) {
      const label = formatPropertyType(t.type);
      if (!typeGroups[label]) typeGroups[label] = [];
      typeGroups[label].push(t.price);
    }

    const byPropertyType = Object.entries(typeGroups)
      .map(([type, prices]) => ({
        type,
        median: median(prices),
        count: prices.length,
      }))
      .sort((a, b) => b.median - a.median);

    // Tenure split
    let freehold = 0;
    let leasehold = 0;
    for (const t of currentYear) {
      if (t.estate.includes("freehold")) freehold++;
      else leasehold++;
    }

    // Period label
    const oldest = currentYear.length > 0 ? oneYearAgoStr : startDate;
    const fmtMonth = (d: string) => {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    };

    return {
      postcode_area: outcode,
      median_price: medianPrice,
      mean_price: meanPrice,
      transaction_count: currentYear.length,
      price_change_pct: priceChangePct,
      by_property_type: byPropertyType,
      tenure_split: { freehold, leasehold },
      price_range: { min: Math.min(...currentPrices), max: Math.max(...currentPrices) },
      period: `${fmtMonth(oldest)} to ${fmtMonth(now.toISOString())}`,
      prior_median: priorMedian,
    };
  } catch {
    return null;
  }
}

export function formatPropertyDataForPrompt(data: PropertyPriceData): string {
  const lines = [
    `PROPERTY MARKET DATA (Source: HM Land Registry Price Paid):`,
    `Area: ${data.postcode_area} postcode district`,
    `Period: ${data.period} (${data.transaction_count} transactions)`,
    `Median sold price: £${data.median_price.toLocaleString()}`,
    `Mean sold price: £${data.mean_price.toLocaleString()}`,
    `Price range: £${data.price_range.min.toLocaleString()} to £${data.price_range.max.toLocaleString()}`,
  ];

  if (data.price_change_pct !== null) {
    const direction = data.price_change_pct >= 0 ? "up" : "down";
    lines.push(`YoY change: ${direction} ${Math.abs(data.price_change_pct)}% (prior year median: £${data.prior_median?.toLocaleString()})`);
  }

  if (data.by_property_type.length > 0) {
    lines.push("");
    lines.push("Median price by property type:");
    for (const t of data.by_property_type) {
      lines.push(`  - ${t.type}: £${t.median.toLocaleString()} (${t.count} sales)`);
    }
  }

  const total = data.tenure_split.freehold + data.tenure_split.leasehold;
  if (total > 0) {
    const freeholdPct = Math.round((data.tenure_split.freehold / total) * 100);
    lines.push(`Tenure: ${freeholdPct}% freehold, ${100 - freeholdPct}% leasehold`);
  }

  return lines.join("\n");
}
