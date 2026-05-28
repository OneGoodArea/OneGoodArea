import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { sql } from "@/infrastructure/db/client";

const app = buildApp();
const mockSql = vi.mocked(sql);

const JSON_HEADERS = { "content-type": "application/json" };

function post(body: unknown, headers: Record<string, string> = {}) {
  return app.inject({
    method: "POST",
    url: "/track",
    headers: { ...JSON_HEADERS, ...headers },
    payload: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSql.mockResolvedValue([] as never);
});

describe("POST /track", () => {
  it("400s when path is missing", async () => {
    const res = await post({ referrer: "https://x.com" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ ok: false });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("skips api/admin/static paths without inserting", async () => {
    for (const path of ["/api/v1/report", "/admin/x", "/_next/static/y"]) {
      const res = await post({ path });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    }
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("inserts a pageview with derived device + cleaned external referrer", async () => {
    const res = await post(
      { path: "/area/m1", referrer: "https://google.com/search?q=x", sessionId: "s1" },
      { "user-agent": "iPhone Safari", "x-vercel-ip-country": "GB" },
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSql).toHaveBeenCalledTimes(1);
    const params = mockSql.mock.calls[0].slice(1);
    // [path, referrer, country, device, session_id]
    expect(params).toEqual(["/area/m1", "google.com", "GB", "mobile", "s1"]);
  });

  it("drops a same-site referrer (keeps only external hostnames)", async () => {
    await post({ path: "/area/m1", referrer: "https://www.onegoodarea.com/pricing" });
    const params = mockSql.mock.calls[0].slice(1);
    expect(params[1]).toBeNull(); // referrer dropped
  });

  it("never fails visibly: returns ok even if the insert throws", async () => {
    mockSql.mockRejectedValue(new Error("db down"));
    const res = await post({ path: "/area/m1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
