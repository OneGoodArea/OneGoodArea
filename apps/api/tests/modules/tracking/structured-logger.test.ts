import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/modules/tracking/structured-logger";

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

  /* AR-308: redact URI passwords (postgresql://user:pw@host etc) so a
     driver's error message can't leak the connection-string password
     into log streams / Sentry. Anchored on `://user:`...`@` so plain
     user@host or host:port forms aren't touched. */
  describe("URI password redaction (AR-308)", () => {
    it("masks the password in a Postgres connection string in the error message", () => {
      logger.error("DB error: cannot connect to postgresql://neondb_owner:npg_realpassword@ep-host.neon.tech/db?sslmode=require");
      const raw = errorSpy.mock.calls[0]![0] as string;
      expect(raw).not.toContain("npg_realpassword");
      expect(raw).toContain("postgresql://neondb_owner:***@ep-host.neon.tech/db");
    });

    it("masks passwords inside a serialized Error context (the real AR-308 leak path)", () => {
      const err = new Error('Database connection string provided to `neon()` is not a valid URL. Connection string: "postgresql://neondb_owner:npg_realpassword@ep-host.neon.tech/db?sslmode=require"');
      logger.error("v1/orgs list error:", { error: err });
      const raw = errorSpy.mock.calls[0]![0] as string;
      expect(raw).not.toContain("npg_realpassword");
      expect(raw).toMatch(/postgresql:\/\/neondb_owner:\*\*\*@ep-host/);
    });

    it("masks multiple URI passwords in a single log line", () => {
      logger.error("mismatch", { primary: "postgresql://a:secret_a@host1/db", replica: "postgresql://b:secret_b@host2/db" });
      const raw = errorSpy.mock.calls[0]![0] as string;
      expect(raw).not.toContain("secret_a");
      expect(raw).not.toContain("secret_b");
      expect(raw).toContain("postgresql://a:***@host1");
      expect(raw).toContain("postgresql://b:***@host2");
    });

    it("leaves URIs without a userinfo:password segment untouched", () => {
      logger.info("ping", { url: "https://api.onegoodarea.com/v1/health" });
      const raw = logSpy.mock.calls[0]![0] as string;
      expect(raw).toContain("https://api.onegoodarea.com/v1/health");
    });

    it("does not mangle host:port patterns (no @ follows)", () => {
      logger.info("redis up", { addr: "localhost:6379" });
      const raw = logSpy.mock.calls[0]![0] as string;
      expect(raw).toContain("localhost:6379");
    });
  });
});
