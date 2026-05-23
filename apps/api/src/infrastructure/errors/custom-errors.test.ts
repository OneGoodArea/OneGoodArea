import { describe, it, expect } from "vitest";
import {
  AppError,
  RateLimitError,
  DataSourceError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  AIParseError,
  isAppError,
} from "./custom-errors";

/* New test (the legacy errors.ts had none) — locks each error's statusCode,
   code, and name so handler error-mapping can't silently drift. */

describe("custom errors", () => {
  it("AppError carries message, statusCode and code", () => {
    const e = new AppError("boom", 418, "TEAPOT");
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("boom");
    expect(e.statusCode).toBe(418);
    expect(e.code).toBe("TEAPOT");
    expect(e.name).toBe("AppError");
  });

  it("each subclass maps to the right HTTP status + code", () => {
    expect([new RateLimitError(30).statusCode, new RateLimitError(30).code]).toEqual([429, "RATE_LIMIT_EXCEEDED"]);
    expect([new DataSourceError("police").statusCode, new DataSourceError("police").code]).toEqual([502, "DATA_SOURCE_ERROR"]);
    expect([new AuthenticationError().statusCode, new AuthenticationError().code]).toEqual([401, "UNAUTHORIZED"]);
    expect([new ForbiddenError().statusCode, new ForbiddenError().code]).toEqual([403, "FORBIDDEN"]);
    expect([new ValidationError("bad").statusCode, new ValidationError("bad").code]).toEqual([400, "VALIDATION_ERROR"]);
    expect([new NotFoundError().statusCode, new NotFoundError().code]).toEqual([404, "NOT_FOUND"]);
    expect([new AIParseError().statusCode, new AIParseError().code]).toEqual([500, "AI_PARSE_ERROR"]);
  });

  it("subclasses retain their carried fields", () => {
    expect(new RateLimitError(42).retryAfter).toBe(42);
    expect(new DataSourceError("ofsted").source).toBe("ofsted");
    expect(new ValidationError("bad", "email").field).toBe("email");
  });

  it("isAppError narrows known errors and rejects plain ones", () => {
    expect(isAppError(new ValidationError("x"))).toBe(true);
    expect(isAppError(new AppError("x", 500, "X"))).toBe(true);
    expect(isAppError(new Error("plain"))).toBe(false);
    expect(isAppError("nope")).toBe(false);
  });
});
