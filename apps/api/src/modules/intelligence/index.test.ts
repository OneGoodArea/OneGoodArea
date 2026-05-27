import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../signals/query", () => ({ queryAreas: vi.fn(), queryAreasCompound: vi.fn() }));
vi.mock("../signals", () => ({ getAreaProfile: vi.fn() }));
vi.mock("../scoring", () => ({ scoreArea: vi.fn() }));

import { runQuery, parseQueryRequest } from "./index";
import { queryAreas } from "../signals/query";
import { getAreaProfile } from "../signals";
import type { AiProvider } from "../reports/ai";

const mockQueryAreas = vi.mocked(queryAreas);
const mockGetAreaProfile = vi.mocked(getAreaProfile);

beforeEach(() => { vi.clearAllMocks(); });

describe("parseQueryRequest (strict)", () => {
  it("accepts a question", () => {
    const r = parseQueryRequest({ question: "most deprived LSOAs in Manchester" });
    expect(r.ok).toBe(true);
  });
  it("accepts a pre-built plan", () => {
    const r = parseQueryRequest({ plan: { op: "get_area", params: { area: "M1 1AE" } } });
    expect(r.ok).toBe(true);
  });
  it("rejects both fields at once", () => {
    const r = parseQueryRequest({ question: "x", plan: { op: "get_area", params: { area: "M1 1AE" } } });
    expect(r.ok).toBe(false);
  });
  it("rejects neither field", () => {
    expect(parseQueryRequest({}).ok).toBe(false);
  });
  it("rejects an empty question", () => {
    expect(parseQueryRequest({ question: "" }).ok).toBe(false);
  });
});

describe("runQuery — PROGRAMMATIC mode ({plan}) SKIPS the LLM", () => {
  it("never touches the AiProvider for a {plan} request", async () => {
    mockGetAreaProfile.mockResolvedValue(null);
    const provider: AiProvider = { generateNarrative: vi.fn().mockResolvedValue("SHOULD NOT BE CALLED") };
    const out = await runQuery({ plan: { op: "get_area", params: { area: "M1 1AE" } } }, provider);
    expect(out.ok).toBe(true);
    expect(provider.generateNarrative).not.toHaveBeenCalled();
    if (out.ok) expect(out.response.plan_source).toBe("client");
  });

  it("dispatches a pre-built rank_areas plan through queryAreas", async () => {
    mockQueryAreas.mockResolvedValue([
      { geo_type: "lsoa", geo_code: "E01000001", value: 1, normalized_value: 0.05, percentile: 5 },
    ]);
    const out = await runQuery({ plan: { op: "rank_areas", params: { signal: "deprivation.imd_decile", limit: 5 } } });
    expect(out.ok).toBe(true);
    expect(mockQueryAreas).toHaveBeenCalledOnce();
    if (out.ok && out.response.plan.op === "rank_areas") expect(out.response.results).toHaveLength(1);
  });
});

describe("runQuery — NL mode ({question}) plans then executes", () => {
  const stub = (text: string): AiProvider => ({ generateNarrative: async () => text });

  it("translates a question -> plan -> execution, marking plan_source=nl", async () => {
    mockGetAreaProfile.mockResolvedValue(null);
    const out = await runQuery(
      { question: "tell me about M1 1AE" },
      stub('{"op":"get_area","params":{"area":"M1 1AE"}}'),
    );
    expect(out.ok).toBe(true);
    expect(mockGetAreaProfile).toHaveBeenCalledWith("M1 1AE");
    if (out.ok) {
      expect(out.response.plan_source).toBe("nl");
      expect(out.response.plan).toMatchObject({ op: "get_area", params: { area: "M1 1AE" } });
    }
  });

  it("surfaces a planner error (invalid plan) as a typed failure", async () => {
    const out = await runQuery({ question: "x" }, stub('{"op":"do_a_thing"}'));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("invalid_plan");
  });

  it("surfaces an LLM error as llm_error", async () => {
    const out = await runQuery(
      { question: "x" },
      { generateNarrative: async () => { throw new Error("timeout"); } },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("llm_error");
  });

  it("a compound NL plan from the stub flows through executor as plan_source=nl", async () => {
    const compoundJson = JSON.stringify({
      op: "rank_areas",
      params: {
        signals: [
          { key: "property.median_price", filter: { lte: 250000 } },
          { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
        ],
        sort_by: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
        country: "England",
        limit: 5,
      },
    });
    // Wire the compound branch of executor so we can assert it was reached.
    const { queryAreasCompound } = await import("../signals/query");
    vi.mocked(queryAreasCompound).mockResolvedValue([]);
    const out = await runQuery({ question: "compound please" }, stub(compoundJson));
    expect(out.ok).toBe(true);
    expect(vi.mocked(queryAreasCompound)).toHaveBeenCalledOnce();
    if (out.ok) expect(out.response.plan_source).toBe("nl");
  });
});
