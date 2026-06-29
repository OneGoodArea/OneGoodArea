import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sql } from "@/infrastructure/db/client";
import { logger } from "@/modules/tracking/structured-logger";
import { insertBriefComposerLog } from "@/modules/training/brief-composer-logs";
import { runWithRequestContext } from "@/shared/request-context";

const mockSql = vi.mocked(sql);
const mockLogger = vi.mocked(logger);

beforeEach(() => {
  mockSql.mockReset();
  mockLogger.error.mockReset();
});

const baseFields = {
  userId: "user_1",
  orgId: "org_1",
  area: "SW1A 1AA",
  preset: "moving",
  weights: null,
  request: { area: "SW1A 1AA", preset: "moving", explain: true },
  response: {
    score: 44,
    dimensions: [{ key: "crime", score: 30, confidence: 0.8 }],
    summary: "Moderate score driven by ...",
  },
  responseOk: true,
  latencyMs: 412,
};

describe("insertBriefComposerLog", () => {
  it("inserts a row with the full payload + ALS source/client_app", async () => {
    mockSql.mockResolvedValue([] as never);

    await runWithRequestContext(
      { source: "mcp", client_app: "claude-code" },
      async () => {
        await insertBriefComposerLog(baseFields, false);
      },
    );

    expect(mockSql).toHaveBeenCalledTimes(1);
    const call = mockSql.mock.calls[0] as unknown[];
    expect(String(call[1])).toMatch(/^blog_/);
    expect(call[2]).toBe("org_1");
    expect(call[3]).toBe("user_1");
    expect(call[4]).toBe("SW1A 1AA");
    expect(call[5]).toBe("moving");
    expect(call[6]).toBeNull(); // null weights → null in DB
    expect(call[7]).toBe(JSON.stringify(baseFields.request));
    expect(call[8]).toBe(JSON.stringify(baseFields.response));
    expect(call[9]).toBe(true);
    expect(call[10]).toBe(412);
    expect(call[11]).toBe("mcp");
    expect(call[12]).toBe("claude-code");
  });

  it("serializes custom weights when provided", async () => {
    mockSql.mockResolvedValue([] as never);

    await insertBriefComposerLog(
      { ...baseFields, weights: { crime: 0.5, schools: 0.5 } },
      false,
    );

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[6]).toBe(JSON.stringify({ crime: 0.5, schools: 0.5 }));
  });

  it("skips the insert when trainingOptout is true (privacy gate)", async () => {
    await insertBriefComposerLog(baseFields, true);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("writes null source + client_app when called outside a request scope", async () => {
    mockSql.mockResolvedValue([] as never);

    await insertBriefComposerLog(baseFields, false);

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[11]).toBeNull();
    expect(call[12]).toBeNull();
  });

  it("never throws into the caller — logs on failure", async () => {
    mockSql.mockRejectedValue(new Error("db down") as never);

    await expect(insertBriefComposerLog(baseFields, false)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledOnce();
  });
});
