import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { geocodeArea, geocodeAreaStrict, lookupTerminatedPostcode } from "@/modules/signals/data-sources/postcodes";

/* MSW locks the geocode branches (postcodes.io) without the network: direct
   postcode lookup + rural/urban classification, the not-found path, and the
   place-name path (autocomplete miss -> ranked places -> reverse geocode). */

const POSTCODE = "https://api.postcodes.io/postcodes/:postcode";
const AUTOCOMPLETE = "https://api.postcodes.io/postcodes/:postcode/autocomplete";
const PLACES = "https://api.postcodes.io/places";
const REVERSE = "https://api.postcodes.io/postcodes";

function postcodeResult(overrides: Record<string, unknown> = {}) {
  return {
    status: 200,
    result: {
      latitude: 53.4,
      longitude: -2.2,
      admin_district: "Manchester",
      region: "North West",
      admin_ward: "Piccadilly",
      parliamentary_constituency: "Manchester Central",
      country: "England",
      lsoa: "Manchester 054",
      msoa: "Manchester 021",
      rural_urban: "Urban major conurbation",
      codes: { lsoa: "E01033677", lsoa11: "E01005227", msoa: "E02001234" },
      ...overrides,
    },
  };
}

describe("geocodeArea (postcode path)", () => {
  it("maps a postcode lookup into a GeocodedArea", async () => {
    server.use(http.get(POSTCODE, () => HttpResponse.json(postcodeResult())));

    const r = await geocodeArea("M1 1AE");
    expect(r).not.toBeNull();
    expect(r!.latitude).toBe(53.4);
    expect(r!.admin_district).toBe("Manchester");
    expect(r!.constituency).toBe("Manchester Central");
    expect(r!.lsoa).toBe("E01033677"); // prefers codes.lsoa
    expect(r!.lsoa11).toBe("E01005227");
    expect(r!.area_type).toBe("urban");
  });

  it.each([
    ["Rural village in a sparse setting", "rural"],
    ["Urban major conurbation", "urban"],
    ["Urban city and town", "suburban"],
  ])("classifies rural_urban '%s' as %s", async (ruralUrban, expected) => {
    server.use(
      http.get(POSTCODE, () => HttpResponse.json(postcodeResult({ rural_urban: ruralUrban })))
    );
    const r = await geocodeArea("M1 1AE");
    expect(r!.area_type).toBe(expected);
  });

  it("returns null when the postcode is not found", async () => {
    server.use(http.get(POSTCODE, () => new HttpResponse(null, { status: 404 })));
    expect(await geocodeArea("M1 1AE")).toBeNull();
  });
});

describe("geocodeArea (place-name path)", () => {
  it("ranks places, prefers a city over a hamlet, then reverse-geocodes", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({
          /* AR-387: postcodes.io /places returns {name_1, name_2,
             district_borough, county_unitary} — NOT {name, district,
             county}. Test mocks updated 2026-07-01 to match live API. */
          status: 200,
          result: [
            { name_1: "Manchester Hamlet", latitude: 1, longitude: 1, county_unitary: null, district_borough: "X", region: "Y", country: "England", local_type: "Hamlet" },
            { name_1: "Manchester", latitude: 53.48, longitude: -2.24, county_unitary: null, district_borough: "Manchester", region: "North West", country: "England", local_type: "City" },
          ],
        })
      ),
      http.get(REVERSE, () =>
        HttpResponse.json({
          result: [
            {
              postcode: "M2 5DB",
              admin_district: "Manchester",
              region: "North West",
              admin_ward: "Deansgate",
              parliamentary_constituency: "Manchester Central",
              country: "England",
              lsoa: "",
              msoa: "",
              rural_urban: "Urban major conurbation",
              codes: { lsoa: "E01033600", lsoa11: "E01005200", msoa: "E02001200" },
            },
          ],
        })
      )
    );

    const r = await geocodeArea("Manchester");
    expect(r).not.toBeNull();
    expect(r!.query).toBe("M2 5DB");        // from reverse geocode
    expect(r!.latitude).toBe(53.48);        // from the City-ranked place
    expect(r!.admin_district).toBe("Manchester");
    expect(r!.area_type).toBe("urban");
  });
});

