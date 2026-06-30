import type { AreaType } from "../inputs";

/* Migrated VERBATIM from legacy src/lib/data-sources/postcodes.ts. Changes:
   AreaType now imported from ../inputs (canonical) instead of re-declared,
   and each res.json() is cast to a minimal boundary type because Node's
   undici types it as unknown (vs any in the Next/DOM lib). Runtime unchanged. */

interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  parliamentary_constituency: string;
  region: string;
  country: string;
  admin_ward: string;
  parish: string;
  lsoa: string;
  msoa: string;
  rural_urban?: string;
  codes?: {
    lsoa?: string;
    msoa?: string;
    [key: string]: string | undefined | null;
  };
}

interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
  county: string;
  district: string;
  region: string;
  country: string;
}

export interface GeocodedArea {
  query: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  region: string;
  ward: string;
  constituency: string;
  country: string;
  lsoa: string;
  lsoa11: string;
  msoa: string;
  rural_urban: string;
  area_type: AreaType;
}

function classifyAreaType(ruralUrban: string): AreaType {
  const val = (ruralUrban || "").toLowerCase();
  if (val.includes("rural")) return "rural";
  if (val.includes("major") || val.includes("minor conurbation")) return "urban";
  // "Urban city and town", "Urban city and town in a sparse setting" -> suburban
  if (val.includes("urban")) return "suburban";
  return "suburban"; // default fallback
}

const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/* AR-390: bound every postcodes.io fetch to 5 seconds. Pre-fix the
   chain ran un-bounded — geocodePlace + autocomplete + reverse-geocode
   could string 3 hangs together for ~15-30 seconds on bad input.
   AbortController cancels the in-flight request; we treat that as a
   not-found-equivalent (null) at the call site. */
const POSTCODES_IO_TIMEOUT_MS = 5_000;

async function timedFetch(url: string, timeoutMs = POSTCODES_IO_TIMEOUT_MS): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function geocodeArea(query: string): Promise<GeocodedArea | null> {
  // Try as postcode first
  if (POSTCODE_REGEX.test(query.trim())) {
    return geocodePostcode(query.trim());
  }

  // Try as place name
  return geocodePlace(query.trim());
}

async function geocodePostcode(postcode: string): Promise<GeocodedArea | null> {
  try {
    const res = await timedFetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (!res || !res.ok) return null;

    const data = (await res.json()) as { status?: number; result?: PostcodeResult };
    if (data.status !== 200 || !data.result) return null;

    const r: PostcodeResult = data.result;
    const ruralUrban = r.rural_urban || "";
    return {
      query: postcode,
      latitude: r.latitude,
      longitude: r.longitude,
      admin_district: r.admin_district || "",
      region: r.region || "",
      ward: r.admin_ward || "",
      constituency: r.parliamentary_constituency || "",
      country: r.country || "",
      lsoa: r.codes?.lsoa || r.lsoa || "",
      lsoa11: r.codes?.lsoa11 || "",
      msoa: r.codes?.msoa || r.msoa || "",
      rural_urban: ruralUrban,
      area_type: classifyAreaType(ruralUrban),
    };
  } catch {
    return null;
  }
}

/* Type ranking for /places hits. Lower = more "centre-of-place" — prefer
   cities/towns over hamlets when picking ONE result. The ranking gap also
   drives ambiguity detection (AR-267): two top hits within the same tier
   AND with the same canonical name are flagged as ambiguous. */
const PLACE_TYPE_RANK: Record<string, number> = {
  City: 1, Town: 2, "Section of Named Road": 3,
  Village: 4, "Named Road": 5, "Suburban Area": 6,
  Hamlet: 7, "Other Settlement": 8,
};

type RankedPlace = PlaceResult & { local_type: string };

/* postcodes.io /places live response shape (snapshot 2026-07-01). The
   API returns name_1/name_2/district_borough/county_unitary — NOT the
   {name, district, county} our internal PlaceResult expects. AR-387:
   normalize here so downstream readers (normalisePlaceName,
   buildAmbiguousCandidate, placeToGeocodedArea) stay simple. */
