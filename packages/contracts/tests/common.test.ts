import { describe, it, expect } from "vitest";
import { IsoDateTimeSchema } from "../src/common";

describe("IsoDateTimeSchema", () => {
  it("accepts valid ISO-8601 datetime strings", () => {
    expect(IsoDateTimeSchema.safeParse("2026-08-03T15:00:00Z").success).toBe(true);
    expect(IsoDateTimeSchema.safeParse("2026-01-01T00:00:00.000Z").success).toBe(true);
    expect(IsoDateTimeSchema.safeParse("2026-07-28T08:53:56.498+01:00").success).toBe(true);
    expect(IsoDateTimeSchema.safeParse("2026-12-31T23:59:59-05:00").success).toBe(true);
  });

  it("rejects non-ISO strings", () => {
    expect(IsoDateTimeSchema.safeParse("not-a-date").success).toBe(false);
    expect(IsoDateTimeSchema.safeParse("2026-08-03").success).toBe(false);
    expect(IsoDateTimeSchema.safeParse("").success).toBe(false);
    expect(IsoDateTimeSchema.safeParse("Thu, 01 Jan 2026 00:00:00 GMT").success).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(IsoDateTimeSchema.safeParse(1722681600000).success).toBe(false);
    expect(IsoDateTimeSchema.safeParse(null).success).toBe(false);
    expect(IsoDateTimeSchema.safeParse(undefined).success).toBe(false);
  });
});
