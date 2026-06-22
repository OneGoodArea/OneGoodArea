import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/reports/report-generator", () => ({ generateReport: vi.fn() }));

import { generateReport } from "@/modules/reports/report-generator";
import {
  isBatchItemArray,
  isSuccess,
  processSingleItem,
  processBatchItems,
  type BatchResult,
} from "@/modules/engine/batch";

const mockGenerate = vi.mocked(generateReport);

beforeEach(() => mockGenerate.mockReset());

describe("isBatchItemArray", () => {
  it("accepts an array of {area,intent} strings", () => {
    expect(isBatchItemArray([{ area: "M1", intent: "research" }])).toBe(true);
  });
  it("rejects non-arrays and malformed items", () => {
    expect(isBatchItemArray("nope")).toBe(false);
    expect(isBatchItemArray([{ area: "M1" }])).toBe(false);
    expect(isBatchItemArray([{ area: 1, intent: "x" }])).toBe(false);
  });
});

describe("isSuccess", () => {
  it("discriminates the success variant", () => {
    expect(isSuccess({ area: "M1", intent: "research", report: {} as never })).toBe(true);
    expect(isSuccess({ area: "M1", intent: "research", error: "bad" })).toBe(false);
  });
});

describe("processSingleItem", () => {
  it("returns a success result for a valid item", async () => {
    mockGenerate.mockResolvedValue({ id: "rpt_1", report: { area: "Manchester" } as never });
    const r = await processSingleItem({ area: "Manchester", intent: "research" }, "u1");
    expect(isSuccess(r)).toBe(true);
    expect(mockGenerate).toHaveBeenCalledWith("Manchester", "research", "u1");
  });

  it("returns an error result for an invalid area (no generation)", async () => {
    const r = await processSingleItem({ area: "", intent: "research" }, "u1");
    expect(isSuccess(r)).toBe(false);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns an error result for an invalid intent", async () => {
    const r = await processSingleItem({ area: "Manchester", intent: "bad" }, "u1");
    expect(isSuccess(r)).toBe(false);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe("processBatchItems", () => {
  it("preserves order and captures all three result types (success, validation error, generation failure)", async () => {
    // Bristol's generation rejects; allSettled + processSingleItem's catch turn
    // it into an error result rather than crashing the batch.
    mockGenerate.mockImplementation(async (area: string) => {
      if (area === "Bristol") throw new Error("engine boom");
      return { id: `rpt_${area}`, report: { area } as never };
    });

    const items = [
      { area: "Manchester", intent: "research" },  // success
      { area: "Leeds", intent: "bad" },            // validation error -> no generate
      { area: "Bristol", intent: "investing" },    // generation failure -> error result
    ];
    const results = await processBatchItems(items, "u1", 2);

    expect(results).toHaveLength(3);
    expect(isSuccess(results[0])).toBe(true);
    expect(isSuccess(results[1])).toBe(false);
    expect(isSuccess(results[2])).toBe(false);
    expect(results[0].area).toBe("Manchester");
    expect((results[2] as Extract<BatchResult, { error: string }>).error).toBe("engine boom");
    expect(mockGenerate).toHaveBeenCalledTimes(2); // Manchester + Bristol (Leeds failed validation)
  });
});