/* ── AR-267: ambiguity-aware resolver ──

   The original geocoder silently picked the type-ranked top hit, which
   for "Brixton" meant the Devon Village beat London SW2 (a Suburban
   Area) and we returned 200 with wrong-area data. geocodeAreaStrict
   surfaces a tagged result so /v1/query can return 422 + candidates. */
describe("geocodeAreaStrict (AR-267)", () => {
  it("returns ok for an unambiguous postcode without hitting /places", async () => {
    server.use(http.get(POSTCODE, () => HttpResponse.json(postcodeResult())));
    const r = await geocodeAreaStrict("M1 1AE");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.area.lsoa).toBe("E01033677");
  });

  it("returns ambiguous when two /places hits share the same name (Brixton-shaped)", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({
          status: 200,
          result: [
            // The actual bug: Devon Brixton wins the type rank (Village=4)
            // over London Brixton (Suburban Area=6).
            // AR-387: live API uses name_1/district_borough/county_unitary.
            { name_1: "Brixton", latitude: 50.36, longitude: -4.04, county_unitary: "Devon", district_borough: "South Hams", region: "South West", country: "England", local_type: "Village" },
            { name_1: "Brixton", latitude: 51.46, longitude: -0.11, county_unitary: "Greater London", district_borough: "Lambeth", region: "London", country: "England", local_type: "Suburban Area" },
          ],
        }),
      ),
      http.get(REVERSE, ({ request }) => {
        const url = new URL(request.url);
        const lat = url.searchParams.get("lat");
        // Return matching reverse-geocodes per candidate so the labels carry a real postcode.
        return HttpResponse.json({
          result: [
            lat === "50.36"
              ? { postcode: "PL8 2AQ", admin_district: "South Hams", region: "South West", admin_ward: "", parliamentary_constituency: "", country: "England", lsoa: "", msoa: "", rural_urban: "Rural village", codes: { lsoa: "E01000000", lsoa11: "", msoa: "" } }
              : { postcode: "SW2 1AA", admin_district: "Lambeth",    region: "London",     admin_ward: "", parliamentary_constituency: "", country: "England", lsoa: "", msoa: "", rural_urban: "Urban major conurbation", codes: { lsoa: "E01000999", lsoa11: "", msoa: "" } },
          ],
        });
      }),
    );

    const r = await geocodeAreaStrict("Brixton");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.candidates.length).toBe(2);
      // Both should carry a real district and postcode so the caller can disambiguate.
      expect(r.candidates.map((c) => c.district).sort()).toEqual(["Lambeth", "South Hams"]);
      expect(r.candidates.every((c) => c.postcode.length > 0)).toBe(true);
      expect(r.candidates.every((c) => c.label.includes("Brixton"))).toBe(true);
    }
  });

  it("returns ok when only one candidate matches the name (e.g. 'Manchester')", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({
          status: 200,
          result: [
            // AR-387: live API uses name_1/district_borough/county_unitary.
            { name_1: "Manchester",  latitude: 53.48, longitude: -2.24, county_unitary: null, district_borough: "Manchester", region: "North West", country: "England", local_type: "City" },
            { name_1: "Manchester Hamlet", latitude: 1, longitude: 1, county_unitary: null, district_borough: "X",          region: "Y",          country: "England", local_type: "Hamlet" },
          ],
        }),
      ),
      http.get(REVERSE, () =>
        HttpResponse.json({
          result: [{ postcode: "M2 5DB", admin_district: "Manchester", region: "North West", admin_ward: "", parliamentary_constituency: "", country: "England", lsoa: "", msoa: "", rural_urban: "Urban major conurbation", codes: { lsoa: "E01033600", lsoa11: "", msoa: "" } }],
        }),
      ),
    );

    const r = await geocodeAreaStrict("Manchester");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.area.admin_district).toBe("Manchester");
  });

  it("returns not_found when /places returns nothing", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () => HttpResponse.json({ status: 200, result: [] })),
    );
    const r = await geocodeAreaStrict("PlaceThatDoesNotExist");
    expect(r.kind).toBe("not_found");
  });

  /* AR-387: regression test for the contract drift that 500'd /v1/query
     on score_area with place names. The postcodes.io /places API
     returns {name_1, name_2, district_borough, county_unitary} — NOT
     the {name, district, county} shape our PlaceResult expected.
     fetchPlaces now normalizes; this test pins that contract. */
  it("normalizes postcodes.io /places fields (name_1, district_borough, county_unitary) without crashing", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({
          status: 200,
          result: [
            {
              code: "osgb4000000074567025",
              name_1: "Manchester",
              name_1_lang: null,
              name_2: null,
              name_2_lang: null,
              local_type: "City",
              county_unitary: null,
              county_unitary_type: null,
              district_borough: "Manchester",
              district_borough_type: "MetropolitanDistrict",
              region: "North West",
              country: "England",
              longitude: -2.245,
              latitude: 53.478,
            },
          ],
        }),
      ),
      http.get(REVERSE, () =>
        HttpResponse.json({
          result: [{ postcode: "M2 5DB", admin_district: "Manchester", region: "North West", admin_ward: "", parliamentary_constituency: "", country: "England", lsoa: "", msoa: "", rural_urban: "Urban major conurbation", codes: { lsoa: "E01033600", lsoa11: "", msoa: "" } }],
        }),
      ),
    );

    const r = await geocodeAreaStrict("Manchester");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") {
      expect(r.area.admin_district).toBe("Manchester");
      // Critical: didn't crash on normalisePlaceName(undefined).
    }
  });

  it("drops /places rows missing both name_1 and name_2 (defensive against API garbage)", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({
          status: 200,
          result: [
            { name_1: null, name_2: null, latitude: 1, longitude: 1, local_type: "Other", county_unitary: null, district_borough: null, region: "", country: "" },
          ],
        }),
      ),
    );
    const r = await geocodeAreaStrict("Garbage");
    expect(r.kind).toBe("not_found");
  });
});

