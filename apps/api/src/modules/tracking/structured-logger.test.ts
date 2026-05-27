import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./structured-logger";

/* New test (the legacy logger.ts had none). Locks the structured-JSON shape,
   context attachment, Error serialization, and level filtering — so log
   output other tools parse can't silently change. */

describe("structured-logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OGA_LOG_LEVEL;
  });

  it("emits structured JSON with service, level, message, timestamp", () => {
    logger.error("boom");
    expect(errorSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(errorSpy.mock.calls[0]![0] as string);
    expect(payload.service).toBe("OneGoodArea");
    expect(payload.level).toBe("error");
    expect(payload.message).toBe("boom");
    expect(typeof payload.timestamp).toBe("string");
  });

  it("attaches a context object", () => {
    logger.info("hi", { area: "M1" });
    const payload = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(payload.context).toEqual({ area: "M1" });
  });

  it("serializes Error values in context", () => {
    logger.error("failed", { error: new Error("nope") });
    const payload = JSON.parse(errorSpy.mock.calls[0]![0] as string);
    expect(payload.context.error.message).toBe("nope");
    expect(payload.context.error.name).toBe("Error");
  });

  it("respects OGA_LOG_LEVEL (warn suppresses info)", () => {
    process.env.OGA_LOG_LEVEL = "warn";
    logger.info("suppressed");
    logger.warn("shown");
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});
