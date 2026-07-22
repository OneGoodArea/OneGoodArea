import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "@/app";

/* AR-546 regression guard.

   AR-501 added route schemas in two styles (Zod and plain JSON Schema) and
   AR-525 set a Zod-only validator compiler globally, which 500'd every JSON
   Schema route in production. The existing openapi-* tests did not catch it
   because they assert the spec is GENERATED, never that a request is
   VALIDATED. These tests fire real requests through the compiler.

   Both halves are asserted: neither style may 500, and each style must still
   reject invalid input, so a future "fix" that disables validation fails here. */

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("validator compiler dispatch (AR-546)", () => {
  describe("plain JSON Schema routes must not 500", () => {
    for (const [label, url] of [
      ["GET /v1/area", "/v1/area?postcode=LS6%203HN"],
      ["GET /v1/signals/deprivation", "/v1/signals/deprivation?area=LS6%203HN"],
      ["GET /v1/areas", "/v1/areas?signal=crime&country=England"],
    ] as const) {
      it(label, async () => {
        const res = await app.inject({ method: "GET", url });
        expect(res.statusCode).not.toBe(500);
      });
    }

    it("POST /v1/score", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/score",
        payload: { area: "LS6 3HN", preset: "investing" },
      });
      expect(res.statusCode).not.toBe(500);
    });
  });

  describe("Zod routes must not 500", () => {
    it("GET /me/activity", async () => {
      const res = await app.inject({ method: "GET", url: "/me/activity?page=1&page_size=20" });
      expect(res.statusCode).not.toBe(500);
    });
  });

  /* Validation must still REJECT bad input, not merely stop crashing.
     AR-548 puts the credential guard ahead of validation, so these send a
     bearer token to get past it. The token is never verified before
     validation runs, so a malformed request is still a 400. */
  describe("validation is still enforced", () => {
    const AUTH = { authorization: "Bearer test-token-not-verified-before-validation" };

    it("AJV path: POST /v1/portfolios/:id/areas rejects a body missing the required areas", async () => {
      const res = await app.inject({ method: "POST", url: "/v1/portfolios/pf_1/areas", payload: {}, headers: AUTH });
      expect(res.statusCode).toBe(400);
    });

    it("Zod path: POST /me/webhooks rejects a body missing url and events", async () => {
      const res = await app.inject({ method: "POST", url: "/me/webhooks", payload: {}, headers: AUTH });
      expect(res.statusCode).toBe(400);
    });
  });

  /* AR-548: the guard itself. An anonymous caller must get 401, never a 400
     describing the body it failed to send. */
  describe("credential guard runs before validation (AR-548)", () => {
    it("401s an anonymous POST /v1/portfolios with an invalid body", async () => {
      const res = await app.inject({ method: "POST", url: "/v1/portfolios", payload: {} });
      expect(res.statusCode).toBe(401);
    });

    it("leaves public routes reachable without a credential", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
    });
  });
});