/* AR-390: invalid inputs used to burn 15 seconds chaining 3 HTTP
   calls then return a "Scotland" geocode with no LSOA. The geocoder
   now (1) bounds each network call at 5s via AbortController, and
   (2) rejects place-search results that don't resolve to a real UK
   LSOA — so /v1/area?postcode=BAD returns null and the route emits
   404 fast, instead of 200 with garbage data. */
describe("geocodeArea — invalid input early-rejection (AR-390)", () => {
  it("returns null when the reverse-geocode has no LSOA (no real UK location)", async () => {
    server.use(
      // autocomplete returns nothing
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      // /places returns SOMETHING (Scotland fallback)
      http.get(PLACES, () =>
        HttpResponse.json({
          status: 200,
          result: [
            { name_1: "BAD", name_2: null, latitude: 57.69, longitude: -5.73, local_type: "Suburban Area", county_unitary: null, district_borough: null, region: "Scotland", country: "Scotland" },
          ],
        }),
      ),
      // reverse-geocode returns a result with no codes.lsoa (the bug surface)
      http.get(REVERSE, () =>
        HttpResponse.json({
          result: [{ postcode: null, admin_district: null, region: "Scotland", admin_ward: "", parliamentary_constituency: "", country: "Scotland", lsoa: "", msoa: "", rural_urban: "", codes: { lsoa: "", lsoa11: "", msoa: "" } }],
        }),
      ),
    );
    // Pre-AR-390 this returned {country: "Scotland", lsoa: null, ...}
    // after a 15s chain. Now: null, fast.
    const r = await geocodeArea("BAD");
    expect(r).toBeNull();
  });
});

