import type { PropertyPriceData } from "../inputs";

/* Migrated VERBATIM from legacy src/lib/data-sources/land-registry.ts. Changes:
   PropertyPriceData imported from ../inputs (canonical) instead of re-declared,
   and the SPARQL res.json() is cast to a minimal boundary type (Node's undici
   types it as unknown vs any in the Next/DOM lib). Runtime unchanged.

   AR-758: getPropertyData now caches both the aggregate and the raw
   last-12-month transactions, exposing getPropertyTransactions. */

interface SparqlBinding {
  price: { value: string };
  date: { value: string };
  type: { value: string };
  estate: { value: string };
}

/* One raw sale record, retained from the SPARQL bindings. The individual
   transactions behind the aggregated property.* signals — served by
   getPropertyTransactions (the sales-history surface). */
export interface PropertyTransaction {
  date: string;
  price: number;
  property_type: string;
  estate_type: string;
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

/* AR-678: 5-min TTL cache keyed by outcode. Land Registry SPARQL takes ~21s
   on a cold path; repeated postcodes in the same outcode now pay once. Same
   LRU pattern as flood.ts / openstreetmap.ts.

   AR-758: the cache entry now carries the raw transactions alongside the
   aggregated PropertyPriceData, so getPropertyPrices and getPropertyTransactions
   share one SPARQL fetch per outcode. */
const PROPERTY_CACHE_TTL_MS = 5 * 60 * 1000;
const PROPERTY_CACHE_MAX = 1000;

interface PropertyDataResult {
  aggregate: PropertyPriceData | null;
  transactions: PropertyTransaction[] | null;
}

interface PropertyCacheEntry {
  value: PropertyDataResult;
  expires_at: number;
}

const propertyCache = new Map<string, PropertyCacheEntry>();

export function clearPropertyCache(): void {
  propertyCache.clear();
}

function propertyCacheGet(key: string, now: number): PropertyDataResult | undefined {
  const entry = propertyCache.get(key);
  if (!entry) return undefined;
  if (entry.expires_at <= now) {
    propertyCache.delete(key);
    return undefined;
  }
  propertyCache.delete(key);
  propertyCache.set(key, entry);
  return entry.value;
}

function propertyCacheSet(key: string, value: PropertyDataResult, now: number): void {
  if (propertyCache.size >= PROPERTY_CACHE_MAX && !propertyCache.has(key)) {
    const oldest = propertyCache.keys().next().value;
    if (oldest !== undefined) propertyCache.delete(oldest);
  }
  propertyCache.set(key, { value, expires_at: now + PROPERTY_CACHE_TTL_MS });
}

/* Fetch + cache both the aggregated PropertyPriceData and the raw last-12-month
   transactions for an outcode. Returns null only when the source has no data
   (also cached as null). */
async function getPropertyData(postcode: string): Promise<PropertyDataResult | null> {
  const outcode = extractOutcode(postcode);
  const now = Date.now();
  const cached = propertyCacheGet(outcode, now);
  if (cached !== undefined) return cached;

  try {

    // Query last 24 months for YoY comparison
    const currentDate = new Date();
    const twoYearsAgo = new Date(currentDate);
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
  FILTER(STRSTARTS(?postcode, "${outcode.replace(/[^A-Z0-9]/gi, "")} "))
  FILTER(?date >= "${startDate.replace(/[^0-9-]/g, "")}"^^xsd:date)
}
ORDER BY DESC(?date)
LIMIT 1500`;

    // HTTPS is required: the http:// variant of the SPARQL endpoint returns
    // an empty result set (200, zero bindings), which we'd cache as null and
    // surface as "no sale transactions".
    const res = await fetch("https://landregistry.data.gov.uk/landregistry/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
      },
      body: `query=${encodeURIComponent(query)}`,
      // 24-month query is slow on the upstream endpoint; 30s proved flaky.
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) { propertyCacheSet(outcode, { aggregate: null, transactions: null }, now); return null; }

    const data = (await res.json()) as { results?: { bindings?: SparqlBinding[] } };
    const bindings: SparqlBinding[] = data?.results?.bindings || [];
    if (bindings.length === 0) { propertyCacheSet(outcode, { aggregate: null, transactions: null }, now); return null; }

    // Split into current year (last 12 months) and prior year (12-24 months ago)
    const oneYearAgo = new Date(currentDate);
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
    const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0];

    const currentYear: { price: number; type: string; estate: string; date: string }[] = [];
    const priorYear: number[] = [];

    for (const b of bindings) {
      const price = parseFloat(b.price.value);
      const date = b.date.value;
      const type = b.type.value;
      const estate = b.estate.value;

      if (isNaN(price) || price <= 0) continue;

      if (date >= oneYearAgoStr) {
        currentYear.push({ price, type, estate, date });
      } else {
        priorYear.push(price);
      }
    }

    if (currentYear.length === 0) { propertyCacheSet(outcode, { aggregate: null, transactions: null }, now); return null; }

    // Transactions list (AR-758): last-12-month sales, newest first.
    const transactions: PropertyTransaction[] = currentYear.map((t) => ({
      date: t.date,
      price: t.price,
      property_type: formatPropertyType(t.type),
      estate_type: t.estate.includes("freehold") ? "freehold" : "leasehold",
    }));

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

    const result: PropertyDataResult = {
      aggregate: {
        postcode_area: outcode,
        median_price: medianPrice,
        mean_price: meanPrice,
        transaction_count: currentYear.length,
        price_change_pct: priceChangePct,
        by_property_type: byPropertyType,
        tenure_split: { freehold, leasehold },
        price_range: { min: Math.min(...currentPrices), max: Math.max(...currentPrices) },
        period: `${fmtMonth(oldest)} to ${fmtMonth(currentDate.toISOString())}`,
        prior_median: priorMedian,
      },
      transactions,
    };
    propertyCacheSet(outcode, result, now);
    return result;
  } catch {
    propertyCacheSet(outcode, { aggregate: null, transactions: null }, now);
    return null;
  }
}

export async function getPropertyPrices(postcode: string): Promise<PropertyPriceData | null> {
  const result = await getPropertyData(postcode);
  return result?.aggregate ?? null;
}

/* AR-758: individual last-12-month sales for an outcode, newest first. Shares
   the getPropertyData SPARQL fetch + cache with getPropertyPrices. */
export async function getPropertyTransactions(postcode: string): Promise<PropertyTransaction[] | null> {
  const result = await getPropertyData(postcode);
  return result?.transactions ?? null;
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
