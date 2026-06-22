import { METHODOLOGY_VERSION, METHODOLOGY_VERSIONS } from "../engine/methodology";

/* AR-131: engine version pinning via X-Engine-Version request header.

   Regulated buyers (mortgage lenders, insurers, banks) need to pin requests
   to a known methodology version for their model risk register. Without
   pinning, every deploy is implicitly a model change from their compliance
   team's perspective.

   ## Today's contract

   The v2.x series ("2.0.0", "2.0.1", "2.0.2") is score-equivalent — patch
   versions in this range changed only the confidence rubric and data-source
   reliability, NOT scoring math. So any v2.x request resolves to the current
   engine and produces byte-identical SCORE values. Confidence metadata may
   refine between patches.

   1.x.x versions are reconstructed-from-history snapshots in
   `methodology-versions.ts`; we never shipped frozen scoring modules for
   them, so they are EOL.

   When v3.0.0 ships (a MAJOR bump that actually changes scoring math), the
   pattern becomes: freeze the v2 engine module, route v2.x requests there,
   route v3.x requests to the new module. The header-routing scaffolding in
   this file is the seam that enables that split. Until then, all valid v2.x
   pins resolve to the latest patch of v2.

   ## API shape

   - No header           → routes to METHODOLOGY_VERSION (no breaking change)
   - Valid v2.x version  → routes to METHODOLOGY_VERSION; X-Engine-Version
                           response header echoes the *requested* version
   - Unknown / EOL       → 400 with a payload listing supported_versions

   ## Levers AR-197 — org-level methodology pin

   `resolveEngineVersion(header, { orgPin })`. Precedence:
     1. Explicit valid header → wins (validated as before)
     2. orgPin (if set, and validated at WRITE time so trusted here)
        → applies when no header is sent
     3. METHODOLOGY_VERSION (latest) → default

   The orgPin is fetched once per request by the endpoint and passed
   in; the resolver stays pure (no DB I/O). See ADR 0031. */

const SUPPORTED_ENGINE_VERSIONS = ["2.0.0", "2.0.1", "2.0.2"] as const;
export type SupportedEngineVersion = (typeof SUPPORTED_ENGINE_VERSIONS)[number];

export function getSupportedEngineVersions(): readonly string[] {
  return SUPPORTED_ENGINE_VERSIONS;
}

export interface EngineVersionOk {
  ok: true;
  /** Version the caller asked for. Equal to resolvedVersion when no header sent. */
  requestedVersion: string;
  /** Version the engine actually runs. Today always METHODOLOGY_VERSION. */
  resolvedVersion: string;
}

export interface EngineVersionError {
  ok: false;
  statusCode: 400;
  error: string;
  code: "engine_version_unsupported" | "engine_version_unknown";
  supportedVersions: string[];
}

export type EngineVersionResult = EngineVersionOk | EngineVersionError;

function isKnownButEol(version: string): boolean {
  // Known to the methodology registry but not in the supported window.
  return METHODOLOGY_VERSIONS.some((m) => m.version === version);
}

export interface ResolveEngineVersionOptions {
  /** Levers AR-197: the org's pinned engine_version, if any. Used when
      no per-request header was sent. Trusted (validated at write time
      by the PUT /v1/orgs/:id/methodology endpoint). */
  orgPin?: string | null;
}

/** PURE: turn an org pin into a resolved result with no per-request
    header. Returns null if no pin set or pin isn't (still) supported
    (defense in depth — the pin should always be valid post-write-time
    validation, but a removed-from-supported-window version surfaces as
    "no pin" so callers fall back to the latest cleanly). */
function resolveFromOrgPin(orgPin: string | null | undefined): EngineVersionOk | null {
  if (!orgPin) return null;
  if (!(SUPPORTED_ENGINE_VERSIONS as readonly string[]).includes(orgPin)) return null;
  return {
    ok: true,
    requestedVersion: orgPin,
    resolvedVersion: METHODOLOGY_VERSION,
  };
}

export function resolveEngineVersion(
  headerValue: unknown,
  opts: ResolveEngineVersionOptions = {},
): EngineVersionResult {
  // Treat missing / empty as "no preference" → org pin if set, else latest.
  if (headerValue === null || headerValue === undefined) {
    const fromPin = resolveFromOrgPin(opts.orgPin);
    if (fromPin) return fromPin;
    return {
      ok: true,
      requestedVersion: METHODOLOGY_VERSION,
      resolvedVersion: METHODOLOGY_VERSION,
    };
  }

  if (typeof headerValue !== "string") {
    return {
      ok: false,
      statusCode: 400,
      code: "engine_version_unknown",
      error: `X-Engine-Version must be a string. Supported: ${SUPPORTED_ENGINE_VERSIONS.join(", ")}.`,
      supportedVersions: [...SUPPORTED_ENGINE_VERSIONS],
    };
  }

  const trimmed = headerValue.trim();
  if (trimmed === "") {
    const fromPin = resolveFromOrgPin(opts.orgPin);
    if (fromPin) return fromPin;
    return {
      ok: true,
      requestedVersion: METHODOLOGY_VERSION,
      resolvedVersion: METHODOLOGY_VERSION,
    };
  }

  if (!(SUPPORTED_ENGINE_VERSIONS as readonly string[]).includes(trimmed)) {
    const eol = isKnownButEol(trimmed);
    return {
      ok: false,
      statusCode: 400,
      code: eol ? "engine_version_unsupported" : "engine_version_unknown",
      error: eol
        ? `Engine version ${trimmed} is end-of-life. Supported versions: ${SUPPORTED_ENGINE_VERSIONS.join(", ")}.`
        : `Unknown engine version: ${trimmed}. Supported versions: ${SUPPORTED_ENGINE_VERSIONS.join(", ")}.`,
      supportedVersions: [...SUPPORTED_ENGINE_VERSIONS],
    };
  }

  // All v2.x versions in the supported window route to the current engine —
  // they are score-equivalent. The response header echoes what the caller
  // asked for; the body's `engine_version` field stamps what actually ran.
  return {
    ok: true,
    requestedVersion: trimmed,
    resolvedVersion: METHODOLOGY_VERSION,
  };
}
