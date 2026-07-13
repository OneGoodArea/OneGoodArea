import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";

/* OpenAPI spec sanity checks. The spec lives at public/openapi.json and
   is served as-is at /openapi.json. These tests keep it from drifting away
   from the actual API contract: the four products, the engine-version
   stamp, and the removed reports API. */

const specPath = path.join(process.cwd(), "public", "openapi.json");
const raw = fs.readFileSync(specPath, "utf-8");
const spec = JSON.parse(raw);

describe("OpenAPI 3.0 spec at public/openapi.json", () => {
  it("is valid JSON", () => {
    expect(spec).toBeDefined();
  });

  it("declares OpenAPI 3.0.x", () => {
    expect(spec.openapi).toMatch(/^3\.0\./);
  });

  it("has info.title, info.version, and info.description", () => {
    expect(spec.info?.title).toBe("OneGoodArea API");
    expect(spec.info?.version).toBe(METHODOLOGY_VERSION);
    expect(spec.info?.description?.length).toBeGreaterThan(0);
  });

  it("info.version stays in sync with METHODOLOGY_VERSION", () => {
    expect(spec.info.version).toBe(METHODOLOGY_VERSION);
  });

  it("declares the production API server", () => {
    const urls = (spec.servers ?? []).map((s: { url: string }) => s.url);
    expect(urls).toContain("https://onegoodarea.onrender.com");
  });

  it("documents the four products", () => {
    expect(spec.paths?.["/v1/area"]?.get).toBeDefined();
    expect(spec.paths?.["/v1/score"]?.post).toBeDefined();
    expect(spec.paths?.["/v1/portfolios"]?.post).toBeDefined();
    expect(spec.paths?.["/v1/query"]?.post).toBeDefined();
  });

  it("no longer documents the removed reports API", () => {
    expect(spec.paths?.["/api/v1/report"]).toBeUndefined();
    expect(spec.paths?.["/api/v1/batch"]).toBeUndefined();
  });

  it("declares Bearer auth", () => {
    expect(spec.components?.securitySchemes?.BearerAuth?.scheme).toBe("bearer");
  });

  it("Preset enum includes all four presets", () => {
    const presets = spec.components?.schemas?.Preset?.enum;
    expect(presets).toContain("moving");
    expect(presets).toContain("business");
    expect(presets).toContain("investing");
    expect(presets).toContain("research");
  });

  it("SignalCategory enum has the seven categories", () => {
    const cats = spec.components?.schemas?.SignalCategory?.enum;
    expect(cats).toHaveLength(7);
    expect(cats).toContain("crime");
    expect(cats).toContain("environment");
  });

  it("ScoreResult schema documents confidence + engine_version", () => {
    const props = spec.components?.schemas?.ScoreResult?.properties;
    expect(props?.confidence).toBeDefined();
    expect(props?.engine_version).toBeDefined();
  });

  it("ScoreResult dimensions array is exactly 5 items", () => {
    const dims = spec.components?.schemas?.ScoreResult?.properties?.dimensions;
    expect(dims?.minItems).toBe(5);
    expect(dims?.maxItems).toBe(5);
  });

  it("Dimension schema documents per-dimension confidence + reason", () => {
    const props = spec.components?.schemas?.Dimension?.properties;
    expect(props?.confidence).toBeDefined();
    expect(props?.confidence_reason).toBeDefined();
  });

  it("documents 401, 403, 429 responses on POST /v1/score", () => {
    const responses = spec.paths?.["/v1/score"]?.post?.responses;
    expect(responses?.["401"]).toBeDefined();
    expect(responses?.["403"]).toBeDefined();
    expect(responses?.["429"]).toBeDefined();
  });
});
