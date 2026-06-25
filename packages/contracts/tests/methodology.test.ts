import { describe, it, expect } from "vitest";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  getCurrentMethodology,
  getMethodologyByVersion,
  MethodologyPinSchema,
  SetMethodologyPinRequestSchema,
} from "../src/methodology";

describe("@onegoodarea/contracts — methodology version registry", () => {
  it("exposes at least one version entry", () => {
    expect(METHODOLOGY_VERSIONS.length).toBeGreaterThan(0);
  });

  it("METHODOLOGY_VERSION equals the last entry's version", () => {
    const last = METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1];
    expect(last).toBeDefined();
    expect(METHODOLOGY_VERSION).toBe(last!.version);
  });

  it("getCurrentMethodology returns the last entry", () => {
    const current = getCurrentMethodology();
    const last = METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1];
    expect(current).toBe(last);
    expect(current.version).toBe(METHODOLOGY_VERSION);
  });

  it("getMethodologyByVersion finds known versions and returns undefined for unknowns", () => {
    expect(getMethodologyByVersion(METHODOLOGY_VERSION)).toBeDefined();
    expect(getMethodologyByVersion("0.0.0-not-real")).toBeUndefined();
  });

  it("every entry has a non-empty version + released_at + summary", () => {
    for (const v of METHODOLOGY_VERSIONS) {
      expect(v.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(v.released_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(v.changes)).toBe(true);
    }
  });

  it("versions appear in strictly ascending order (newest last)", () => {
    const compare = (a: string, b: string) => {
      const [aMaj, aMin, aPat] = a.split(".").map(Number);
      const [bMaj, bMin, bPat] = b.split(".").map(Number);
      if (aMaj !== bMaj) return (aMaj ?? 0) - (bMaj ?? 0);
      if (aMin !== bMin) return (aMin ?? 0) - (bMin ?? 0);
      return (aPat ?? 0) - (bPat ?? 0);
    };
    for (let i = 1; i < METHODOLOGY_VERSIONS.length; i++) {
      const prev = METHODOLOGY_VERSIONS[i - 1]!.version;
      const curr = METHODOLOGY_VERSIONS[i]!.version;
      expect(compare(curr, prev)).toBeGreaterThan(0);
    }
  });
});

describe("@onegoodarea/contracts — methodology pin schemas", () => {
  it("MethodologyPinSchema accepts both pinned + unpinned shapes", () => {
    expect(MethodologyPinSchema.parse({ engine_version: "2.0.2", pinned: true })).toEqual({
      engine_version: "2.0.2",
      pinned: true,
    });
    expect(MethodologyPinSchema.parse({ engine_version: null, pinned: false })).toEqual({
      engine_version: null,
      pinned: false,
    });
  });

  it("SetMethodologyPinRequestSchema requires a non-empty engine_version", () => {
    expect(() => SetMethodologyPinRequestSchema.parse({ engine_version: "" })).toThrow();
    expect(SetMethodologyPinRequestSchema.parse({ engine_version: "2.0.2" })).toEqual({
      engine_version: "2.0.2",
    });
  });
});
