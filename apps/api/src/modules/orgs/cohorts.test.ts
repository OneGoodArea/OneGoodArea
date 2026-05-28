/* Levers (AR-198): unit tests for the cohorts module's pure helpers
   + a pin test on the peers SQL builder that the cohort filter is
   actually applied. The CRUD I/O paths are exercised by the standard
   "lands on prod, smoke tested" path documented in ADR 0032. */

import { describe, it, expect } from "vitest";
import { dedupeGeoCodes } from "./cohorts";
import { buildPeersSql } from "../signals/peers";

describe("cohorts/dedupeGeoCodes", () => {
  it("preserves insertion order on first occurrence", () => {
    expect(dedupeGeoCodes(["E01000001", "E01000002", "E01000001", "E01000003"])).toEqual([
      "E01000001",
      "E01000002",
      "E01000003",
    ]);
  });

  it("trims whitespace from each entry", () => {
    expect(dedupeGeoCodes([" E01000001 ", "E01000002\t"])).toEqual(["E01000001", "E01000002"]);
  });

  it("drops empty-after-trim entries (defensive against ' ' in the array)", () => {
    expect(dedupeGeoCodes(["E01000001", "   ", "E01000002"])).toEqual(["E01000001", "E01000002"]);
  });

  it("handles empty input", () => {
    expect(dedupeGeoCodes([])).toEqual([]);
  });
});

describe("buildPeersSql — cohort filter (AR-198)", () => {
  it("no cohortGeoCodes -> SQL does NOT mention the cohort filter param", () => {
    const { text, params } = buildPeersSql({
      targetGeoCode: "E01000001",
      k: 20,
      minSignals: 3,
    });
    // Default params (4): targetGeoCode, signals (null), minSignals, k.
    expect(params).toHaveLength(4);
    expect(text).not.toContain("= ANY($5::text[])");
  });

  it("cohortGeoCodes set -> SQL adds the ANY filter AND the array param", () => {
    const cohort = ["E01000010", "E01000011", "E01000012"];
    const { text, params } = buildPeersSql({
      targetGeoCode: "E01000001",
      cohortGeoCodes: cohort,
      k: 20,
      minSignals: 3,
    });
    // 4 default + 1 cohort = 5.
    expect(params).toHaveLength(5);
    expect(params[4]).toEqual(cohort);
    expect(text).toContain("sv.geo_code = ANY($5::text[])");
  });

  it("cohort + country + lad stack together (all three WHERE clauses present)", () => {
    const cohort = ["E01000010"];
    const { text } = buildPeersSql({
      targetGeoCode: "E01000001",
      country: "England",
      lad: "E08000003",
      cohortGeoCodes: cohort,
      k: 20,
      minSignals: 3,
    });
    expect(text).toContain("sv.geo_code LIKE");      // country prefix
    expect(text).toContain("FROM geo_lookup WHERE"); // lad join
    expect(text).toContain("= ANY(");                // cohort filter
  });
});
