import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("./infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("./modules/usage", () => ({
  hasApiAccess: vi.fn(),
  canGenerateReport: vi.fn(),
  hasMcpAccess: vi.fn(),
  trackMcpCall: vi.fn(),
}));
vi.mock("./modules/reports/report-generator", () => ({ generateReport: vi.fn() }));
vi.mock("./modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { validateApiKey } from "./modules/api-keys";
import { rateLimit } from "./infrastructure/rate-limit";
import { hasApiAccess, canGenerateReport } from "./modules/usage";
import { generateReport } from "./modules/reports/report-generator";
import { trackEvent } from "./modules/tracking/activity";

const app = buildApp();

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockQuota = vi.mocked(canGenerateReport);
const mockGenerate = vi.mocked(generateReport);

const REPORT = { area: "Manchester", intent: "research", areaiq_score: 72 } as never;

function post(body: unknown, extraHeaders: Record<string, string> = {}) {
  return app.inject({
    method: "POST",
    url: "/v1/report",
    headers: { "content-type": "application/json", authorization: "Bearer oga_good", ...extraHeaders },
    payload: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Happy-path defaults; individual tests override one gate.
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 1, limit: 35 } as never);
  mockGenerate.mockResolvedValue({ id: "rpt_1", report: REPORT });
});

describe("POST /v1/report", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/report", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s on an invalid key", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(401);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(403);
  });

  it("429s when the monthly quota is exhausted", async () => {
    mockQuota.mockResolvedValue({ allowed: false, plan: "sandbox", used: 35, limit: 35 } as never);
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(429);
    expect(res.json().used).toBe(35);
  });

  it("400s on an invalid area", async () => {
    const res = await post({ area: "", intent: "research" });
    expect(res.statusCode).toBe(400);
  });

  it("400s on an invalid intent", async () => {
    const res = await post({ area: "Manchester", intent: "nonsense" });
    expect(res.statusCode).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("200s on the happy path: generates, returns the report, records the event", async () => {
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("rpt_1");
    expect(body.report.area).toBe("Manchester");
    expect(mockGenerate).toHaveBeenCalledWith("Manchester", "research", "user_1");
    expect(trackEvent).toHaveBeenCalledWith(
      "api.report.generated",
      "user_1",
      expect.objectContaining({ reportId: "rpt_1", source: "api" })
    );
    expect(res.headers["x-engine-version"]).toBeDefined();
    expect(res.headers["x-idempotency-replayed"]).toBe("false");
  });

  it("rejects an unsupported X-Engine-Version pin before doing work", async () => {
    const res = await post({ area: "Manchester", intent: "research" }, { "x-engine-version": "0.0.1" });
    expect(res.statusCode).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
