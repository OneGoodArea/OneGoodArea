import { describe, it, expect } from "vitest";
import { resolveEngineVersion, getSupportedEngineVersions } from "@/modules/reports/engine-version";
import { METHODOLOGY_VERSION } from "@/modules/reports/methodology";

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

  /* Levers (AR-197): per-org methodology pin precedence. */
  describe("orgPin option (Levers AR-197)", () => {
    it("uses the orgPin as the requestedVersion when no header is sent", () => {
      const r = resolveEngineVersion(null, { orgPin: "2.0.1" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.requestedVersion).toBe("2.0.1");
        expect(r.resolvedVersion).toBe(METHODOLOGY_VERSION);
      }
    });

    it("uses the orgPin when header is undefined", () => {
      const r = resolveEngineVersion(undefined, { orgPin: "2.0.0" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.requestedVersion).toBe("2.0.0");
    });

    it("uses the orgPin when header is an empty string", () => {
      const r = resolveEngineVersion("", { orgPin: "2.0.1" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.requestedVersion).toBe("2.0.1");
    });

    it("explicit valid header BEATS orgPin (per-request always wins)", () => {
      const r = resolveEngineVersion("2.0.0", { orgPin: "2.0.1" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.requestedVersion).toBe("2.0.0");
    });

    it("falls through to METHODOLOGY_VERSION when orgPin is null", () => {
      const r = resolveEngineVersion(null, { orgPin: null });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.requestedVersion).toBe(METHODOLOGY_VERSION);
    });

    it("falls through to METHODOLOGY_VERSION when orgPin is no longer in the supported window (defense in depth)", () => {
      // If the supported window shrinks AFTER an org pinned a version
      // that's now EOL, the read path silently falls back to latest
      // rather than 500ing every request. The pin row stays in the DB
      // for audit; a future commit can surface a deprecation event.
      const r = resolveEngineVersion(null, { orgPin: "1.0.0" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.requestedVersion).toBe(METHODOLOGY_VERSION);
    });

    it("an EXPLICIT header still 400s on EOL even when orgPin is valid", () => {
      // Header path validation is unchanged — we don't let a valid pin
      // mask a bad header.
      const r = resolveEngineVersion("1.0.0", { orgPin: "2.0.1" });
      expect(r.ok).toBe(false);
    });
  });
});
