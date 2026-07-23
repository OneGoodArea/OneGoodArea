import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/signals/query", () => ({ queryAreas: vi.fn(), queryAreasCompound: vi.fn() }));
vi.mock("@/modules/signals", () => ({ getAreaProfile: vi.fn() }));
vi.mock("@/modules/scoring", () => ({ scoreArea: vi.fn() }));
vi.mock("@/modules/engine/ai", () => ({ getAiProvider: vi.fn(), getAiProviderForTier: vi.fn() }));

import { runQuery, parseQueryRequest } from "@/modules/intelligence/index";
import { queryAreas } from "@/modules/signals/query";
import { getAreaProfile } from "@/modules/signals";
import { getAiProvider, getAiProviderForTier, type AiProvider } from "@/modules/engine/ai";

const mockQueryAreas = vi.mocked(queryAreas);
const mockGetAreaProfile = vi.mocked(getAreaProfile);
const mockGetAiProvider = vi.mocked(getAiProvider);
const mockGetAiProviderForTier = vi.mocked(getAiProviderForTier);

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
    const { queryAreasCompound } = await import("@/modules/signals/query");
    vi.mocked(queryAreasCompound).mockResolvedValue([]);
    const out = await runQuery({ question: "compound please" }, stub(compoundJson));
    expect(out.ok).toBe(true);
    expect(vi.mocked(queryAreasCompound)).toHaveBeenCalledOnce();
    if (out.ok) expect(out.response.plan_source).toBe("nl");
  });
});

describe("runQuery — default provider selection (AR-597, Plan 059.5)", () => {
  const providerStub: AiProvider = { generateNarrative: async () => '{"op":"get_area","params":{"area":"M1 1AE"}}' };

  beforeEach(() => {
    mockGetAreaProfile.mockResolvedValue(null);
    mockGetAiProvider.mockReturnValue(providerStub);
    mockGetAiProviderForTier.mockReturnValue(providerStub);
  });

  it("routes to getAiProviderForTier(tier) when no explicit aiProvider is passed", async () => {
    const out = await runQuery({ question: "tell me about M1 1AE" }, undefined, "high_tier");
    expect(out.ok).toBe(true);
    expect(mockGetAiProviderForTier).toHaveBeenCalledWith("high_tier");
    expect(mockGetAiProvider).not.toHaveBeenCalled();
  });

  it("falls back to the untiered getAiProvider() when neither aiProvider nor tier is given", async () => {
    const out = await runQuery({ question: "tell me about M1 1AE" });
    expect(out.ok).toBe(true);
    expect(mockGetAiProvider).toHaveBeenCalledOnce();
    expect(mockGetAiProviderForTier).not.toHaveBeenCalled();
  });

  it("an explicit aiProvider always wins over tier", async () => {
    const explicit: AiProvider = { generateNarrative: async () => '{"op":"get_area","params":{"area":"M1 1AE"}}' };
    const out = await runQuery({ question: "tell me about M1 1AE" }, explicit, "anonymous");
    expect(out.ok).toBe(true);
    expect(mockGetAiProvider).not.toHaveBeenCalled();
    expect(mockGetAiProviderForTier).not.toHaveBeenCalled();
  });

  it("surfaces a provider-construction failure for the given tier as llm_error", async () => {
    mockGetAiProviderForTier.mockImplementation(() => { throw new Error("ANTHROPIC_API_KEY missing"); });
    const out = await runQuery({ question: "tell me about M1 1AE" }, undefined, "anonymous");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe("llm_error");
  });
});
