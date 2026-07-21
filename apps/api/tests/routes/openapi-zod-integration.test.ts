import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "@/app";

const app = await buildApp();
afterAll(async () => { await app.close(); });

describe("Plan 048 / AR-529 — Zod type provider integration", () => {
  it("bad body → 400 from the Zod provider (not 500 or 200)", async () => {
    // POST /v1/orgs expects CreateOrgRequestSchema { name, slug }
    const res = await app.inject({
      method: "POST",
      url: "/v1/orgs",
      headers: { authorization: "Bearer oga_live_testkey1234567890abcdef12345678" },
      payload: { name: 123 },  // missing slug, wrong type for name
    });
    expect(res.statusCode).toBe(400);
  });

  it("valid body passes provider validation", async () => {
    // POST /v1/orgs expects { name: string, slug: string }
    const res = await app.inject({
      method: "POST",
      url: "/v1/orgs",
      headers: { authorization: "Bearer oga_live_testkey1234567890abcdef12345678" },
      payload: { name: "Test Org", slug: "test-org" },
    });
    // May return 409 (slug exists) or 201 (success), but NOT 400
    expect(res.statusCode).not.toBe(400);
  });

  it("spec body for /v1/orgs matches the Zod schema shape", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();
    const postOp = spec.paths?.["/v1/orgs"]?.post;
    expect(postOp).toBeDefined();
    expect(postOp.requestBody?.content?.["application/json"]?.schema).toBeDefined();
    const bodySchema = postOp.requestBody.content["application/json"].schema;
    expect(bodySchema.properties?.name).toBeDefined();
    expect(bodySchema.properties?.slug).toBeDefined();
    expect(bodySchema.required).toContain("name");
    expect(bodySchema.properties?.slug).toBeDefined();
  });

  it("spec serves full schema with all route groups", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();
    const paths = Object.keys(spec.paths);
    // Sanity: expect at least 40 unique paths
    expect(paths.length).toBeGreaterThanOrEqual(40);
    // Check key route groups present
    expect(spec.paths["/v1/orgs"]).toBeDefined();
    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/v1/me"]).toBeDefined();
  });
});
