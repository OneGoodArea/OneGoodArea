import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";

// Silence the AR-135 retry logging.
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getNearbyAmenities, formatAmenitiesForPrompt, clearOverpassCache } from "@/modules/signals/data-sources/openstreetmap";
import type { AmenitiesData } from "@/modules/signals/inputs";

/* AR-397 added a module-level cache; reset between every test so cache
   carry-over can't pre-warm the next one. */
beforeEach(() => {
  clearOverpassCache();
});

/* AR-400 split the bundled 8-subquery into 8 parallel category fetches.
   The MSW handler inspects the request body and returns only the
   category-matching elements so aggregation lands at the correct count.

   Each call's body looks like:
     data=...nwr["amenity"~"^(school|...)..."](around:1500,53.4,-2.2)...
   We match on the selector substring to return that category's element. */

const ENDPOINT = "https://overpass-api.de/api/interpreter";

const ELEMENT_BY_CATEGORY: Record<string, { type: string; id: number; tags: Record<string, string> }> = {
  schools:       { type: "node", id: 1, tags: { amenity: "school", name: "St Mary's" } },
  food:          { type: "node", id: 2, tags: { amenity: "restaurant" } },
  pubs_bars:     { type: "node", id: 3, tags: { amenity: "pub", name: "The Crown" } },
  healthcare:    { type: "node", id: 4, tags: { amenity: "hospital", name: "Royal Infirmary" } },
  shops:         { type: "node", id: 5, tags: { shop: "supermarket", name: "Tesco" } },
  parks_leisure: { type: "node", id: 6, tags: { leisure: "park", name: "Heaton Park" } },
  stations:      { type: "node", id: 7, tags: { railway: "station", name: "Piccadilly" } },
  bus_stops:     { type: "node", id: 8, tags: { highway: "bus_stop" } },
};

/** Inspect the Overpass query body and return the element belonging to
    THAT category. AR-400's split means each call asks for one category. */
function categoryForQuery(body: string): keyof typeof ELEMENT_BY_CATEGORY | null {
  // body is URL-encoded; decode the selector
  const decoded = decodeURIComponent(body);
  if (decoded.includes(`"amenity"~"^(school|`)) return "schools";
  if (decoded.includes(`"amenity"~"^(restaurant|`)) return "food";
  if (decoded.includes(`"amenity"~"^(pub|`)) return "pubs_bars";
  if (decoded.includes(`"amenity"~"^(pharmacy|`)) return "healthcare";
  if (decoded.includes(`"shop"~"^(supermarket|`)) return "shops";
  if (decoded.includes(`"leisure"~"^(park|`)) return "parks_leisure";
  if (decoded.includes(`"railway"="station"`)) return "stations";
  if (decoded.includes(`"highway"="bus_stop"`)) return "bus_stops";
  return null;
}

/** Default handler: returns the right element for each of the 8
    category queries. Tests that need failure modes override this. */
function happyPathHandler(): ReturnType<typeof http.post> {
  return http.post(ENDPOINT, async ({ request }) => {
    const body = await request.text();
    const cat = categoryForQuery(body);
    if (!cat) return HttpResponse.json({ elements: [] });
    return HttpResponse.json({ elements: [ELEMENT_BY_CATEGORY[cat]] });
  });
}

