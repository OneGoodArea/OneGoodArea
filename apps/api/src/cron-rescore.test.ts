import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("./modules/reports/rescore", () => ({ runRescoreCron: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { runRescoreCron } from "./modules/reports/rescore";

const app = buildApp();
const mockRun = vi.mocked(runRescoreCron);

const SUMMARY = {
  run_id: "run_abc",
  started_at: "2026-05-25T00:00:00.000Z",
  finished_at: "2026-05-25T00:01:00.000Z",
  postcodes_attempted: 1,
  rows_written: 4,
  failed: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-secret";
  mockRun.mockResolvedValue(SUMMARY);
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /cron/rescore", () => {
  it("503s when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await app.inject({ method: "GET", url: "/cron/rescore" });
    expect(res.statusCode).toBe(503);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("401s without the correct bearer secret", async () => {
    expect((await app.inject({ method: "GET", url: "/cron/rescore" })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: "GET", url: "/cron/rescore", headers: { authorization: "Bearer wrong" } })).statusCode,
    ).toBe(401);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("runs the rescore and returns the summary", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/cron/rescore",
      headers: { authorization: "Bearer cron-secret" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(SUMMARY);
    expect(mockRun).toHaveBeenCalledWith({ limit: undefined, dryRun: false });
  });

  it("passes ?limit + ?dry_run through to the worker", async () => {
    await app.inject({
      method: "GET",
      url: "/cron/rescore?limit=5&dry_run=true",
      headers: { authorization: "Bearer cron-secret" },
    });
    expect(mockRun).toHaveBeenCalledWith({ limit: 5, dryRun: true });
  });

  it("500s when the worker throws", async () => {
    mockRun.mockRejectedValue(new Error("db down"));
    const res = await app.inject({
      method: "GET",
      url: "/cron/rescore",
      headers: { authorization: "Bearer cron-secret" },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("db down");
  });
});
