import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn(), query: vi.fn() }));
vi.mock("@/modules/monitor", () => ({
  createPortfolio: vi.fn(), listPortfolios: vi.fn(), getPortfolio: vi.fn(),
  deletePortfolio: vi.fn(), addAreas: vi.fn(), enrichPortfolio: vi.fn(),
  PORTFOLIO_ADD_MAX: 200, PORTFOLIO_ENRICH_MAX: 50,
}));

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess } from "@/modules/usage";
import * as monitor from "@/modules/monitor";

const app = buildApp();
afterAll(() => { app.close(); delete process.env.OGA_SIGNALS_API; });

const auth = { authorization: "Bearer oga_good" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  vi.mocked(validateApiKey).mockResolvedValue({ userId: "user_1", orgId: null });
  vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  vi.mocked(hasApiAccess).mockResolvedValue(true);
});

describe("portfolios CRUD", () => {
  it("404s when the dark flag is off", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await app.inject({ method: "POST", url: "/v1/portfolios", headers: { ...auth, "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(404);
    expect(vi.mocked(validateApiKey)).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/portfolios" });
    expect(res.statusCode).toBe(401);
  });

  it("create: 400 without a name, 201 with one", async () => {
    const noName = await app.inject({ method: "POST", url: "/v1/portfolios", headers: { ...auth, "content-type": "application/json" }, payload: "{}" });
    expect(noName.statusCode).toBe(400);

    vi.mocked(monitor.createPortfolio).mockResolvedValue({ id: "pf_1", name: "My book", area_count: 0 });
    const ok = await app.inject({ method: "POST", url: "/v1/portfolios", headers: { ...auth, "content-type": "application/json" }, payload: JSON.stringify({ name: "My book" }) });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().id).toBe("pf_1");
    expect(monitor.createPortfolio).toHaveBeenCalledWith("user_1", "My book");
  });

  it("list: returns the user's portfolios", async () => {
    vi.mocked(monitor.listPortfolios).mockResolvedValue([{ id: "pf_1", name: "A", area_count: 3 }]);
    const res = await app.inject({ method: "GET", url: "/v1/portfolios", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().portfolios).toHaveLength(1);
  });

  it("get: 404 when not found/owned, 200 with areas", async () => {
    vi.mocked(monitor.getPortfolio).mockResolvedValue(null);
    expect((await app.inject({ method: "GET", url: "/v1/portfolios/pf_x", headers: auth })).statusCode).toBe(404);

    vi.mocked(monitor.getPortfolio).mockResolvedValue({ id: "pf_1", name: "A", area_count: 1, areas: [{ id: "pfa_1", area: "M1 1AE", label: null }] });
    const res = await app.inject({ method: "GET", url: "/v1/portfolios/pf_1", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().areas[0].area).toBe("M1 1AE");
  });

  it("delete: 404 when not owned, 200 when deleted", async () => {
    vi.mocked(monitor.deletePortfolio).mockResolvedValue(false);
    expect((await app.inject({ method: "DELETE", url: "/v1/portfolios/pf_x", headers: auth })).statusCode).toBe(404);
    vi.mocked(monitor.deletePortfolio).mockResolvedValue(true);
    expect((await app.inject({ method: "DELETE", url: "/v1/portfolios/pf_1", headers: auth })).statusCode).toBe(200);
  });
});

describe("portfolio areas + enrich", () => {
  it("areas: 400 on empty body, 404 when portfolio not owned, 200 with added count", async () => {
    const bad = await app.inject({ method: "POST", url: "/v1/portfolios/pf_1/areas", headers: { ...auth, "content-type": "application/json" }, payload: JSON.stringify({ areas: [] }) });
    expect(bad.statusCode).toBe(400);

    vi.mocked(monitor.addAreas).mockResolvedValue(null);
    const notOwned = await app.inject({ method: "POST", url: "/v1/portfolios/pf_x/areas", headers: { ...auth, "content-type": "application/json" }, payload: JSON.stringify({ areas: [{ area: "M1 1AE" }] }) });
    expect(notOwned.statusCode).toBe(404);

    vi.mocked(monitor.addAreas).mockResolvedValue({ added: 2 });
    const ok = await app.inject({ method: "POST", url: "/v1/portfolios/pf_1/areas", headers: { ...auth, "content-type": "application/json" }, payload: JSON.stringify({ areas: [{ area: "M1 1AE" }, { area: "SW1A 1AA", label: "HQ" }] }) });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().added).toBe(2);
  });

  it("enrich: 400 on bad preset, 404 when not owned, 200 with results", async () => {
    const badPreset = await app.inject({ method: "POST", url: "/v1/portfolios/pf_1/enrich", headers: { ...auth, "content-type": "application/json" }, payload: JSON.stringify({ preset: "vibes" }) });
    expect(badPreset.statusCode).toBe(400);

    vi.mocked(monitor.enrichPortfolio).mockResolvedValue(null);
    expect((await app.inject({ method: "POST", url: "/v1/portfolios/pf_x/enrich", headers: { ...auth, "content-type": "application/json" }, payload: "{}" })).statusCode).toBe(404);

    vi.mocked(monitor.enrichPortfolio).mockResolvedValue([{ area: "M1 1AE", label: null, score: null, error: null }]);
    const ok = await app.inject({ method: "POST", url: "/v1/portfolios/pf_1/enrich", headers: { ...auth, "content-type": "application/json" }, payload: JSON.stringify({ preset: "moving" }) });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().count).toBe(1);
  });
});
