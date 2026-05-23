import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("./infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("./modules/usage", () => ({
  getUserPlan: vi.fn(),
  hasApiAccess: vi.fn(),
  hasMcpAccess: vi.fn(),
  canGenerateReport: vi.fn(),
  listAddons: vi.fn(),
  getMcpUsageThisMonth: vi.fn(),
  // referenced elsewhere in app.ts (POST /v1/report) but unused in these tests
  trackMcpCall: vi.fn(),
}));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { validateApiKey } from "./modules/api-keys";
import { rateLimit } from "./infrastructure/rate-limit";
import {
  getUserPlan,
  hasApiAccess,
  hasMcpAccess,
  canGenerateReport,
  listAddons,
  getMcpUsageThisMonth,
} from "./modules/usage";
import { METHODOLOGY_VERSION } from "./modules/reports/methodology";

const app = buildApp();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateApiKey).mockResolvedValue("user_1");
  vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  vi.mocked(getUserPlan).mockResolvedValue("sandbox");
  vi.mocked(hasApiAccess).mockResolvedValue(true);
  vi.mocked(hasMcpAccess).mockResolvedValue(false);
  vi.mocked(canGenerateReport).mockResolvedValue({ allowed: true, plan: "sandbox", used: 3, limit: 35 } as never);
  vi.mocked(listAddons).mockResolvedValue([]);
  vi.mocked(getMcpUsageThisMonth).mockResolvedValue(0);
});

function get(headers: Record<string, string> = {}) {
  return app.inject({ method: "GET", url: "/v1/me", headers: { authorization: "Bearer oga_good", ...headers } });
}

describe("GET /v1/me", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
  });

  it("401s on an invalid key", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(null);
    expect((await get()).statusCode).toBe(401);
  });

  it("429s when rate limited", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await get()).statusCode).toBe(429);
  });

  it("returns plan + entitlements for the sandbox tier", async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plan).toBe("sandbox");
    expect(body.plan_name).toBe("Sandbox");
    expect(body.api_access).toBe(true);
    expect(body.mcp_access).toBe(false);
    expect(body.reports_per_month).toBe(35);
    expect(body.used_this_month).toBe(3);
    expect(body.limit_this_month).toBe(35);
    expect(body.engine_version).toBe(METHODOLOGY_VERSION);
    expect(body.addons).toEqual([]);
  });

  it("reports an unlimited (null) limit for a superuser-style Infinity quota", async () => {
    vi.mocked(canGenerateReport).mockResolvedValue({ allowed: true, plan: "business", used: 999, limit: Infinity } as never);
    vi.mocked(getUserPlan).mockResolvedValue("business");
    const body = (await get()).json();
    expect(body.limit_this_month).toBeNull();
  });
});