interface RawPlaceResult {
  name_1?: string | null;
  name_2?: string | null;
  district_borough?: string | null;
  county_unitary?: string | null;
  region?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  local_type: string;
}

async function fetchPlaces(query: string): Promise<RankedPlace[] | null> {
  try {
    const res = await timedFetch(`https://api.postcodes.io/places?q=${encodeURIComponent(query)}&limit=10`);
    if (!res || !res.ok) return null;
    const data = (await res.json()) as { status?: number; result?: RawPlaceResult[] };
    if (data.status !== 200 || !data.result || data.result.length === 0) return null;
    const normalized: RankedPlace[] = data.result
      .map((raw) => ({
        name: raw.name_1 ?? raw.name_2 ?? "",
        latitude: raw.latitude,
        longitude: raw.longitude,
        county: raw.county_unitary ?? "",
        district: raw.district_borough ?? "",
        region: raw.region ?? "",
        country: raw.country ?? "",
        local_type: raw.local_type,
      }))
      // AR-387: defensive — drop rows that came back with no usable name
      // at all (would crash normalisePlaceName downstream).
      .filter((p) => p.name.length > 0);
    if (normalized.length === 0) return null;
    return normalized.sort(
      (a, b) => (PLACE_TYPE_RANK[a.local_type] ?? 9) - (PLACE_TYPE_RANK[b.local_type] ?? 9),
    );
  } catch {
    return null;
  }
}

/** Resolve a ranked place into a full GeocodedArea by reverse-geocoding its
    centre point through postcodes.io's nearest-postcode endpoint. Falls
    back to a partial record if the reverse lookup fails (so we still
    return something for known-good places sitting outside postcode units
    like national parks). */
async function placeToGeocodedArea(query: string, r: RankedPlace): Promise<GeocodedArea> {
  try {
    const reverseRes = await timedFetch(
      `https://api.postcodes.io/postcodes?lon=${r.longitude}&lat=${r.latitude}&limit=1`,
    );
    if (reverseRes && reverseRes.ok) {
      const reverseData = (await reverseRes.json()) as { result?: PostcodeResult[] };
      if (reverseData.result && reverseData.result.length > 0) {
        const p = reverseData.result[0];
        const ruralUrban = p.rural_urban || "";
        return {
          query: p.postcode || query,
          latitude: r.latitude,
          longitude: r.longitude,
          admin_district: p.admin_district || r.district || "",
          region: p.region || r.region || "",
          ward: p.admin_ward || "",
          constituency: p.parliamentary_constituency || "",
          country: p.country || r.country || "",
          lsoa: p.codes?.lsoa || p.lsoa || "",
          lsoa11: p.codes?.lsoa11 || "",
          msoa: p.codes?.msoa || p.msoa || "",
          rural_urban: ruralUrban,
          area_type: classifyAreaType(ruralUrban),
        };
      }
    }
  } catch { /* fall through to the partial fallback */ }

  return {
    query,
    latitude: r.latitude,
    longitude: r.longitude,
    admin_district: r.district || "",
    region: r.region || "",
    ward: "",
    constituency: "",
    country: r.country || "",
    lsoa: "",
    lsoa11: "",
    msoa: "",
    rural_urban: "",
    area_type: "suburban",
  };
}

