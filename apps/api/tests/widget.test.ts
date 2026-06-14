import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/reports/report-cache", () => ({ getCachedReport: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { rateLimit } from "@/infrastructure/rate-limit";
import { getCachedReport } from "@/modules/reports/report-cache";

const app = await buildApp();
const mockRate = vi.mocked(rateLimit);
const mockCache = vi.mocked(getCachedReport);

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.mockResolvedValue({ success: true, remaining: 59, reset: 0 });
});

describe("OPTIONS /widget", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await app.inject({ method: "OPTIONS", url: "/widget", headers: { origin: "https://embed.example.com" } });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://embed.example.com");
    expect(res.headers["access-control-allow-methods"]).toBe("GET, OPTIONS");
  });
});

describe("GET /widget", () => {
  it("sets CORS headers and 400s without a postcode", async () => {
    const res = await app.inject({ method: "GET", url: "/widget" });
    expect(res.statusCode).toBe(400);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("400s on an invalid postcode", async () => {
    const res = await app.inject({ method: "GET", url: "/widget?postcode=%20" });
    expect(res.statusCode).toBe(400);
    expect(mockCache).not.toHaveBeenCalled();
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await app.inject({ method: "GET", url: "/widget?postcode=M1+1AE" });
    expect(res.statusCode).toBe(429);
    expect(mockCache).not.toHaveBeenCalled();
  });

  it("404s on a cache miss (cache-only, never generates)", async () => {
    mockCache.mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/widget?postcode=M1+1AE" });
    expect(res.statusCode).toBe(404);
  });

  it("returns the shaped cached summary on a hit", async () => {
    mockCache.mockResolvedValue({
      report: {
        area: "Manchester",
        intent: "moving",
        areaiq_score: 72,
        area_type: "urban",
        sub_scores: [
          { label: "Safety", score: 60 },
          { label: "Transport", score: 80 },
        ],
      },
      area: "Manchester",
      score: 72,
      created_at: "2026-05-24T00:00:00.000Z",
    } as never);

    const res = await app.inject({ method: "GET", url: "/widget?postcode=M1+1AE&intent=moving" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.area).toBe("Manchester");
    expect(body.score).toBe(72);
    expect(body.area_type).toBe("urban");
    expect(body.dimensions).toEqual([
      { label: "Safety", score: 60 },
      { label: "Transport", score: 80 },
    ]);
    expect(body.powered_by).toBe("https://www.onegoodarea.com");
  });
});
