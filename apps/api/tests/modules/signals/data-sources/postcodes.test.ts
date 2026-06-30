import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { geocodeArea, geocodeAreaStrict } from "@/modules/signals/data-sources/postcodes";

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
