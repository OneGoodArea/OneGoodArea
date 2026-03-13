export interface DeprivationData {
  lsoa_code: string;
  lsoa_name: string;
  local_authority: string;
  imd_rank: number;
  imd_decile: number;
}

/* ── Total areas per country (for percentile calculation) ── */

const TOTAL_ENGLAND = 32844;
const TOTAL_WALES = 1909;
const TOTAL_SCOTLAND = 6976;

/* ── England: IMD 2019 via ArcGIS ── */

async function getEnglandIMD(lsoa: string): Promise<DeprivationData | null> {
  const url = new URL(
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Index_of_Multiple_Deprivation_Dec_2019_Lookup_in_England_2022/FeatureServer/0/query"
  );
  url.searchParams.set("where", `LSOA11CD='${lsoa}'`);
  url.searchParams.set("outFields", "*");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  const attrs = data.features[0].attributes;
  const rank = attrs.IMD19;
  if (!rank) return null;

  return {
    lsoa_code: attrs.LSOA11CD,
    lsoa_name: attrs.LSOA11NM || "",
    local_authority: attrs.LAD19NM || "",
    imd_rank: rank,
    imd_decile: Math.ceil((rank / TOTAL_ENGLAND) * 10),
  };
}

/* ── Wales: WIMD 2019 via ArcGIS ── */

async function getWalesWIMD(lsoa11: string): Promise<DeprivationData | null> {
  if (!lsoa11) return null;

  const url = new URL(
    "https://services9.arcgis.com/3DS2hBWXSllJ5p3H/arcgis/rest/services/Welsh_Index_of_Multiple_Deprivation_WIMD_2019_Overall/FeatureServer/0/query"
  );
  url.searchParams.set("where", `lsoa_code='${lsoa11}'`);
  url.searchParams.set("outFields", "lsoa_code,lsoa_name0,rank,decile");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  const attrs = data.features[0].attributes;
  const rank = attrs.rank;
  if (!rank) return null;

  return {
    lsoa_code: attrs.lsoa_code || lsoa11,
    lsoa_name: attrs.lsoa_name0 || "",
    local_authority: "",
    imd_rank: rank,
    imd_decile: attrs.decile || Math.ceil((rank / TOTAL_WALES) * 10),
  };
}

/* ── Scotland: SIMD 2020 via ArcGIS ── */

async function getScotlandSIMD(dataZone: string): Promise<DeprivationData | null> {
  const url = new URL(
    "https://services.arcgis.com/XSeYKQzfXnEgju9o/arcgis/rest/services/SG_SIMD_2020/FeatureServer/0/query"
  );
  url.searchParams.set("where", `DataZone='${dataZone}'`);
  url.searchParams.set("outFields", "DataZone,DZName,LAName,Rankv2,Decilev2");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  const attrs = data.features[0].attributes;
  const rank = attrs.Rankv2;
  if (!rank) return null;

  return {
    lsoa_code: attrs.DataZone || dataZone,
    lsoa_name: attrs.DZName || "",
    local_authority: attrs.LAName || "",
    imd_rank: rank,
    imd_decile: attrs.Decilev2 || Math.ceil((rank / TOTAL_SCOTLAND) * 10),
  };
}

/* ── Main export: routes by country code ── */

export async function getDeprivationData(
  lsoa: string,
  lsoa11?: string
): Promise<DeprivationData | null> {
  if (!lsoa) return null;

  try {
    if (lsoa.startsWith("E")) {
      return await getEnglandIMD(lsoa);
    }

    if (lsoa.startsWith("W")) {
      // WIMD uses 2011 LSOA codes; fall back to the main lsoa code if lsoa11 unavailable
      return await getWalesWIMD(lsoa11 || lsoa);
    }

    if (lsoa.startsWith("S")) {
      // SIMD 2020 uses 2011 Data Zone codes; prefer lsoa11 if available
      return await getScotlandSIMD(lsoa11 || lsoa);
    }

    return null; // Northern Ireland (N-codes) not yet supported
  } catch {
    return null;
  }
}

/* ── Prompt formatting ── */

function getCountryContext(lsoaCode: string): { source: string; total: number; unit: string } {
  if (lsoaCode.startsWith("W")) return { source: "Welsh Index of Multiple Deprivation 2019", total: TOTAL_WALES, unit: "Welsh LSOAs" };
  if (lsoaCode.startsWith("S")) return { source: "Scottish Index of Multiple Deprivation 2020", total: TOTAL_SCOTLAND, unit: "Scottish Data Zones" };
  return { source: "MHCLG Index of Multiple Deprivation 2019", total: TOTAL_ENGLAND, unit: "English LSOAs" };
}

export function formatDeprivationForPrompt(data: DeprivationData): string {
  const ctx = getCountryContext(data.lsoa_code);
  const percentile = ((data.imd_rank / ctx.total) * 100).toFixed(0);
  const decileDesc =
    data.imd_decile <= 3
      ? "high deprivation"
      : data.imd_decile <= 7
        ? "moderate deprivation"
        : "low deprivation";

  return [
    `DEPRIVATION DATA (Source: ${ctx.source}):`,
    `LSOA: ${data.lsoa_name} (${data.lsoa_code})`,
    data.local_authority ? `Local Authority: ${data.local_authority}` : null,
    `IMD Rank: ${data.imd_rank.toLocaleString()} out of ${ctx.total.toLocaleString()} (${percentile}th percentile)`,
    `IMD Decile: ${data.imd_decile} out of 10 (1 = most deprived 10%, 10 = least deprived 10%) - ${decileDesc}`,
    ``,
    `Interpretation: This area is in the ${decileDesc} category. A rank of ${data.imd_rank.toLocaleString()} means it is less deprived than ${((data.imd_rank / ctx.total) * 100).toFixed(1)}% of neighbourhoods in ${data.lsoa_code.startsWith("W") ? "Wales" : data.lsoa_code.startsWith("S") ? "Scotland" : "England"}.`,
  ].filter(Boolean).join("\n");
}
