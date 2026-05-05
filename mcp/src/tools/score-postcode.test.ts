import { describe, it, expect, vi } from "vitest";
import {
  scorePostcodeToolDef,
  parseScorePostcodeArgs,
  formatScoreResultAsText,
  executeScorePostcode,
} from "./score-postcode.js";
import { OogaApiClient, OogaApiError } from "../api-client.js";

describe("scorePostcodeToolDef (MCP tool definition)", () => {
  it("has the required MCP fields", () => {
    expect(scorePostcodeToolDef.name).toBe("score_postcode");
    expect(typeof scorePostcodeToolDef.description).toBe("string");
    expect(scorePostcodeToolDef.description.length).toBeGreaterThan(50);
    expect(scorePostcodeToolDef.inputSchema.type).toBe("object");
  });

  it("requires postcode and intent", () => {
    expect(scorePostcodeToolDef.inputSchema.required).toEqual(["postcode", "intent"]);
  });

  it("intent enum matches the four supported values", () => {
    expect(scorePostcodeToolDef.inputSchema.properties.intent.enum).toEqual([
      "moving",
      "business",
      "investing",
      "research",
    ]);
  });

  it("rejects additional properties so the LLM can't pass random extras", () => {
    expect(scorePostcodeToolDef.inputSchema.additionalProperties).toBe(false);
  });
});

describe("parseScorePostcodeArgs", () => {
  it("accepts valid args", () => {
    expect(parseScorePostcodeArgs({ postcode: "M1 1AE", intent: "moving" })).toEqual({
      postcode: "M1 1AE",
      intent: "moving",
    });
  });

  it("trims whitespace from postcode", () => {
    expect(parseScorePostcodeArgs({ postcode: "  M1 1AE  ", intent: "investing" }).postcode).toBe(
      "M1 1AE",
    );
  });

  it("rejects non-object input", () => {
    expect(() => parseScorePostcodeArgs(null)).toThrow();
    expect(() => parseScorePostcodeArgs("M1 1AE")).toThrow();
  });

  it("rejects empty postcode", () => {
    expect(() => parseScorePostcodeArgs({ postcode: "", intent: "moving" })).toThrow(/postcode/);
    expect(() => parseScorePostcodeArgs({ postcode: "   ", intent: "moving" })).toThrow(/postcode/);
  });

  it("rejects postcode over 100 chars", () => {
    expect(() =>
      parseScorePostcodeArgs({ postcode: "x".repeat(101), intent: "moving" }),
    ).toThrow(/100/);
  });

  it("rejects unsupported intent", () => {
    expect(() =>
      parseScorePostcodeArgs({ postcode: "M1 1AE", intent: "origination" }),
    ).toThrow(/intent/);
    expect(() =>
      parseScorePostcodeArgs({ postcode: "M1 1AE", intent: 42 }),
    ).toThrow(/intent/);
  });
});

describe("formatScoreResultAsText", () => {
  const sample = {
    area: "Manchester",
    intent: "moving" as const,
    areaiq_score: 84,
    engine_version: "2.0.0",
    area_type: "suburban" as const,
    sub_scores: [
      {
        label: "Safety & Crime",
        score: 80,
        weight: 25,
        summary: "Low violent crime",
        reasoning: "10 crimes over 3 months",
        confidence: 0.85,
      },
      {
        label: "Schools & Education",
        score: 95,
        weight: 20,
        summary: "Excellent schools",
        reasoning: "25 schools within 1.5km",
      },
    ],
    summary: "Manchester scores 84/100 for moving home.",
    sections: [],
    recommendations: ["Visit before deciding", "Compare against Salford"],
    data_sources: ["Police.uk", "Ofsted"],
    generated_at: "2026-05-05T10:00:00Z",
  };

  it("renders headline with score and intent", () => {
    const text = formatScoreResultAsText(sample);
    expect(text).toContain("Manchester · moving · 84/100");
  });

  it("includes engine version when present", () => {
    expect(formatScoreResultAsText(sample)).toContain("Engine version: 2.0.0");
  });

  it("includes confidence on dimensions when present", () => {
    expect(formatScoreResultAsText(sample)).toContain("confidence 85%");
  });

  it("omits confidence when missing on a dimension", () => {
    const text = formatScoreResultAsText(sample);
    expect(text).toContain("Schools & Education**: 95/100 (weight 20%)");
  });

  it("includes recommendations when present", () => {
    const text = formatScoreResultAsText(sample);
    expect(text).toContain("## Recommendations");
    expect(text).toContain("Visit before deciding");
  });

  it("omits recommendations section when empty", () => {
    const text = formatScoreResultAsText({ ...sample, recommendations: [] });
    expect(text).not.toContain("## Recommendations");
  });

  it("includes data sources joined with separator", () => {
    expect(formatScoreResultAsText(sample)).toContain("Police.uk · Ofsted");
  });
});

describe("executeScorePostcode", () => {
  function makeClient(scoreAreaImpl: () => Promise<unknown>): OogaApiClient {
    const client = new OogaApiClient({ apiKey: "aiq_test" });
    // Replace the network method with a stub
    (client as unknown as { scoreArea: () => Promise<unknown> }).scoreArea = scoreAreaImpl;
    return client;
  }

  it("returns formatted text on success", async () => {
    const client = makeClient(async () => ({
      area: "Manchester",
      intent: "moving",
      areaiq_score: 84,
      sub_scores: [],
      summary: "Strong fit.",
      sections: [],
      recommendations: [],
      data_sources: ["Police.uk"],
      generated_at: "2026-05-05T10:00:00Z",
    }));

    const out = await executeScorePostcode(client, { postcode: "M1 1AE", intent: "moving" });
    expect(out.isError).toBeFalsy();
    expect(out.content[0].type).toBe("text");
    expect(out.content[0].text).toContain("Manchester");
    expect(out.content[0].text).toContain("84/100");
  });

  it("returns isError + readable message on API auth failure", async () => {
    const client = makeClient(async () => {
      throw new OogaApiError("Invalid or revoked API key", 401);
    });

    const out = await executeScorePostcode(client, { postcode: "M1 1AE", intent: "moving" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("HTTP 401");
    expect(out.content[0].text).toContain("Invalid or revoked API key");
  });

  it("returns isError + readable message on quota exceeded (HTTP 403)", async () => {
    const client = makeClient(async () => {
      throw new OogaApiError("Monthly report limit reached", 403);
    });

    const out = await executeScorePostcode(client, { postcode: "M1 1AE", intent: "moving" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("HTTP 403");
  });

  it("returns isError on unexpected error type", async () => {
    const client = makeClient(async () => {
      throw new Error("Network exploded");
    });

    const out = await executeScorePostcode(client, { postcode: "M1 1AE", intent: "moving" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("Network exploded");
  });
});
