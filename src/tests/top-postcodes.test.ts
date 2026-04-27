import { describe, it, expect } from "vitest";
import { TOP_POSTCODES } from "../lib/top-postcodes";

describe("TOP_POSTCODES seed list", () => {
  it("contains entries", () => {
    expect(TOP_POSTCODES.length).toBeGreaterThan(0);
  });

  it("every entry is a string", () => {
    for (const p of TOP_POSTCODES) {
      expect(typeof p).toBe("string");
    }
  });

  it("every entry looks like a UK postcode (loose check)", () => {
    // UK postcode pattern: 1-2 letters + 1-2 digits + optional letter, then space + digit + 2 letters
    const ukPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}$/;
    for (const p of TOP_POSTCODES) {
      expect(p).toMatch(ukPostcode);
    }
  });

  it("entries are unique", () => {
    const set = new Set(TOP_POSTCODES);
    expect(set.size).toBe(TOP_POSTCODES.length);
  });

  it("includes major UK cities", () => {
    const districts = TOP_POSTCODES.map((p) => p.split(" ")[0].replace(/\d.*$/, ""));
    const expected = ["M", "B", "LS", "L", "S", "BS", "NE", "NG", "CF", "EH", "G", "AB"];
    for (const e of expected) {
      expect(districts).toContain(e);
    }
  });

  it("covers all four UK nations (England, Wales, Scotland, plus N. Ireland on roadmap)", () => {
    const firstChars = new Set(TOP_POSTCODES.map((p) => p[0]));
    // English postcodes start with most letters; Welsh: CF/SA/NP/LL; Scottish: EH/G/AB/DD/PH
    expect(firstChars.has("E") || firstChars.has("W") || firstChars.has("M")).toBe(true);
    // Welsh
    expect(TOP_POSTCODES.some((p) => p.startsWith("CF") || p.startsWith("SA") || p.startsWith("NP") || p.startsWith("LL"))).toBe(true);
    // Scottish
    expect(TOP_POSTCODES.some((p) => p.startsWith("EH") || p.startsWith("G") || p.startsWith("AB") || p.startsWith("DD") || p.startsWith("PH"))).toBe(true);
  });
});
