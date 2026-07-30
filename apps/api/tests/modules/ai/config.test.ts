import { describe, it, expect } from "vitest";
import { parseAiConfig, getAiConfig, AiConfigSchema } from "@/modules/ai/config";
import type { AiConfig } from "@/modules/ai/types";

const VALID_CONFIG: AiConfig = {
  aiRetryCount: 2,
  strategies: {
    test_tier: {
      strategy: "round_robin",
      providers: [
        { provider: "mock", model: "mock-model" },
      ],
    },
  },
};

describe("AiConfigSchema", () => {
  it("accepts a valid config", () => {
    const result = AiConfigSchema.parse(VALID_CONFIG);
    expect(result.aiRetryCount).toBe(2);
  });

  it("defaults aiRetryCount to 1 when omitted", () => {
    const result = AiConfigSchema.parse({
      strategies: {
        t: { strategy: "list_pick", providers: [{ provider: "a", model: "b" }] },
      },
    });
    expect(result.aiRetryCount).toBe(1);
  });

  it("rejects an unknown strategy", () => {
    expect(() =>
      AiConfigSchema.parse({
        aiRetryCount: 1,
        strategies: {
          t: { strategy: "invalid_strat", providers: [{ provider: "a", model: "b" }] },
        },
      }),
    ).toThrow();
  });

  it("rejects empty providers array", () => {
    expect(() =>
      AiConfigSchema.parse({
        aiRetryCount: 1,
        strategies: {
          t: { strategy: "list_pick", providers: [] },
        },
      }),
    ).toThrow();
  });

  it("accepts params on a provider entry", () => {
    const result = AiConfigSchema.parse({
      aiRetryCount: 1,
      strategies: {
        t: {
          strategy: "fallback_chain",
          providers: [{ provider: "anthropic", model: "claude-sonnet-4-5", params: { max_tokens: 8192 } }],
        },
      },
    });
    const entry = result.strategies.t.providers[0];
    expect(entry.params?.max_tokens).toBe(8192);
  });

  it("rejects negative aiRetryCount", () => {
    expect(() =>
      AiConfigSchema.parse({ ...VALID_CONFIG, aiRetryCount: -1 }),
    ).toThrow();
  });
});

describe("parseAiConfig", () => {
  it("parses and returns a valid config", () => {
    const cfg = parseAiConfig(VALID_CONFIG);
    expect(cfg.strategies.test_tier.providers[0].provider).toBe("mock");
  });
});

describe("getAiConfig", () => {
  it("returns the default config with all expected tiers", () => {
    const cfg = getAiConfig();
    const expected = ["anonymous", "logged_in", "basic", "high_tier", "engineering", "superuser"];
    for (const tier of expected) {
      expect(cfg.strategies[tier]).toBeDefined();
      expect(cfg.strategies[tier].providers.length).toBeGreaterThan(0);
    }
  });

  it("caches the config on subsequent calls", () => {
    const a = getAiConfig();
    const b = getAiConfig();
    expect(a).toBe(b);
  });

  it("each tier has a valid strategy", () => {
    const cfg = getAiConfig();
    const valid = new Set(["round_robin", "fallback_chain", "list_pick"]);
    for (const [tier, strat] of Object.entries(cfg.strategies)) {
      expect(valid.has(strat.strategy)).toBe(true);
    }
  });
});
