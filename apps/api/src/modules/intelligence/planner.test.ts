import { describe, it, expect } from "vitest";
import { buildPlannerPrompt, extractJson, parsePlanText, plan, SUPPORTED_SIGNALS } from "./planner";
import type { AiProvider } from "../reports/ai";

describe("buildPlannerPrompt", () => {
  it("embeds every supported signal so the model can only pick real keys", () => {
    const p = buildPlannerPrompt("anything");
    for (const key of SUPPORTED_SIGNALS) expect(p).toContain(key);
  });
  it("includes the user's question verbatim at the end", () => {
    expect(buildPlannerPrompt("where are the cheapest places to buy?")).toMatch(/where are the cheapest places to buy\?\s*$/);
  });
  it("instructs the model to output JSON only (no narrative)", () => {
    const p = buildPlannerPrompt("x");
    expect(p).toMatch(/output ONLY the JSON/i);
    expect(p).toMatch(/No prose/i);
  });
});

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"op":"get_area","params":{"area":"M1 1AE"}}')).toEqual({ op: "get_area", params: { area: "M1 1AE" } });
  });
  it("strips ```json fences", () => {
    const out = extractJson('```json\n{"op":"get_area","params":{"area":"X"}}\n```');
    expect(out).toEqual({ op: "get_area", params: { area: "X" } });
  });
  it("tolerates leading prose by locating the JSON object", () => {
    const out = extractJson('Sure! Here you go:\n{"op":"get_area","params":{"area":"X"}}\nlet me know.');
    expect(out).toEqual({ op: "get_area", params: { area: "X" } });
  });
  it("returns null when there is no JSON to find", () => {
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("")).toBeNull();
  });
  it("returns null on malformed JSON", () => {
    expect(extractJson("{not json}")).toBeNull();
  });
});

describe("parsePlanText (strict)", () => {
  it("accepts a valid rank_areas plan", () => {
    const r = parsePlanText('{"op":"rank_areas","params":{"signal":"deprivation.imd_decile","country":"England","sort":"value","limit":10}}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.plan.op).toBe("rank_areas");
  });
  it("rejects an unknown op", () => {
    const r = parsePlanText('{"op":"do_a_thing","params":{}}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_plan");
  });
  it("rejects unknown params (strict objects)", () => {
    const r = parsePlanText('{"op":"get_area","params":{"area":"M1 1AE","mode":"verbose"}}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_plan");
  });
  it("rejects an out-of-range percentile", () => {
    const r = parsePlanText('{"op":"rank_areas","params":{"signal":"crime.total_12m","max_percentile":150}}');
    expect(r.ok).toBe(false);
  });
  it("returns no_json when the LLM returned prose only", () => {
    const r = parsePlanText("I think the best area is Manchester.");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("no_json");
  });
  it("carries the raw LLM output in the error (for transparency)", () => {
    const raw = '{"op":"nope"}';
    const r = parsePlanText(raw);
    if (!r.ok) expect(r.error.raw).toBe(raw);
  });
});

describe("plan (with a stub AiProvider)", () => {
  const stub = (text: string): AiProvider => ({ generateNarrative: async () => text });

  it("returns a typed plan for a sane LLM response", async () => {
    const out = await plan("most deprived LSOAs in Manchester", stub('{"op":"rank_areas","params":{"signal":"deprivation.imd_decile","lad":"E08000003","sort":"value","limit":10}}'));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.plan).toMatchObject({ op: "rank_areas", params: { lad: "E08000003" } });
  });
  it("returns llm_error when the provider throws", async () => {
    const out = await plan("x", { generateNarrative: async () => { throw new Error("rate limited"); } });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("llm_error");
  });
  it("returns invalid_plan when the LLM emits an unknown op", async () => {
    const out = await plan("x", stub('{"op":"nope","params":{}}'));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("invalid_plan");
  });
});
