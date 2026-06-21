import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({
  canGenerateReport: vi.fn(),
  getUserEmail: vi.fn(),
  hasApiAccess: vi.fn(),
  hasMcpAccess: vi.fn(),
  trackMcpCall: vi.fn(),
}));
vi.mock("@/modules/reports/report-generator", () => ({ generateReport: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/email/senders", () => ({ sendReportEmail: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { canGenerateReport, getUserEmail, hasApiAccess } from "@/modules/usage";
import { generateReport } from "@/modules/reports/report-generator";
import { trackEvent } from "@/modules/tracking/activity";
import { sendReportEmail } from "@/infrastructure/email/senders";
import { sql } from "@/infrastructure/db/client";

const app = await buildApp();

const mockSessionVerify = vi.mocked(verifySessionToken);
const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockQuota = vi.mocked(canGenerateReport);
const mockEmail = vi.mocked(getUserEmail);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockGenerate = vi.mocked(generateReport);
const mockSend = vi.mocked(sendReportEmail);
const mockSql = vi.mocked(sql);

const SESSION_AUTH = { authorization: "Bearer session.jwt" };
const SESSION_AUTH_JSON = { ...SESSION_AUTH, "content-type": "application/json" };
const API_AUTH_BEARER = { authorization: "Bearer oga_good" };

const REPORT = { area: "Manchester", intent: "research", areaiq_score: 72 } as never;

beforeEach(() => {
  vi.clearAllMocks();
  // Session defaults
  mockSessionVerify.mockResolvedValue({ userId: "user_1" });
  // API-key defaults
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  // Rate-limit defaults
  mockRate.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
  // Quota defaults
  mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 1, limit: 35 } as never);
  mockApiAccess.mockResolvedValue(true);
  // Generator defaults
  mockGenerate.mockResolvedValue({ id: "rpt_1", report: REPORT });
  // Email defaults
  mockEmail.mockResolvedValue("user@example.com");
  mockSend.mockResolvedValue(undefined as never);
  // DB defaults
  mockSql.mockResolvedValue([] as never);
});

// ── report-id.test.ts ───────────────────────────────────────────────

describe("GET /report/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/report/rpt_1" })).statusCode).toBe(401);
  });

  it("404s when the report is not the caller's / missing", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "GET", url: "/report/rpt_x", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("returns the report, parsing a stringified report column", async () => {
    mockSql.mockResolvedValue([
      {
        id: "rpt_1",
        area: "Manchester",
        intent: "research",
        report: JSON.stringify({ areaiq_score: 72 }),
        score: 72,
        created_at: "2026-05-24T00:00:00.000Z",
      },
    ] as never);
    const res = await app.inject({ method: "GET", url: "/report/rpt_1", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("rpt_1");
    expect(body.report).toEqual({ areaiq_score: 72 });
    expect(body.score).toBe(72);
  });

  it("passes through an already-object report column", async () => {
    mockSql.mockResolvedValue([
      { id: "rpt_2", area: "Leeds", intent: "moving", report: { areaiq_score: 60 }, score: 60, created_at: "x" },
    ] as never);
    const body = (await app.inject({ method: "GET", url: "/report/rpt_2", headers: SESSION_AUTH })).json();
    expect(body.report).toEqual({ areaiq_score: 60 });
  });
});

describe("DELETE /report/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "DELETE", url: "/report/rpt_1" })).statusCode).toBe(401);
  });

  it("404s when nothing was deleted", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "DELETE", url: "/report/rpt_x", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("returns ok when the report is deleted", async () => {
    mockSql.mockResolvedValue([{ id: "rpt_1" }] as never);
    const res = await app.inject({ method: "DELETE", url: "/report/rpt_1", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

// ── report-post.test.ts ─────────────────────────────────────────────

describe("POST /report (browser)", () => {
  function postReport(body: unknown) {
    return app.inject({ method: "POST", url: "/report", headers: SESSION_AUTH_JSON, payload: JSON.stringify(body) });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/report", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("429s when the per-user rate limit trips", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await postReport({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("403 limit_reached when the monthly quota is exhausted", async () => {
    mockQuota.mockResolvedValue({ allowed: false, plan: "sandbox", used: 35, limit: 35 } as never);
    const res = await postReport({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("limit_reached");
  });

  it("400s on invalid area / intent", async () => {
    expect((await postReport({ area: "", intent: "research" })).statusCode).toBe(400);
    expect((await postReport({ area: "Manchester", intent: "nope" })).statusCode).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("generates, tracks, emails, and returns the report", async () => {
    const res = await postReport({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("rpt_1");
    expect(mockGenerate).toHaveBeenCalledWith("Manchester", "research", "user_1");
    expect(trackEvent).toHaveBeenCalledWith("report.generated", "user_1", expect.objectContaining({ reportId: "rpt_1" }));
    expect(mockSend).toHaveBeenCalledWith("user@example.com", "rpt_1", expect.objectContaining({ area: "Manchester" }));
  });

  it("still 200s if the report email fails (best-effort)", async () => {
    mockSend.mockRejectedValue(new Error("smtp down"));
    const res = await postReport({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(200);
  });
});

// ── v1-report.test.ts ───────────────────────────────────────────────

describe("POST /v1/report", () => {
  function postV1(body: unknown, extraHeaders: Record<string, string> = {}) {
    return app.inject({
      method: "POST",
      url: "/v1/report",
      headers: { "content-type": "application/json", ...API_AUTH_BEARER, ...extraHeaders },
      payload: JSON.stringify(body),
    });
  }

  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/report", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s on an invalid key", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await postV1({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(401);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await postV1({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await postV1({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(403);
  });

  it("429s when the monthly quota is exhausted", async () => {
    mockQuota.mockResolvedValue({ allowed: false, plan: "sandbox", used: 35, limit: 35 } as never);
    const res = await postV1({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(429);
    expect(res.json().used).toBe(35);
  });

  it("400s on an invalid area", async () => {
    const res = await postV1({ area: "", intent: "research" });
    expect(res.statusCode).toBe(400);
  });

  it("400s on an invalid intent", async () => {
    const res = await postV1({ area: "Manchester", intent: "nonsense" });
    expect(res.statusCode).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("200s on the happy path: generates, returns the report, records the event", async () => {
    const res = await postV1({ area: "Manchester", intent: "research" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("rpt_1");
    expect(body.report.area).toBe("Manchester");
    expect(mockGenerate).toHaveBeenCalledWith("Manchester", "research", "user_1");
    expect(trackEvent).toHaveBeenCalledWith(
      "api.report.generated",
      "user_1",
      expect.objectContaining({ reportId: "rpt_1", source: "api" }),
      null,
    );
    expect(res.headers["x-engine-version"]).toBeDefined();
    expect(res.headers["x-idempotency-replayed"]).toBe("false");
  });

  it("rejects an unsupported X-Engine-Version pin before doing work", async () => {
    const res = await postV1({ area: "Manchester", intent: "research" }, { "x-engine-version": "0.0.1" });
    expect(res.statusCode).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
