import { describe, it, expect } from "vitest";
import {
  getRequestContext,
  runWithRequestContext,
} from "@/shared/request-context";

/* AR-375: AsyncLocalStorage smoke. We rely on the same Node primitive
   Fastify uses internally for request-id propagation, so heavy testing
   of the OS primitive isn't useful — but we verify the contract this
   module exposes: context is bound inside run(), null outside, and
   nested runs override the parent. */

describe("request-context", () => {
  it("returns null outside any run() call", () => {
    expect(getRequestContext()).toBeNull();
  });

  it("exposes the context inside run() and clears it after", () => {
    let inside: ReturnType<typeof getRequestContext> = null;
    runWithRequestContext({ source: "mcp", client_app: "claude-code" }, () => {
      inside = getRequestContext();
    });
    expect(inside).toEqual({ source: "mcp", client_app: "claude-code" });
    expect(getRequestContext()).toBeNull();
  });

  it("nested runs override the parent context", () => {
    runWithRequestContext({ source: "mcp", client_app: "claude-code" }, () => {
      expect(getRequestContext()?.source).toBe("mcp");
      runWithRequestContext({ source: "api", client_app: "other" }, () => {
        expect(getRequestContext()).toEqual({ source: "api", client_app: "other" });
      });
      // parent restored after nested run() exits
      expect(getRequestContext()?.source).toBe("mcp");
    });
  });

  it("propagates context across async boundaries", async () => {
    const captured: Array<ReturnType<typeof getRequestContext>> = [];
    await runWithRequestContext(
      { source: "mcp", client_app: "cursor" },
      async () => {
        captured.push(getRequestContext());
        await new Promise((r) => setTimeout(r, 1));
        captured.push(getRequestContext());
      },
    );
    expect(captured).toHaveLength(2);
    expect(captured[0]).toEqual({ source: "mcp", client_app: "cursor" });
    expect(captured[1]).toEqual({ source: "mcp", client_app: "cursor" });
  });
});
