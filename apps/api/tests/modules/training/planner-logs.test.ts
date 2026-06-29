import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sql } from "@/infrastructure/db/client";
import { logger } from "@/modules/tracking/structured-logger";
import { insertPlannerLog } from "@/modules/training/planner-logs";
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
  question: "Best areas in Manchester for moving",
  plan: { op: "rank_areas", country: "ENGLAND" },
  planSource: "llm",
  responseOk: true,
  errorCode: null,
  latencyMs: 234,
};

describe("insertPlannerLog", () => {
  it("inserts a row with the full field set + ALS source/client_app", async () => {
    mockSql.mockResolvedValue([] as never);

    await runWithRequestContext(
      { source: "mcp", client_app: "claude-code" },
      async () => {
        await insertPlannerLog(baseFields, false);
      },
    );

    expect(mockSql).toHaveBeenCalledTimes(1);
    const call = mockSql.mock.calls[0] as unknown[];
    // call[0] is the template strings array; call[1+] are the interpolated values.
    expect(String(call[1])).toMatch(/^plog_/); // generated id
    expect(call[2]).toBe("org_1");
    expect(call[3]).toBe("user_1");
    expect(call[4]).toBe("Best areas in Manchester for moving");
    expect(call[5]).toBe(JSON.stringify({ op: "rank_areas", country: "ENGLAND" }));
    expect(call[6]).toBe("llm");
    expect(call[7]).toBe(true);
    expect(call[8]).toBeNull();
    expect(call[9]).toBe(234);
    expect(call[10]).toBe("mcp");
    expect(call[11]).toBe("claude-code");
  });

  it("skips the insert when trainingOptout is true (privacy gate)", async () => {
    mockSql.mockResolvedValue([] as never);

    await insertPlannerLog(baseFields, true);

    expect(mockSql).not.toHaveBeenCalled();
  });

  it("writes null source + client_app when called outside a request scope", async () => {
    mockSql.mockResolvedValue([] as never);

    await insertPlannerLog(baseFields, false);

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[10]).toBeNull();
    expect(call[11]).toBeNull();
  });

  it("captures failure rows too (responseOk=false, errorCode set)", async () => {
    mockSql.mockResolvedValue([] as never);

    await insertPlannerLog(
      {
        ...baseFields,
        plan: { error: "ambiguous_location", query: "Springfield" },
        planSource: null,
        responseOk: false,
        errorCode: "ambiguous_location",
        latencyMs: 89,
      },
      false,
    );

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[7]).toBe(false);
    expect(call[8]).toBe("ambiguous_location");
    expect(call[6]).toBeNull();
  });

  it("never throws into the caller — logs on failure", async () => {
    mockSql.mockRejectedValue(new Error("db down") as never);

    await expect(insertPlannerLog(baseFields, false)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledOnce();
  });

  it("does not log to error when training_optout short-circuits", async () => {
    await insertPlannerLog(baseFields, true);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
