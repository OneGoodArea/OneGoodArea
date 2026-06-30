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

/* MSW intercepts the Overpass endpoint. Locks the element->category
   aggregation, the AR-135 retry-once behaviour, the both-fail path, and the
   prompt formatter. */

const ENDPOINT = "https://overpass-api.de/api/interpreter";

const ELEMENTS = {
  elements: [
    { type: "node", id: 1, tags: { amenity: "school", name: "St Mary's" } },
    { type: "node", id: 2, tags: { amenity: "restaurant" } },
    { type: "node", id: 3, tags: { amenity: "pub", name: "The Crown" } },
    { type: "node", id: 4, tags: { amenity: "hospital", name: "Royal Infirmary" } },
    { type: "node", id: 5, tags: { shop: "supermarket", name: "Tesco" } },
    { type: "node", id: 6, tags: { leisure: "park", name: "Heaton Park" } },
    { type: "node", id: 7, tags: { railway: "station", name: "Piccadilly" } },
    { type: "node", id: 8, tags: { highway: "bus_stop" } },
  ],
};

describe("getNearbyAmenities", () => {
  it("aggregates Overpass elements into category counts and highlights", async () => {
    server.use(http.post(ENDPOINT, () => HttpResponse.json(ELEMENTS)));

    const r = await getNearbyAmenities(53.4, -2.2);
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

  it("retries once after a transient failure, then succeeds", async () => {
    let attempts = 0;
    server.use(
      http.post(ENDPOINT, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json(ELEMENTS);
      })
    );

    const r = await getNearbyAmenities(53.4, -2.2);
    expect(attempts).toBe(2);
    expect(r!.total).toBe(8);
  });

  it("returns null when both attempts fail", async () => {
    server.use(http.post(ENDPOINT, () => HttpResponse.error()));
    expect(await getNearbyAmenities(53.4, -2.2)).toBeNull();
  });
});

describe("getNearbyAmenities caching (AR-397)", () => {
  it("serves a cached result on the second call (no second Overpass round-trip)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, () => {
      calls += 1;
      return HttpResponse.json(ELEMENTS);
    }));
    const first = await getNearbyAmenities(53.4, -2.2);
    expect(calls).toBe(1);
    const second = await getNearbyAmenities(53.4, -2.2);
    expect(calls).toBe(1);
    expect(second).toEqual(first);
  });

  it("treats coords within ~10m as the same cache key (3 decimal places)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, () => {
      calls += 1;
      return HttpResponse.json(ELEMENTS);
    }));
    await getNearbyAmenities(53.4001, -2.2001);
    await getNearbyAmenities(53.4002, -2.2002);
    expect(calls).toBe(1);
  });

  it("treats distinct city centres as separate cache keys", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, () => {
      calls += 1;
      return HttpResponse.json(ELEMENTS);
    }));
    await getNearbyAmenities(53.4, -2.2); // Manchester
    await getNearbyAmenities(52.5, -1.9); // Birmingham
    expect(calls).toBe(2);
  });

  it("caches both-attempts-failed (no busy-loop on a sustained outage)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, () => {
      calls += 1;
      return HttpResponse.error();
    }));
    const first = await getNearbyAmenities(53.4, -2.2);
    expect(first).toBeNull();
    expect(calls).toBe(2); // first attempt + the AR-135 retry
    const second = await getNearbyAmenities(53.4, -2.2);
    expect(second).toBeNull();
    expect(calls).toBe(2); // still 2: the second getNearbyAmenities was cache-served
  });

  it("does NOT cache an Overpass remark response (so the next request retries)", async () => {
    let calls = 0;
    server.use(http.post(ENDPOINT, () => {
      calls += 1;
      /* This is the AR-397 case: server-side timeout returns HTTP 200
         with a remark field. We log + return null but do NOT cache the
         null, because the next request might succeed. */
      return HttpResponse.json({ remark: "runtime error: Query timed out in queryRequestArea: 26 of 26 sec", elements: [] });
    }));
    const first = await getNearbyAmenities(53.4, -2.2);
    expect(first).toBeNull();
    expect(calls).toBe(1);
    const second = await getNearbyAmenities(53.4, -2.2);
    expect(second).toBeNull();
    expect(calls).toBe(2); // not cached: a remark response is recoverable
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
