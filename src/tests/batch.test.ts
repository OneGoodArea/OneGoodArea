import { describe, it, expect } from "vitest";
import { isBatchItemArray, isSuccess, type BatchResult } from "@/lib/batch";

/* AR-130 verification for the pure helpers used by the bulk endpoint.
   Integration coverage (HTTP route + DB + generateReport) is deferred to
   Marcos's local-runtime container work. */

describe("AR-130: isBatchItemArray type guard", () => {
  it("accepts a valid array of items", () => {
    expect(
      isBatchItemArray([
        { area: "Manchester", intent: "moving" },
        { area: "M1 1AE", intent: "business" },
      ]),
    ).toBe(true);
  });

  it("accepts an empty array (caller enforces non-empty separately)", () => {
    expect(isBatchItemArray([])).toBe(true);
  });

  it("rejects non-arrays", () => {
    expect(isBatchItemArray(null)).toBe(false);
    expect(isBatchItemArray(undefined)).toBe(false);
    expect(isBatchItemArray("nope")).toBe(false);
    expect(isBatchItemArray(42)).toBe(false);
    expect(isBatchItemArray({ items: [] })).toBe(false);
  });

  it("rejects arrays containing non-objects", () => {
    expect(isBatchItemArray(["Manchester"])).toBe(false);
    expect(isBatchItemArray([null])).toBe(false);
    expect(isBatchItemArray([42])).toBe(false);
  });

  it("rejects items missing the area field", () => {
    expect(isBatchItemArray([{ intent: "moving" }])).toBe(false);
  });

  it("rejects items missing the intent field", () => {
    expect(isBatchItemArray([{ area: "Manchester" }])).toBe(false);
  });

  it("rejects items where area or intent are non-string", () => {
    expect(isBatchItemArray([{ area: 123, intent: "moving" }])).toBe(false);
    expect(isBatchItemArray([{ area: "Manchester", intent: null }])).toBe(false);
    expect(isBatchItemArray([{ area: "Manchester", intent: ["moving"] }])).toBe(false);
  });

  it("accepts extra fields without rejecting (forward-compat)", () => {
    expect(
      isBatchItemArray([{ area: "Manchester", intent: "moving", extra_field: "ignored" }]),
    ).toBe(true);
  });

  it("rejects if even one item in a long array is malformed", () => {
    const items = [
      { area: "Manchester", intent: "moving" },
      { area: "London", intent: "business" },
      { area: 42, intent: "investing" },
      { area: "Bristol", intent: "research" },
    ];
    expect(isBatchItemArray(items)).toBe(false);
  });
});

describe("AR-130: isSuccess discriminator", () => {
  it("is true for results with a report field", () => {
    const result: BatchResult = {
      area: "Manchester",
      intent: "moving",
      // Minimal cast — the test only checks the type discriminator.
      report: { id: "test" } as unknown as BatchResult extends { report: infer R } ? R : never,
    };
    expect(isSuccess(result)).toBe(true);
  });

  it("is false for results with an error field", () => {
    const result: BatchResult = {
      area: "Manchester",
      intent: "moving",
      error: "Validation failed",
    };
    expect(isSuccess(result)).toBe(false);
  });
});
