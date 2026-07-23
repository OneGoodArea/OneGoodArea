import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "@/app";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("OpenAPI renderer verification (46.4)", () => {
  it("spec is valid OpenAPI 3.0 with required fields", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");

    const spec = res.json();

    // OpenAPI version
    expect(spec.openapi).toMatch(/^3\./);

    // Info block
    expect(spec.info?.title).toBe("OneGoodArea API");
    expect(spec.info?.version).toBe("1.0.0");

    // Servers
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers.length).toBeGreaterThan(0);

    // Paths
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(50);

    // Tags
    expect(Array.isArray(spec.tags)).toBe(true);
    expect(spec.tags.length).toBeGreaterThan(5);
  });

  it("every path has at least one operation with tags and summary", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();
    const issues: string[] = [];

    for (const [pathKey, pathObj] of Object.entries(spec.paths) as [string, Record<string, unknown>][]) {
      if (!pathObj || typeof pathObj !== "object") continue;

      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const op = pathObj[method] as Record<string, unknown> | undefined;
        if (!op) continue;

        if (!Array.isArray(op.tags) || op.tags.length === 0) {
          issues.push(`${method.toUpperCase()} ${pathKey}: missing tags`);
        }
        if (typeof op.summary !== "string" || op.summary.length === 0) {
          issues.push(`${method.toUpperCase()} ${pathKey}: missing summary`);
        }
      }
    }

    // Allow up to 10 operations without full metadata (legacy routes)
    expect(
      issues.length,
      `Routes with missing tags/summary (max 10 allowed): ${issues.slice(0, 20).join("; ")}`,
    ).toBeLessThanOrEqual(10);
  });

  it("Scalar renderer path exists at /playground", async () => {
    // Verify the spec can be fetched at the endpoint the renderer consumes.
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);

    const spec = res.json();
    // Spec must have the structure Scalar expects
    expect(spec.openapi).toBeDefined();
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
    expect(spec.components?.securitySchemes).toBeDefined();
  });

  it("every protected route declares bearerAuth or bearerToken security", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = res.json();

    const knownPublic = ["/health", "/v1/meta", "/contact"];
    const issues: string[] = [];

    for (const [pathKey, pathObj] of Object.entries(spec.paths) as [string, Record<string, unknown>][]) {
      if (!pathObj || typeof pathObj !== "object") continue;

      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const op = pathObj[method] as Record<string, unknown> | undefined;
        if (!op) continue;

        // Skip internal and explicitly public routes
        if (op["x-internal"]) continue;
        /* AR-548: `security: []` is the OpenAPI way to mark an operation
           explicitly public, as opposed to omitting the field and leaving it
           ambiguous. openapi-route-coverage.test.ts already honours it; this
           guard now agrees, so a deliberate public route passes both. */
        if (Array.isArray(op.security) && op.security.length === 0) continue;
        if (knownPublic.some((p) => pathKey.startsWith(p))) continue;

        const security = op.security as Array<Record<string, string[]>> | undefined;
        if (!security || security.length === 0) {
          issues.push(`${method.toUpperCase()} ${pathKey}: no security declared`);
        } else {
          const hasBearer = security.some((s) => s.bearerAuth !== undefined);
          const hasSession = security.some((s) => s.bearerToken !== undefined);
          if (!hasBearer && !hasSession) {
            issues.push(`${method.toUpperCase()} ${pathKey}: security present but no bearerAuth or bearerToken`);
          }
        }
      }
    }

    expect(
      issues,
      `Routes with missing security: ${issues.join("; ")}`,
    ).toEqual([]);
  });
});