async function geocodePlace(query: string): Promise<GeocodedArea | null> {
  // First try postcodes autocomplete in case it's a partial postcode
  try {
    const autocompleteRes = await timedFetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete`);
    if (autocompleteRes && autocompleteRes.ok) {
      const autocompleteData = (await autocompleteRes.json()) as { result?: string[] };
      if (autocompleteData.result && autocompleteData.result.length > 0) {
        return geocodePostcode(autocompleteData.result[0]);
      }
    }
  } catch { /* fall through to place search */ }

  const ranked = await fetchPlaces(query);
  if (!ranked) return null;
  const result = await placeToGeocodedArea(query, ranked[0]);
  /* AR-390: reject results with no UK LSOA. placeToGeocodedArea returns
     a partial-fallback object when the reverse-geocode fails — that
     used to leak through as a "valid" geocode with empty LSOA, so
     /v1/area?postcode=BAD returned 200 with country=Scotland (the
     nearest-postcode fallback) and downstream signal lookups failed
     silently. Better to return null and let the route emit 404. */
  if (!result.lsoa) return null;
  return result;
}

/* ── AR-267: ambiguity-aware resolver for the NL query plane ──

   geocodeArea (above) silently picked the top-ranked /places hit, which
   meant "Brixton" landed in Devon (Village rank 4) instead of London
   (Suburban Area rank 6) — a 200 OK with wrong-area data. /v1/query now
   uses geocodeAreaStrict, which returns a tagged result so the planner
   layer can return 422 with the candidate list when the answer is
   ambiguous.

   "Ambiguous" means: at least two /places hits share the same canonical
   place name (case-insensitive, trimmed). Single-tier dominance alone
   (e.g. one City vs one Village) is NOT ambiguous — that's the existing
   heuristic and it's correct most of the time. The name-collision rule
   catches the actual Brixton-shaped bug without false-positiving on
   normal place lookups. */

export interface AmbiguousAreaCandidate {
  label: string;
  postcode: string;
  district: string;
  country: string;
}

export type GeocodeAreaResult =
  | { kind: "ok"; area: GeocodedArea }
  | { kind: "ambiguous"; candidates: AmbiguousAreaCandidate[] }
  | { kind: "not_found" };

const MAX_AMBIGUOUS_CANDIDATES = 5;

function normalisePlaceName(name: string): string {
  return name.trim().toLowerCase();
}

async function buildAmbiguousCandidate(r: RankedPlace): Promise<AmbiguousAreaCandidate> {
  const partial = await placeToGeocodedArea(r.name, r);
  const districtBits = [r.district, r.county].filter(Boolean).join(", ");
  const label = districtBits ? `${r.name}, ${districtBits}` : r.name;
  return {
    label,
    postcode: partial.query,
    district: r.district || partial.admin_district || "",
    country: r.country || partial.country || "",
  };
}

export async function geocodeAreaStrict(query: string): Promise<GeocodeAreaResult> {
  const q = query.trim();
  if (POSTCODE_REGEX.test(q)) {
    const area = await geocodePostcode(q);
    return area ? { kind: "ok", area } : { kind: "not_found" };
  }

  // Same partial-postcode autocomplete fast path as geocodeArea.
  try {
    const autocompleteRes = await timedFetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete`);
    if (autocompleteRes && autocompleteRes.ok) {
      const autocompleteData = (await autocompleteRes.json()) as { result?: string[] };
      if (autocompleteData.result && autocompleteData.result.length > 0) {
        const area = await geocodePostcode(autocompleteData.result[0]);
        return area ? { kind: "ok", area } : { kind: "not_found" };
      }
    }
  } catch { /* fall through */ }

  const ranked = await fetchPlaces(q);
  if (!ranked || ranked.length === 0) return { kind: "not_found" };

  // Ambiguity = ≥2 hits with the same canonical name. Anything else
  // (single hit, or top hit dominates by name uniqueness) is OK.
  const target = normalisePlaceName(ranked[0].name);
  const sameName = ranked.filter((p) => normalisePlaceName(p.name) === target);
  if (sameName.length >= 2) {
    const candidates = await Promise.all(
      sameName.slice(0, MAX_AMBIGUOUS_CANDIDATES).map(buildAmbiguousCandidate),
    );
    return { kind: "ambiguous", candidates };
  }

  return { kind: "ok", area: await placeToGeocodedArea(q, ranked[0]) };
}
