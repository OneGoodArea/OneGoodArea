import { describe, it, expect } from "vitest";
import { parseCsvLine, buildHeaderIndex, rowToGeo, NSPL_COLUMNS } from "./geo-spine";

describe("parseCsvLine", () => {
  it("splits a plain line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
  it("honors quoted fields, including commas inside quotes", () => {
    expect(parseCsvLine('"M1 1AE","","E01034129","North, West"')).toEqual(["M1 1AE", "", "E01034129", "North, West"]);
  });
  it("handles escaped double-quotes", () => {
    expect(parseCsvLine('"a""b",c')).toEqual(['a"b', "c"]);
  });
  it("preserves trailing empty field", () => {
    expect(parseCsvLine("a,b,")).toEqual(["a", "b", ""]);
  });
});

describe("buildHeaderIndex", () => {
  const header = ["pcd", "pcds", "oa21", "lsoa21", "msoa21", "laua", "rgn", "ctry", "lat", "long"];
  it("maps configured columns to their indices (case-insensitive)", () => {
    const idx = buildHeaderIndex(header, NSPL_COLUMNS);
    expect(idx.postcode).toBe(1);
    expect(idx.lsoa).toBe(3);
    expect(idx.lad).toBe(5);
    expect(idx.lng).toBe(9);
  });
  it("returns -1 for a missing column", () => {
    const idx = buildHeaderIndex(["pcds", "lsoa21"], NSPL_COLUMNS);
    expect(idx.msoa).toBe(-1);
  });
});

describe("rowToGeo", () => {
  const header = ["pcds", "oa21", "lsoa21", "msoa21", "laua", "rgn", "ctry", "lat", "long"];
  const idx = buildHeaderIndex(header, NSPL_COLUMNS);

  it("maps a record to a normalized geo_lookup row + an LSOA entity", () => {
    const row = rowToGeo(["m11ae", "", "E01034129", "E02006912", "E08000003", "North West", "England", "53.48", "-2.23"], idx)!;
    expect(row.lookup.postcode).toBe("M1 1AE"); // normalized (uppercase + single space)
    expect(row.lookup.lsoa_code).toBe("E01034129");
    expect(row.lookup.lad_code).toBe("E08000003");
    expect(row.lookup.latitude).toBe(53.48);
    expect(row.lookup.oa_code).toBeNull(); // empty -> null
    expect(row.lookup.boundary_version).toBe("2021");
    expect(row.entity).toMatchObject({ geo_type: "lsoa", geo_code: "E01034129", country: "England" });
  });

  it("skips a record with no postcode or no LSOA", () => {
    expect(rowToGeo(["", "", "E01000001", "", "", "", "", "", ""], idx)).toBeNull();
    expect(rowToGeo(["M1 1AE", "", "", "", "", "", "", "", ""], idx)).toBeNull();
  });
});
