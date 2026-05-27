import { describe, it, expect } from "vitest";
import { resolveEngineVersion, getSupportedEngineVersions } from "./engine-version";
import { METHODOLOGY_VERSION } from "./methodology";

describe("resolveEngineVersion", () => {
  describe("absent / empty header", () => {
    it("routes to METHODOLOGY_VERSION when header is null", () => {
      const r = resolveEngineVersion(null);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.requestedVersion).toBe(METHODOLOGY_VERSION);
        expect(r.resolvedVersion).toBe(METHODOLOGY_VERSION);
      }
    });

    it("routes to METHODOLOGY_VERSION when header is undefined", () => {
      const r = resolveEngineVersion(undefined);
      expect(r.ok).toBe(true);
    });

    it("routes to METHODOLOGY_VERSION when header is empty string", () => {
      const r = resolveEngineVersion("");
      expect(r.ok).toBe(true);
    });

    it("routes to METHODOLOGY_VERSION when header is whitespace", () => {
      const r = resolveEngineVersion("   ");
      expect(r.ok).toBe(true);
    });
  });

  describe("valid v2.x versions (supported window)", () => {
    it.each(["2.0.0", "2.0.1", "2.0.2"])(
      "accepts %s, resolves to current engine",
      (version) => {
        const r = resolveEngineVersion(version);
        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(r.requestedVersion).toBe(version);
          expect(r.resolvedVersion).toBe(METHODOLOGY_VERSION);
        }
      },
    );

    it("trims whitespace around the version value", () => {
      const r = resolveEngineVersion("  2.0.2  ");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.requestedVersion).toBe("2.0.2");
    });
  });

  describe("EOL versions (known but outside supported window)", () => {
    it.each(["1.0.0", "1.1.0", "1.2.0"])(
      "rejects %s with engine_version_unsupported",
      (version) => {
        const r = resolveEngineVersion(version);
        expect(r.ok).toBe(false);
        if (!r.ok) {
          expect(r.statusCode).toBe(400);
          expect(r.code).toBe("engine_version_unsupported");
          expect(r.error).toContain("end-of-life");
          expect(r.supportedVersions).toContain("2.0.2");
        }
      },
    );
  });

  describe("unknown versions (not in the registry at all)", () => {
    it("rejects an unknown semver string with engine_version_unknown", () => {
      const r = resolveEngineVersion("9.9.9");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.statusCode).toBe(400);
        expect(r.code).toBe("engine_version_unknown");
        expect(r.error).toContain("Unknown engine version");
      }
    });

    it("rejects a garbage string", () => {
      const r = resolveEngineVersion("not-a-version");
      expect(r.ok).toBe(false);
    });

    it("rejects a leading-v prefix (strict matching, no normalisation)", () => {
      const r = resolveEngineVersion("v2.0.2");
      expect(r.ok).toBe(false);
    });

    it("rejects non-string inputs", () => {
      const r = resolveEngineVersion(123 as unknown);
      expect(r.ok).toBe(false);
    });
  });

  it("getSupportedEngineVersions returns the supported window", () => {
    const supported = getSupportedEngineVersions();
    expect(supported).toContain("2.0.0");
    expect(supported).toContain("2.0.1");
    expect(supported).toContain("2.0.2");
    // METHODOLOGY_VERSION should always be in the supported window
    expect(supported).toContain(METHODOLOGY_VERSION);
  });
});
