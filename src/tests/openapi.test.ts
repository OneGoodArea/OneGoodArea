import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { METHODOLOGY_VERSION } from "../lib/methodology-versions";

/* OpenAPI spec sanity checks. The spec lives at public/openapi.json and
   is served as-is at https://www.area-iq.co.uk/openapi.json. These tests
   keep it from drifting away from the actual API contract — when fields
   are added to the engine response, the spec must be updated to match. */

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
    // The spec version represents the engine methodology shipped at the time.
    expect(spec.info.version).toBe(METHODOLOGY_VERSION);
  });

  it("declares the production server", () => {
    const urls = (spec.servers ?? []).map((s: { url: string }) => s.url);
    expect(urls).toContain("https://www.area-iq.co.uk");
  });

  it("documents POST /api/v1/report", () => {
    expect(spec.paths?.["/api/v1/report"]?.post).toBeDefined();
  });

  it("documents GET /api/widget", () => {
    expect(spec.paths?.["/api/widget"]?.get).toBeDefined();
  });

  it("declares Bearer auth", () => {
    expect(spec.components?.securitySchemes?.BearerAuth?.scheme).toBe("bearer");
  });

  it("Intent enum includes all four scoring products", () => {
    const intents = spec.components?.schemas?.Intent?.enum;
    expect(intents).toContain("moving");
    expect(intents).toContain("business");
    expect(intents).toContain("investing");
    expect(intents).toContain("research");
  });

  it("AreaReport schema documents confidence + engine_version", () => {
    const props = spec.components?.schemas?.AreaReport?.properties;
    expect(props?.confidence).toBeDefined();
    expect(props?.engine_version).toBeDefined();
  });

  it("SubScore schema documents per-dimension confidence + reason", () => {
    const props = spec.components?.schemas?.SubScore?.properties;
    expect(props?.confidence).toBeDefined();
    expect(props?.confidence_reason).toBeDefined();
  });

  it("AreaReport sub_scores array is exactly 5 items", () => {
    const subScores = spec.components?.schemas?.AreaReport?.properties?.sub_scores;
    expect(subScores?.minItems).toBe(5);
    expect(subScores?.maxItems).toBe(5);
  });

  it("documents 401, 403, 429 responses on /api/v1/report", () => {
    const responses = spec.paths?.["/api/v1/report"]?.post?.responses;
    expect(responses?.["401"]).toBeDefined();
    expect(responses?.["403"]).toBeDefined();
    expect(responses?.["429"]).toBeDefined();
  });
});
