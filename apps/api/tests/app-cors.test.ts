import { describe, it, expect, afterEach } from "vitest";
import { buildApp } from "@/app";

/* AR-602: apps/api had no CORS support at all, so every browser-based call
   (including Scalar's "Try it" in the playground) was silently blocked
   regardless of auth — confirmed live: no Access-Control-Allow-Origin
   header, OPTIONS preflight 404s. */

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe("CORS (AR-602)", () => {
  it("sets Access-Control-Allow-Origin for the production web app origin", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://www.onegoodarea.com" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("https://www.onegoodarea.com");
    await app.close();
  });

  it("sets it for the bare (non-www) domain too", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://onegoodarea.com" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("https://onegoodarea.com");
    await app.close();
  });

  it("answers an OPTIONS preflight instead of 404ing", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "https://www.onegoodarea.com",
        "access-control-request-method": "GET",
      },
    });
    expect(res.statusCode).not.toBe(404);
    expect(res.headers["access-control-allow-origin"]).toBe("https://www.onegoodarea.com");
    await app.close();
  });

  it("does not set the header for an unrecognized origin", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://evil.example.com" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });
});
