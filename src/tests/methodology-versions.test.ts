import { describe, it, expect } from "vitest";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  getCurrentMethodology,
  getMethodologyByVersion,
} from "../lib/methodology-versions";

describe("methodology-versions", () => {
  describe("METHODOLOGY_VERSIONS registry", () => {
    it("contains at least one version", () => {
      expect(METHODOLOGY_VERSIONS.length).toBeGreaterThan(0);
    });

    it("has versions in chronological order (oldest first, newest last)", () => {
      for (let i = 1; i < METHODOLOGY_VERSIONS.length; i++) {
        const prev = new Date(METHODOLOGY_VERSIONS[i - 1].released_at);
        const curr = new Date(METHODOLOGY_VERSIONS[i].released_at);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });

    it("every version has a valid semver-ish format (X.Y.Z)", () => {
      const semverRegex = /^\d+\.\d+\.\d+$/;
      for (const v of METHODOLOGY_VERSIONS) {
        expect(v.version).toMatch(semverRegex);
      }
    });

    it("every version has a non-empty summary", () => {
      for (const v of METHODOLOGY_VERSIONS) {
        expect(v.summary.length).toBeGreaterThan(0);
      }
    });

    it("every version has at least one change entry", () => {
      for (const v of METHODOLOGY_VERSIONS) {
        expect(v.changes.length).toBeGreaterThan(0);
      }
    });

    it("every version has a valid ISO date", () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      for (const v of METHODOLOGY_VERSIONS) {
        expect(v.released_at).toMatch(isoRegex);
        expect(new Date(v.released_at).toString()).not.toBe("Invalid Date");
      }
    });

    it("versions are unique (no duplicate version strings)", () => {
      const versions = METHODOLOGY_VERSIONS.map((v) => v.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });
  });

  describe("METHODOLOGY_VERSION constant", () => {
    it("matches the latest version in the registry", () => {
      const latest = METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1];
      expect(METHODOLOGY_VERSION).toBe(latest.version);
    });

    it("is a non-empty string", () => {
      expect(typeof METHODOLOGY_VERSION).toBe("string");
      expect(METHODOLOGY_VERSION.length).toBeGreaterThan(0);
    });
  });

  describe("getCurrentMethodology", () => {
    it("returns the latest version object", () => {
      const current = getCurrentMethodology();
      expect(current.version).toBe(METHODOLOGY_VERSION);
    });

    it("returned object has all required fields", () => {
      const current = getCurrentMethodology();
      expect(current).toHaveProperty("version");
      expect(current).toHaveProperty("released_at");
      expect(current).toHaveProperty("summary");
      expect(current).toHaveProperty("changes");
    });
  });

  describe("getMethodologyByVersion", () => {
    it("returns the matching version when it exists", () => {
      const first = METHODOLOGY_VERSIONS[0];
      const found = getMethodologyByVersion(first.version);
      expect(found).toBeDefined();
      expect(found?.version).toBe(first.version);
    });

    it("returns undefined for a non-existent version", () => {
      const found = getMethodologyByVersion("99.99.99");
      expect(found).toBeUndefined();
    });
  });
});