/* AR-711/712: terminated-postcode detection. postcodes.io's public
   /postcodes/:postcode returns a BARE 404 for terminated postcodes, so
   the dedicated /terminated_postcodes/:postcode endpoint is the source
   of truth for the termination year/month. Only postcode-shaped queries
   are eligible (place names can never be terminated). */
describe("lookupTerminatedPostcode (AR-711/712)", () => {
  const TERMINATED = "https://api.postcodes.io/terminated_postcodes/:postcode";

  it("returns year_terminated + month_terminated for a postcode in the terminated dataset", async () => {
    server.use(
      http.get(TERMINATED, () =>
        HttpResponse.json({
          status: 200,
          result: { postcode: "AB1 0AA", year_terminated: 1996, month_terminated: 6 },
        })
      )
    );

    const r = await lookupTerminatedPostcode("AB1 0AA");
    expect(r).toEqual({ postcode: "AB1 0AA", year_terminated: 1996, month_terminated: 6 });
  });

  it("returns null for a postcode not in the terminated dataset (404)", async () => {
    server.use(http.get(TERMINATED, () => new HttpResponse(null, { status: 404 })));
    expect(await lookupTerminatedPostcode("M1 1AE")).toBeNull();
  });

  it("returns null on a non-200 status", async () => {
    server.use(http.get(TERMINATED, () => HttpResponse.json({ status: 500 }, { status: 500 })));
    expect(await lookupTerminatedPostcode("AB1 0AA")).toBeNull();
  });

  it("returns null for a place name without hitting the network (regex gate)", async () => {
    expect(await lookupTerminatedPostcode("Nowhereville")).toBeNull();
  });

  it("is case/space-insensitive like the regular geocoder", async () => {
    server.use(
      http.get(TERMINATED, () =>
        HttpResponse.json({
          status: 200,
          result: { postcode: "AB1 0AA", year_terminated: 1996, month_terminated: 6 },
        })
      )
    );
    expect(await lookupTerminatedPostcode("ab1  0aa")).toEqual({
      postcode: "AB1 0AA",
      year_terminated: 1996,
      month_terminated: 6,
    });
  });
});

/* ── AR-808: Islington geocoding — substring ambiguity + district-match ranking ──

   postcodes.io /places?q=Islington returns 4 results. The top-ranked one
   (by PLACE_TYPE_RANK) is Tilney cum Islington (Norfolk, Village rank 4)
   which beats Islington London (Other Settlement rank 8). This gives a
   Norfolk LSOA with £170k median and no OSM data — not what users expect.

   The fix: (A) boost results where district_borough matches the query,
   (B) widen ambiguity to catch substring name collisions. */