describe("getNearbyAmenities (AR-400 parallel split)", () => {
  it("fires 8 parallel category queries and aggregates into category counts", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, async ({ request }) => {
      calls += 1;
      const body = await request.text();
      const cat = categoryForQuery(body);
      if (!cat) return HttpResponse.json({ elements: [] });
      return HttpResponse.json({ elements: [ELEMENT_BY_CATEGORY[cat]] });
    }));

    const r = await getNearbyAmenities(53.4, -2.2);
    expect(calls).toBe(8); // one per category
    expect(r).not.toBeNull();
    const a = r!;
    expect(a.schools).toBe(1);
    expect(a.restaurants_cafes).toBe(1);
    expect(a.pubs_bars).toBe(1);
    expect(a.healthcare).toBe(1);
    expect(a.shops).toBe(1);
    expect(a.parks_leisure).toBe(1);
    expect(a.transport_stations).toBe(1);
    expect(a.bus_stops).toBe(1);
    expect(a.total).toBe(8);
    expect(a.highlights).toContain("St Mary's");
    expect(a.highlights).toContain("Piccadilly station");
  });

  it("returns partial data when some categories fail (AR-400 partial-failure tolerance)", async () => {
    /* The motivating M1 1AE case: a few categories Overpass-time-out
       (food, parks at city centres tend to have huge result sets) but
       the rest succeed. Pre-AR-400 this returned null. Now it returns
       the surviving categories' counts so confidence stays > 0. */
    server.use(http.post(ENDPOINT, async ({ request }) => {
      const body = await request.text();
      const cat = categoryForQuery(body);
      if (cat === "food" || cat === "parks_leisure") {
        return HttpResponse.json({ remark: "runtime error: Query timed out", elements: [] });
      }
      if (!cat) return HttpResponse.json({ elements: [] });
      return HttpResponse.json({ elements: [ELEMENT_BY_CATEGORY[cat]] });
    }));

    const r = await getNearbyAmenities(53.4, -2.2);
    expect(r).not.toBeNull();
    expect(r!.restaurants_cafes).toBe(0); // food category was nulled
    expect(r!.parks_leisure).toBe(0);     // parks category was nulled
    expect(r!.schools).toBe(1);           // others survived
    expect(r!.healthcare).toBe(1);
    expect(r!.bus_stops).toBe(1);
    expect(r!.total).toBe(6); // 8 categories - 2 failed
  });

  it("returns null only when ALL 8 categories fail (total Overpass outage)", async () => {
    server.use(http.post(ENDPOINT, () => HttpResponse.error()));
    expect(await getNearbyAmenities(53.4, -2.2)).toBeNull();
  });

  it("returns null when ALL 8 categories return Overpass remarks", async () => {
    server.use(http.post(ENDPOINT, () =>
      HttpResponse.json({ remark: "runtime error: Query timed out", elements: [] })
    ));
    expect(await getNearbyAmenities(53.4, -2.2)).toBeNull();
  });
});

describe("getNearbyAmenities caching (AR-397, AR-400-compatible)", () => {
  it("serves a cached result on the second call (no second Overpass round-trip)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, async ({ request }) => {
      calls += 1;
      const body = await request.text();
      const cat = categoryForQuery(body);
      if (!cat) return HttpResponse.json({ elements: [] });
      return HttpResponse.json({ elements: [ELEMENT_BY_CATEGORY[cat]] });
    }));
    const first = await getNearbyAmenities(53.4, -2.2);
    expect(calls).toBe(8); // 8 cold-path fetches
    const second = await getNearbyAmenities(53.4, -2.2);
    expect(calls).toBe(8); // still 8: second call was cache-served
    expect(second).toEqual(first);
  });

  it("treats coords within ~10m as the same cache key (3 decimal places)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, async ({ request }) => {
      calls += 1;
      const body = await request.text();
      const cat = categoryForQuery(body);
      return HttpResponse.json({ elements: cat ? [ELEMENT_BY_CATEGORY[cat]] : [] });
    }));
    await getNearbyAmenities(53.4001, -2.2001);
    await getNearbyAmenities(53.4002, -2.2002);
    expect(calls).toBe(8); // only the first call's 8 fetches actually hit
  });

  it("treats distinct city centres as separate cache keys", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, async ({ request }) => {
      calls += 1;
      const body = await request.text();
      const cat = categoryForQuery(body);
      return HttpResponse.json({ elements: cat ? [ELEMENT_BY_CATEGORY[cat]] : [] });
    }));
    await getNearbyAmenities(53.4, -2.2); // Manchester
    await getNearbyAmenities(52.5, -1.9); // Birmingham
    expect(calls).toBe(16); // 8 per city
  });

  it("caches total-outage null (no busy-loop on a sustained outage)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, () => {
      calls += 1;
      return HttpResponse.error();
    }));
    const first = await getNearbyAmenities(53.4, -2.2);
    expect(first).toBeNull();
    expect(calls).toBe(8); // 8 parallel fetches all error
    const second = await getNearbyAmenities(53.4, -2.2);
    expect(second).toBeNull();
    expect(calls).toBe(8); // still 8: cached null
  });
});

describe("formatAmenitiesForPrompt", () => {
  it("renders category breakdown and notable places", () => {
    const data: AmenitiesData = {
      schools: 3,
      restaurants_cafes: 12,
      pubs_bars: 5,
      healthcare: 4,
      shops: 6,
      parks_leisure: 2,
      transport_stations: 1,
      bus_stops: 9,
      total: 42,
      highlights: ["Heaton Park", "Piccadilly station"],
    };
    const out = formatAmenitiesForPrompt(data);
    expect(out).toContain("OpenStreetMap via Overpass API");
    expect(out).toContain("Total amenities found: 42");
    expect(out).toContain("Heaton Park");
  });
});
