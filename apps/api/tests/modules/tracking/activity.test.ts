import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sql } from "@/infrastructure/db/client";
import { logger } from "@/modules/tracking/structured-logger";
import { trackEvent } from "@/modules/tracking/activity";
import { runWithRequestContext } from "@/shared/request-context";

const mockSql = vi.mocked(sql);
const mockLogger = vi.mocked(logger);

beforeEach(() => {
  mockSql.mockReset();
  mockLogger.error.mockReset();
});

describe("trackEvent", () => {
  it("inserts an event with id, user, event name and serialized metadata", async () => {
    mockSql.mockResolvedValue([] as never);

    await trackEvent("report.cache_hit", "user_1", { area: "M1", intent: "moving" });

    expect(mockSql).toHaveBeenCalledTimes(1);
    const call = mockSql.mock.calls[0] as unknown[];
    expect(String(call[1])).toMatch(/^evt_/);                 // generated id
    expect(call[2]).toBe("user_1");                            // user_id
    expect(call[3]).toBe("report.cache_hit");                  // event
    expect(call[4]).toBe(JSON.stringify({ area: "M1", intent: "moving" }));
  });

  it("defaults a missing user to null and missing metadata to {}", async () => {
    mockSql.mockResolvedValue([] as never);

    await trackEvent("anon.event");

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[2]).toBeNull();
    expect(call[4]).toBe("{}");
  });

  it("never throws into the caller and logs on failure", async () => {
    mockSql.mockRejectedValue(new Error("db down") as never);

    await expect(trackEvent("x", "u")).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledOnce();
  });

  /* AR-375: when inside a Fastify request scope, trackEvent merges
     {source, client_app} from the AsyncLocalStorage context into the
     persisted metadata. Outside a request, it omits them — verified by
     the assertions above (call[4] === JSON.stringify({...}) with no
     source field). This test pins the inside-request behavior. */
  it("merges {source, client_app} from request context when present", async () => {
    mockSql.mockResolvedValue([] as never);

    await runWithRequestContext(
      { source: "mcp", client_app: "claude-code" },
      async () => {
        await trackEvent("api.score.computed", "user_1", { area: "M1" }, "org_1");
      },
    );

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[4]).toBe(
      JSON.stringify({ area: "M1", source: "mcp", client_app: "claude-code" }),
    );
  });

  it("works with no caller-provided metadata when context is present", async () => {
    mockSql.mockResolvedValue([] as never);

    await runWithRequestContext(
      { source: "api", client_app: "other" },
      async () => {
        await trackEvent("anon.event");
      },
    );

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[4]).toBe(JSON.stringify({ source: "api", client_app: "other" }));
  });
});