describe("AR-808: Islington geocoding (substring ambiguity + district-match ranking)", () => {
  /* Real postcodes.io /places?q=Islington response (2026-08-10). */
  const ISLINGTON_PLACES = [
    { name_1: "Islington", latitude: 53.781520862889465, longitude: -1.5645366664684401, local_type: "Suburban Area", district_borough: "Leeds", county_unitary: null, region: "Yorkshire and the Humber", country: "England" },
    { name_1: "Islington", latitude: 53.890779569853876, longitude: -1.2397048467295604, local_type: "Suburban Area", district_borough: null, county_unitary: "North Yorkshire", region: "Yorkshire and the Humber", country: "England" },
    { name_1: "Islington", latitude: 51.53754638138807, longitude: -0.10288225250548222, local_type: "Other Settlement", district_borough: "Islington", county_unitary: "Greater London", region: "London", country: "England" },
    { name_1: "Tilney cum Islington", latitude: 52.7002432625724, longitude: 0.328619814608834, local_type: "Village", district_borough: "King's Lynn and West Norfolk", county_unitary: "Norfolk", region: "Eastern", country: "England" },
  ];

  function reverseGeocode(lat: string) {
    const lats: Record<string, { postcode: string; admin_district: string; region: string; lsoa: string; codes: { lsoa: string; lsoa11: string; msoa: string } }> = {
      "53.78": { postcode: "LS11 0EE", admin_district: "Leeds", region: "Yorkshire and the Humber", lsoa: "Leeds 001A", codes: { lsoa: "E01011290", lsoa11: "", msoa: "" } },
      "53.89": { postcode: "LS24 9AA", admin_district: "Hambleton", region: "Yorkshire and the Humber", lsoa: "Hambleton 001A", codes: { lsoa: "E01027625", lsoa11: "", msoa: "" } },
      "51.54": { postcode: "N1 2XQ", admin_district: "Islington", region: "London", lsoa: "Islington 020B", codes: { lsoa: "E01002794", lsoa11: "E01002794", msoa: "E02000573" } },
      "52.70": { postcode: "PE34 3BJ", admin_district: "King's Lynn and West Norfolk", region: "Eastern", lsoa: "King's Lynn and West Norfolk 015B", codes: { lsoa: "E01026697", lsoa11: "", msoa: "" } },
    };
    // Match on prefix (51.537... starts with "51.53", but the mock key is "51.54")
    const key = Object.keys(lats).find((k) => lat?.startsWith(k.slice(0, 4))) ?? "51.54";
    return lats[key];
  }

  function mockIslington() {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({ status: 200, result: ISLINGTON_PLACES })
      ),
      http.get(REVERSE, ({ request }) => {
        const url = new URL(request.url);
        const lat = url.searchParams.get("lat") ?? "51.54";
        const g = reverseGeocode(lat);
        return HttpResponse.json({ result: [g] });
      }),
    );
  }

  /* TEST 1: geocodeAreaStrict("Islington") — currently returns ok with wrong result.
     After fix: should return ambiguous with 4 candidates. */
  it("returns ambiguous for 'Islington' (not silently picks Tilney cum Islington)", async () => {
    mockIslington();
    const r = await geocodeAreaStrict("Islington");
    // After fix: kind should be "ambiguous" (not "ok" with Norfolk)
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.candidates.length).toBe(4);
    }
  });

  /* TEST 2: London Islington present in the ambiguity candidate list. */
  it("includes London Islington in the ambiguity candidates", async () => {
    mockIslington();
    const r = await geocodeAreaStrict("Islington");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      const districts = r.candidates.map((c) => c.district);
      expect(districts).toContain("Islington");           // London
      expect(districts).toContain("Leeds");                // Yorkshire
      expect(districts).toContain("King's Lynn and West Norfolk"); // Norfolk
    }
  });

  /* TEST 3: geocodeArea (non-strict) — currently returns Norfolk result.
     After fix: should return null (district validation rejects mismatch) or London result (ranking fix). */
  it("does not return a Norfolk result for query 'Islington'", async () => {
    mockIslington();
    const r = await geocodeArea("Islington");
    if (r !== null) {
      // If it returns something, it should NOT be the Norfolk district
      expect(r.admin_district).not.toBe("King's Lynn and West Norfolk");
    }
  });

  /* TEST 4: Substring ambiguity — 'Tilney cum Islington' should be caught
     when querying 'Islington' (substring match). */
  it("catches Tilney cum Islington via substring match on 'Islington'", async () => {
    server.use(
      http.get(AUTOCOMPLETE, () => HttpResponse.json({ result: [] })),
      http.get(PLACES, () =>
        HttpResponse.json({
          status: 200,
          result: [
            // Only Tilney cum Islington + Islington London — no other Islingtons
            ISLINGTON_PLACES[3], // Tilney cum Islington (Village)
            ISLINGTON_PLACES[2], // Islington London (Other Settlement)
          ],
        })
      ),
      http.get(REVERSE, ({ request }) => {
        const url = new URL(request.url);
        const lat = url.searchParams.get("lat") ?? "51.54";
        const g = reverseGeocode(lat);
        return HttpResponse.json({ result: [g] });
      }),
    );
    const r = await geocodeAreaStrict("Islington");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.candidates.length).toBe(2);
    }
  });
});
