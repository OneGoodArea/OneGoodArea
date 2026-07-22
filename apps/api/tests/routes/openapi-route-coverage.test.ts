import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "@/app";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("OpenAPI route coverage (CI guard)", () => {
  it("serves a valid OpenAPI spec at /docs/json", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);

    const spec = res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info?.title).toBeTruthy();
    expect(spec.info?.version).toBeTruthy();
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
  });

  it("declares all three security schemes", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();
    const schemes = spec.components?.securitySchemes ?? {};

    expect(schemes.bearerAuth).toBeDefined();
    expect(schemes.bridgeToken).toBeDefined();
    expect(schemes.bearerToken).toBeDefined();
    expect(schemes.bearerToken.type).toBe("http");
    expect(schemes.bearerToken.scheme).toBe("bearer");
  });

  it("every spec path has tags and summary", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();
    const specPaths = Object.keys(spec.paths);

    expect(specPaths.length).toBeGreaterThan(0);

    const missingTags: string[] = [];
    const missingSummary: string[] = [];

    for (const pathKey of specPaths) {
      const pathObj = spec.paths[pathKey];
      if (!pathObj) continue;

      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const op = pathObj[method] as Record<string, unknown> | undefined;
        if (!op) continue;

        if (!Array.isArray(op.tags) || op.tags.length === 0) {
          missingTags.push(`${method.toUpperCase()} ${pathKey}`);
        }
        if (typeof op.summary !== "string" || op.summary.length === 0) {
          missingSummary.push(`${method.toUpperCase()} ${pathKey}`);
        }
      }
    }

    expect(
      missingTags,
      `Routes missing tags: ${missingTags.join(", ")}`,
    ).toEqual([]);
    expect(
      missingSummary,
      `Routes missing summary: ${missingSummary.join(", ")}`,
    ).toEqual([]);
  });

  it("every non-internal protected route declares security", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();
    const specPaths = Object.keys(spec.paths);

    const missingSecurity: string[] = [];

    for (const pathKey of specPaths) {
      const pathObj = spec.paths[pathKey];
      if (!pathObj) continue;

      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const op = pathObj[method] as Record<string, unknown> | undefined;
        if (!op) continue;

        // Skip internal and explicitly public routes
        if (op["x-internal"]) continue;
        if (Array.isArray(op.security) && op.security.length === 0) continue;

        // Public routes (no security) that are known to be intentionally open
        const knownPublic = ["/health", "/v1/meta", "/contact"];
        if (knownPublic.some((p) => pathKey.startsWith(p))) continue;

        const security = op.security as Array<Record<string, string[]>> | undefined;
        if (!security || security.length === 0) {
          missingSecurity.push(`${method.toUpperCase()} ${pathKey}`);
        }
      }
    }

    expect(
      missingSecurity,
      `Protected routes missing security declaration: ${missingSecurity.join(", ")}`,
    ).toEqual([]);
  });
});
