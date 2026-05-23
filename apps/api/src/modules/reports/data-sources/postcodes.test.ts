import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw-server";
import { geocodeArea } from "./postcodes";

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
          status: 200,
          result: [
            { name: "Manchester Hamlet", latitude: 1, longitude: 1, county: "", district: "X", region: "Y", country: "England", local_type: "Hamlet" },
            { name: "Manchester", latitude: 53.48, longitude: -2.24, county: "", district: "Manchester", region: "North West", country: "England", local_type: "City" },
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
