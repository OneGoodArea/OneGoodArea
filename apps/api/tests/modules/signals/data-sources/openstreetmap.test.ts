import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";

// Silence the AR-135 retry logging.
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getNearbyAmenities, formatAmenitiesForPrompt } from "@/modules/signals/data-sources/openstreetmap";
import type { AmenitiesData } from "@/modules/signals/inputs";

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
