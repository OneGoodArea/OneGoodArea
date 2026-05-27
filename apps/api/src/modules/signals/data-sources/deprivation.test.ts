import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw-server";
import { getDeprivationData, formatDeprivationForPrompt } from "./deprivation";
import type { DeprivationData } from "../inputs";

/* MSW intercepts the three ArcGIS endpoints. Locks the country routing
   (E->England, W->Wales, S->Scotland, N->null), the no-features and
   missing-rank guards, and the pure prompt formatter. */

const ENGLAND = "https://services-eu1.arcgis.com/EbKcOS6EXZroSyoi/arcgis/rest/services/LSOA_IMD2025_WGS84/FeatureServer/0/query";
const WALES = "https://services9.arcgis.com/3DS2hBWXSllJ5p3H/arcgis/rest/services/Welsh_Index_of_Multiple_Deprivation_WIMD_2019_Overall/FeatureServer/0/query";
const SCOTLAND = "https://services.arcgis.com/XSeYKQzfXnEgju9o/arcgis/rest/services/SG_SIMD_2020/FeatureServer/0/query";

describe("getDeprivationData routing", () => {
  it("reads England IMD 2025 for E-codes", async () => {
    server.use(
      http.get(ENGLAND, () =>
        HttpResponse.json({
          features: [{ attributes: { LSOA21CD: "E01033677", LSOA21NM: "Manchester 054", IMDRank: 12000, IMDDecil: 4 } }],
        })
      )
    );
    const r = await getDeprivationData("E01033677");
    expect(r).toEqual<DeprivationData>({
      lsoa_code: "E01033677",
      lsoa_name: "Manchester 054",
      local_authority: "",
      imd_rank: 12000,
      imd_decile: 4,
    });
  });

  it("reads Wales WIMD 2019 for W-codes (using lsoa11)", async () => {
    server.use(
      http.get(WALES, () =>
        HttpResponse.json({
          features: [{ attributes: { lsoa_code: "W01000123", lsoa_name0: "Cardiff 001", rank: 500, decile: 3 } }],
        })
      )
    );
    const r = await getDeprivationData("W01000123", "W01000123");
    expect(r!.imd_rank).toBe(500);
    expect(r!.lsoa_name).toBe("Cardiff 001");
    expect(r!.imd_decile).toBe(3);
  });

  it("reads Scotland SIMD 2020 for S-codes", async () => {
    server.use(
      http.get(SCOTLAND, () =>
        HttpResponse.json({
          features: [{ attributes: { DataZone: "S01006506", DZName: "Edinburgh 01", LAName: "City of Edinburgh", Rankv2: 4000, Decilev2: 6 } }],
        })
      )
    );
    const r = await getDeprivationData("S01006506");
    expect(r!.local_authority).toBe("City of Edinburgh");
    expect(r!.imd_rank).toBe(4000);
  });

  it("returns null for Northern Ireland (N-codes) without any request", async () => {
    expect(await getDeprivationData("N01000001")).toBeNull();
  });

  it("returns null when ArcGIS has no features", async () => {
    server.use(http.get(ENGLAND, () => HttpResponse.json({ features: [] })));
    expect(await getDeprivationData("E01033677")).toBeNull();
  });

  it("returns null when the rank is missing", async () => {
    server.use(
      http.get(ENGLAND, () =>
        HttpResponse.json({ features: [{ attributes: { LSOA21CD: "E01033677" } }] })
      )
    );
    expect(await getDeprivationData("E01033677")).toBeNull();
  });
});

describe("formatDeprivationForPrompt", () => {
  it("renders source, decile band and percentile for England", () => {
    const data: DeprivationData = {
      lsoa_code: "E01033677",
      lsoa_name: "Manchester 054",
      local_authority: "",
      imd_rank: 16877,
      imd_decile: 5,
    };
    const out = formatDeprivationForPrompt(data);
    expect(out).toContain("MHCLG Index of Multiple Deprivation 2025");
    expect(out).toContain("moderate deprivation");
    expect(out).toContain("England");
  });
});
