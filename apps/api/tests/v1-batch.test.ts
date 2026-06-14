import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({
  hasApiAccess: vi.fn(),
  canGenerateReport: vi.fn(),
  // referenced elsewhere in app.ts; unused here
  getUserPlan: vi.fn(),
  hasMcpAccess: vi.fn(),
  trackMcpCall: vi.fn(),
  listAddons: vi.fn(),
  getMcpUsageThisMonth: vi.fn(),
}));
vi.mock("@/modules/reports/report-generator", () => ({ generateReport: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess, canGenerateReport } from "@/modules/usage";
import { generateReport } from "@/modules/reports/report-generator";

const app = await buildApp();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateApiKey).mockResolvedValue({ userId: "user_1", orgId: null });
  vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 4, reset: 0 });
  vi.mocked(hasApiAccess).mockResolvedValue(true);
  vi.mocked(canGenerateReport).mockResolvedValue({ allowed: true, plan: "sandbox", used: 0, limit: 35 } as never);
  vi.mocked(generateReport).mockImplementation(async (area: string) => ({ id: `rpt_${area}`, report: { area } as never }));
});

function postBatch(body: unknown, headers: Record<string, string> = {}) {
  return app.inject({
    method: "POST",
    url: "/v1/batch",
    headers: { "content-type": "application/json", authorization: "Bearer oga_good", ...headers },
    payload: JSON.stringify(body),
  });
}

describe("POST /v1/batch", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/batch", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("429s when batch-rate-limited", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await postBatch({ items: [{ area: "M1", intent: "research" }] })).statusCode).toBe(429);
  });

  it("403s without API access", async () => {
    vi.mocked(hasApiAccess).mockResolvedValue(false);
    expect((await postBatch({ items: [{ area: "M1", intent: "research" }] })).statusCode).toBe(403);
  });

  it("400s on a malformed body / item", async () => {
    expect((await postBatch({})).statusCode).toBe(400);
    expect((await postBatch({ items: [{ area: "M1" }] })).statusCode).toBe(400);
    expect((await postBatch({ items: [] })).statusCode).toBe(400);
  });

  it("400s when the batch exceeds the max size", async () => {
    const items = Array.from({ length: 101 }, () => ({ area: "M1", intent: "research" }));
    expect((await postBatch({ items })).statusCode).toBe(400);
  });

  it("429s when the batch exceeds remaining quota", async () => {
    vi.mocked(canGenerateReport).mockResolvedValue({ allowed: true, plan: "sandbox", used: 34, limit: 35 } as never);
    const res = await postBatch({ items: [{ area: "M1", intent: "research" }, { area: "M2", intent: "research" }] });
    expect(res.statusCode).toBe(429);
    expect(res.json().remaining).toBe(1);
  });

  it("200s and returns per-item results + summary on the happy path", async () => {
    const res = await postBatch({
      items: [
        { area: "Manchester", intent: "research" },
        { area: "Leeds", intent: "bad" },        // invalid intent -> per-item error
        { area: "Bristol", intent: "investing" },
      ],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary).toEqual({ total: 3, succeeded: 2, failed: 1 });
    expect(body.results).toHaveLength(3);
    expect(res.headers["x-engine-version"]).toBeDefined();
  });
});
