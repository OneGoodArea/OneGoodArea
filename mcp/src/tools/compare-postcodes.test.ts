import { describe, it, expect } from "vitest";
import {
  comparePostcodesToolDef,
  parseComparePostcodesArgs,
  formatComparisonAsText,
  executeComparePostcodes,
} from "./compare-postcodes.js";
import { OogaApiClient, OogaApiError } from "../api-client.js";

describe("comparePostcodesToolDef", () => {
  it("declares postcodes as array with min 2 / max 8", () => {
    expect(comparePostcodesToolDef.inputSchema.properties.postcodes.minItems).toBe(2);
    expect(comparePostcodesToolDef.inputSchema.properties.postcodes.maxItems).toBe(8);
  });

  it("requires both postcodes and intent", () => {
    expect(comparePostcodesToolDef.inputSchema.required).toEqual(["postcodes", "intent"]);
  });
});

describe("parseComparePostcodesArgs", () => {
  it("accepts valid args", () => {
    expect(parseComparePostcodesArgs({ postcodes: ["M1 1AE", "SW4 0LG"], intent: "moving" })).toEqual({
      postcodes: ["M1 1AE", "SW4 0LG"],
      intent: "moving",
    });
  });

  it("trims each postcode", () => {
    const out = parseComparePostcodesArgs({ postcodes: ["  M1 1AE  ", "SW4 0LG"], intent: "moving" });
    expect(out.postcodes).toEqual(["M1 1AE", "SW4 0LG"]);
  });

  it("rejects fewer than 2 postcodes", () => {
    expect(() => parseComparePostcodesArgs({ postcodes: ["M1 1AE"], intent: "moving" })).toThrow(/at least 2/);
  });

  it("rejects more than 8 postcodes", () => {
    const tooMany = Array(9).fill("M1 1AE");
    expect(() => parseComparePostcodesArgs({ postcodes: tooMany, intent: "moving" })).toThrow(/at most 8/);
  });

  it("rejects empty postcode in array", () => {
    expect(() => parseComparePostcodesArgs({ postcodes: ["M1 1AE", ""], intent: "moving" })).toThrow();
  });

  it("rejects unsupported intent", () => {
    expect(() =>
      parseComparePostcodesArgs({ postcodes: ["M1 1AE", "SW4 0LG"], intent: "garbage" }),
    ).toThrow(/intent/);
  });

  it("rejects non-array postcodes", () => {
    expect(() =>
      parseComparePostcodesArgs({ postcodes: "M1 1AE", intent: "moving" }),
    ).toThrow(/array/);
  });
});

describe("formatComparisonAsText", () => {
  it("sorts successful results by descending score", () => {
    const text = formatComparisonAsText(
      [
        { postcode: "A", score: 70, result: { areaiq_score: 70, sub_scores: [], summary: "Lower score area." } as never, error: null },
        { postcode: "B", score: 90, result: { areaiq_score: 90, sub_scores: [], summary: "Higher score area." } as never, error: null },
      ],
      "moving",
    );
    const aIdx = text.indexOf("| 1 | B |");
    const bIdx = text.indexOf("| 2 | A |");
    expect(aIdx).toBeGreaterThan(-1);
    expect(bIdx).toBeGreaterThan(aIdx);
  });

  it("places errors at the bottom", () => {
    const text = formatComparisonAsText(
      [
        { postcode: "BAD", score: null, result: null, error: "404" },
        { postcode: "A", score: 50, result: { areaiq_score: 50, sub_scores: [], summary: "OK area." } as never, error: null },
      ],
      "moving",
    );
    const aIdx = text.indexOf("| 1 | A |");
    const errIdx = text.indexOf("BAD | ERROR");
    expect(aIdx).toBeLessThan(errIdx);
  });

  it("includes engine version footer when first success has it", () => {
    const text = formatComparisonAsText(
      [
        { postcode: "A", score: 80, result: { areaiq_score: 80, sub_scores: [], summary: ".", engine_version: "2.0.0" } as never, error: null },
      ],
      "investing",
    );
    expect(text).toContain("Engine version: 2.0.0");
  });
});

describe("executeComparePostcodes", () => {
  function makeClient(impl: (postcode: string) => Promise<unknown>): OogaApiClient {
    const client = new OogaApiClient({ apiKey: "aiq_test" });
    (client as unknown as { scoreArea: (p: string) => Promise<unknown> }).scoreArea = impl;
    return client;
  }

  it("returns combined comparison text on full success", async () => {
    const client = makeClient(async (p) => ({
      area: p,
      intent: "moving",
      areaiq_score: p === "M1 1AE" ? 84 : 71,
      sub_scores: [],
      summary: `${p} summary.`,
      sections: [],
      recommendations: [],
      data_sources: ["Police.uk"],
      generated_at: "2026-05-05T10:00:00Z",
    }));

    const out = await executeComparePostcodes(client, {
      postcodes: ["M1 1AE", "SW4 0LG"],
      intent: "moving",
    });
    expect(out.isError).toBeFalsy();
    expect(out.content[0].text).toContain("M1 1AE");
    expect(out.content[0].text).toContain("SW4 0LG");
    expect(out.content[0].text).toContain("84/100");
  });

  it("returns partial success when some calls fail", async () => {
    const client = makeClient(async (p) => {
      if (p === "BAD") throw new OogaApiError("Invalid postcode", 400);
      return {
        area: p, intent: "moving", areaiq_score: 70,
        sub_scores: [], summary: "ok",
        sections: [], recommendations: [], data_sources: [],
        generated_at: "2026-05-05T10:00:00Z",
      };
    });

    const out = await executeComparePostcodes(client, {
      postcodes: ["M1 1AE", "BAD"],
      intent: "moving",
    });
    expect(out.isError).toBeFalsy(); // partial success isn't isError
    expect(out.content[0].text).toContain("M1 1AE");
    expect(out.content[0].text).toContain("HTTP 400");
  });

  it("flags isError when ALL calls fail", async () => {
    const client = makeClient(async () => {
      throw new OogaApiError("Quota exceeded", 403);
    });

    const out = await executeComparePostcodes(client, {
      postcodes: ["A", "B"],
      intent: "moving",
    });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("HTTP 403");
  });
});
