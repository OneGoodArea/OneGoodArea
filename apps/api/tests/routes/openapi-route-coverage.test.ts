import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "@/app";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("OpenAPI route coverage (CI guard)", () => {
  it("serves a valid OpenAPI spec at /openapi.json", async () => {
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(res.statusCode).toBe(200);

    const spec = res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info?.title).toBeTruthy();
    expect(spec.info?.version).toBeTruthy();
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
  });

  it("declares all three security schemes", async () => {
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
    const spec = res.json();
    const schemes = spec.components?.securitySchemes ?? {};

    expect(schemes.bearerAuth).toBeDefined();
    expect(schemes.bridgeToken).toBeDefined();
    expect(schemes.sessionCookie).toBeDefined();
    expect(schemes.sessionCookie.type).toBe("apiKey");
    expect(schemes.sessionCookie.in).toBe("cookie");
    expect(schemes.sessionCookie.name).toBe("session");
  });

  it("every registered route appears in spec.paths", async () => {
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
    const spec = res.json();
    const specPaths = Object.keys(spec.paths);

    // Fastify 5 exposes printRoutes() — parse it to get registered paths.
    const routeTree = app.printRoutes();
    // Each line in the tree looks like:
    //   ├── GET    /health
    //   ├── GET    /v1/meta
    //   └── GET    /cron/rescore (1)
    const registeredPaths = new Set<string>();
    for (const line of routeTree.split("\n")) {
      const match = line.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S+)/);
      if (match) {
        // Strip trailing route params like "(1)" that Fastify appends
        const raw = match[2].replace(/\s*\(\d+\)\s*$/, "");
        registeredPaths.add(raw);
      }
    }

    expect(registeredPaths.size).toBeGreaterThan(0);

    // Filter out internal-only routes that may not appear as distinct spec
    // paths (e.g. the swagger UI at /docs).
    const skipPaths = new Set(["/docs", "/docs/json"]);

    const missing: string[] = [];
    for (const routePath of registeredPaths) {
      if (skipPaths.has(routePath)) continue;
      // Normalize: Fastify may show /v1/score/:id while spec has /v1/score/{id}
      const normalized = routePath.replace(/:([a-zA-Z]+)/g, "{$1}");
      if (!specPaths.some((sp) => sp === normalized || sp.startsWith(normalized.split("{")[0]))) {
        missing.push(routePath);
      }
    }

    expect(
      missing,
      `Routes missing from OpenAPI spec: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every non-internal protected route declares security", async () => {
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
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
