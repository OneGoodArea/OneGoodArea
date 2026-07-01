import { describe, it, expect } from "vitest";
import {
  findPlaygroundEndpoint,
  PLAYGROUND_ENDPOINTS,
} from "@/modules/playground/whitelist";

describe("findPlaygroundEndpoint", () => {
  it("matches /v1/area with a query string", () => {
    const e = findPlaygroundEndpoint("GET", "/v1/area?postcode=M1+1AE");
    expect(e?.label).toBe("GET /v1/area");
    expect(e?.isNl).toBe(false);
  });

  it("matches /v1/score exactly (no query string)", () => {
    const e = findPlaygroundEndpoint("POST", "/v1/score");
    expect(e?.label).toBe("POST /v1/score");
    expect(e?.isNl).toBe(false);
  });

  it("matches /v1/areas with a query string", () => {
    const e = findPlaygroundEndpoint("GET", "/v1/areas?signal=crime.total_12m&scope=regional");
    expect(e?.label).toBe("GET /v1/areas");
  });

  it("flags /v1/query as an NL call", () => {
    const e = findPlaygroundEndpoint("POST", "/v1/query");
    expect(e?.label).toContain("NL");
    expect(e?.isNl).toBe(true);
  });

  it("returns null for a destructive endpoint", () => {
    /* Portfolios and orgs writes are explicitly excluded — see plan/032. */
    expect(findPlaygroundEndpoint("POST", "/v1/portfolios")).toBeNull();
    expect(findPlaygroundEndpoint("POST", "/v1/orgs")).toBeNull();
    expect(findPlaygroundEndpoint("POST", "/v1/webhooks")).toBeNull();
  });

  it("returns null for auth + stripe paths", () => {
    expect(findPlaygroundEndpoint("POST", "/auth/register")).toBeNull();
    expect(findPlaygroundEndpoint("POST", "/stripe/checkout")).toBeNull();
  });

  it("returns null for anything under /me (session-only)", () => {
    expect(findPlaygroundEndpoint("GET", "/me/reports")).toBeNull();
    expect(findPlaygroundEndpoint("GET", "/v1/me")).toBeNull();
  });

  it("returns null for the wrong HTTP method", () => {
    /* /v1/area is GET only; POSTing to it isn't allowed even though the
       path pattern would match. */
    expect(findPlaygroundEndpoint("POST", "/v1/area?postcode=M1")).toBeNull();
    expect(findPlaygroundEndpoint("GET", "/v1/score")).toBeNull();
  });

  it("rejects a path-traversal-style rewrite (regex anchored)", () => {
    expect(findPlaygroundEndpoint("POST", "/v1/score/../orgs")).toBeNull();
    expect(findPlaygroundEndpoint("GET", "/v1/areasomething")).toBeNull();
  });

  it("covers the seven ICP endpoints from plan/032", () => {
    const labels = PLAYGROUND_ENDPOINTS.map((e) => e.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "GET /v1/area",
        "POST /v1/score",
        "POST /v1/peers",
        "GET /v1/areas",
        "POST /v1/insights",
        "POST /v1/forecast",
        "POST /v1/query (NL)",
      ]),
    );
    expect(labels).toHaveLength(7);
  });
});
