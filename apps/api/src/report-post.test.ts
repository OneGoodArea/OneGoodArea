import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("./infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("./modules/usage", () => ({ canGenerateReport: vi.fn(), getUserEmail: vi.fn() }));
vi.mock("./modules/reports/report-generator", () => ({ generateReport: vi.fn() }));
vi.mock("./modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("./infrastructure/email/senders", () => ({ sendReportEmail: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { verifySessionToken } from "./modules/auth/session-token";
import { rateLimit } from "./infrastructure/rate-limit";
import { canGenerateReport, getUserEmail } from "./modules/usage";
import { generateReport } from "./modules/reports/report-generator";
import { trackEvent } from "./modules/tracking/activity";
import { sendReportEmail } from "./infrastructure/email/senders";

const app = buildApp();
const mockVerify = vi.mocked(verifySessionToken);
const mockRate = vi.mocked(rateLimit);
const mockQuota = vi.mocked(canGenerateReport);
const mockEmail = vi.mocked(getUserEmail);
const mockGenerate = vi.mocked(generateReport);
const mockSend = vi.mocked(sendReportEmail);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };
function post(body: unknown) {
  return app.inject({ method: "POST", url: "/report", headers: AUTH, payload: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
  mockRate.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
  mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 1, limit: 35 } as never);
  mockEmail.mockResolvedValue("user@example.com");
  mockGenerate.mockResolvedValue({ id: "rpt_1", report: { area: "Manchester", areaiq_score: 72 } } as never);
  mockSend.mockResolvedValue(undefined as never);
});

describe("POST /report (browser)", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/report", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("429s when the per-user rate limit trips", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("403 limit_reached when the monthly quota is exhausted", async () => {
    mockQuota.mockResolvedValue({ allowed: false, plan: "sandbox", used: 35, limit: 35 } as never);
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("limit_reached");
  });

  it("400s on invalid area / intent", async () => {
    expect((await post({ area: "", intent: "research" })).statusCode).toBe(400);
    expect((await post({ area: "Manchester", intent: "nope" })).statusCode).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("generates, tracks, emails, and returns the report", async () => {
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("rpt_1");
    expect(mockGenerate).toHaveBeenCalledWith("Manchester", "research", "user_1");
    expect(trackEvent).toHaveBeenCalledWith("report.generated", "user_1", expect.objectContaining({ reportId: "rpt_1" }));
    expect(mockSend).toHaveBeenCalledWith("user@example.com", "rpt_1", expect.objectContaining({ area: "Manchester" }));
  });

  it("still 200s if the report email fails (best-effort)", async () => {
    mockSend.mockRejectedValue(new Error("smtp down"));
    const res = await post({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(200);
  });
});
