import { describe, it, expect } from "vitest";
import { buildPlannerPrompt, extractJson, parsePlanText, plan, SUPPORTED_SIGNALS } from "@/modules/intelligence/planner";
import type { AiProvider } from "@/modules/engine/ai";

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
  it("teaches the model the compare_areas op (AR-266)", () => {
    const p = buildPlannerPrompt("compare M1 1AE and EC1A 1BB");
    expect(p).toContain("compare_areas");
    // Worked example must show array-of-2 form (not silent-drop).
    expect(p).toMatch(/"areas":\["M1 1AE","EC1A 1BB"\]/);
    // Explicit guidance against the silent-drop bug AR-266 is fixing.
    expect(p).toMatch(/NEVER use get_area and drop/);
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
  it("accepts a COMPOUND rank_areas plan with signals[] + sort_by (Increment 2)", () => {
    const compoundJson = JSON.stringify({
      op: "rank_areas",
      params: {
        signals: [
          { key: "property.median_price", filter: { lte: 250000 } },
          { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
          { key: "crime.total_12m", filter: { percentile_lte: 50 } },
        ],
        sort_by: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
        country: "England",
        limit: 50,
      },
    });
    const r = parsePlanText(compoundJson);
    expect(r.ok).toBe(true);
    if (r.ok && r.plan.op === "rank_areas" && "signals" in r.plan.params) {
      expect(r.plan.params.signals).toHaveLength(3);
      expect(r.plan.params.sort_by?.signal).toBe("property.price_change_pct_yoy");
    }
  });
  it("rejects a compound plan whose sort_by.signal isn't in signals[]", () => {
    const bad = JSON.stringify({
      op: "rank_areas",
      params: {
        signals: [{ key: "property.median_price", filter: { lte: 250000 } }],
        sort_by: { signal: "crime.total_12m", mode: "value", direction: "desc" },
      },
    });
    const r = parsePlanText(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_plan");
  });
  it("rejects a filter with two operators (strict single-key union)", () => {
    const bad = JSON.stringify({
      op: "rank_areas",
      params: { signals: [{ key: "x", filter: { lt: 5, gt: 1 } }] },
    });
    const r = parsePlanText(bad);
    expect(r.ok).toBe(false);
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
  it("accepts a compare_areas plan with 2..5 areas (AR-266)", () => {
    const r = parsePlanText('{"op":"compare_areas","params":{"areas":["M1 1AE","EC1A 1BB"]}}');
    expect(r.ok).toBe(true);
    if (r.ok && r.plan.op === "compare_areas") {
      expect(r.plan.params.areas).toEqual(["M1 1AE", "EC1A 1BB"]);
    }
  });
  it("rejects a compare_areas plan with only one area (AR-266: silent-drop prevention)", () => {
    const r = parsePlanText('{"op":"compare_areas","params":{"areas":["M1 1AE"]}}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_plan");
  });
  it("rejects a compare_areas plan with >5 areas (AR-266: cap to keep payload bounded)", () => {
    const r = parsePlanText('{"op":"compare_areas","params":{"areas":["A","B","C","D","E","F"]}}');
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
