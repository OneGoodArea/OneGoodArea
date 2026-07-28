import { describe, it, expect } from "vitest";
import { isoifyDates } from "@/infrastructure/utils/hybrid-serializer-compiler";

/* AR-629: the choke-point Date -> ISO coercion the Zod serializer runs before
   validating a response body. Locks the scope guard so a future edit can't
   silently start clobbering non-plain objects or cloning the world. */
describe("isoifyDates", () => {
  it("converts a top-level Date to an ISO string", () => {
    const d = new Date("2026-06-09T12:00:00.000Z");
    expect(isoifyDates(d)).toBe(d.toISOString());
  });

  it("converts Dates nested in objects and arrays", () => {
    const d = new Date("2026-01-02T03:04:05.000Z");
    const out = isoifyDates({ a: 1, list: [{ created_at: d }, { created_at: null }] }) as {
      a: number;
      list: { created_at: string | null }[];
    };
    expect(out.a).toBe(1);
    expect(out.list[0].created_at).toBe(d.toISOString());
    expect(out.list[1].created_at).toBeNull();
  });

  it("leaves primitives, null, and undefined untouched", () => {
    expect(isoifyDates("x")).toBe("x");
    expect(isoifyDates(42)).toBe(42);
    expect(isoifyDates(null)).toBeNull();
    expect(isoifyDates(undefined)).toBeUndefined();
  });

  it("returns the SAME reference when there is no Date (no needless clone)", () => {
    const input = { a: 1, b: { c: "hi" }, d: [1, 2, 3] };
    expect(isoifyDates(input)).toBe(input);
  });

  it("does not recurse into non-plain objects (custom toJSON is preserved)", () => {
    const withToJson = { toJSON: () => "serialised", inner: new Date("2026-01-01T00:00:00.000Z") };
    Object.setPrototypeOf(withToJson, { marker: true }); // non-plain prototype
    // Left byref: the Date inside is NOT rewritten, and its own toJSON governs the wire.
    expect(isoifyDates(withToJson)).toBe(withToJson);
  });
});
