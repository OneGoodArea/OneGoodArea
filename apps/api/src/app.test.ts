import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "./app";
import { INTENTS } from "@onegoodarea/contracts";

const app = buildApp();
afterAll(() => app.close());

describe("apps/api scaffold", () => {
  it("GET /health returns 200 ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /v1/meta exposes contracts intents (proves workspace wiring)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/meta" });
    expect(res.statusCode).toBe(200);
    expect(res.json().intents).toEqual(INTENTS);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
  });
});
