import { describe, it, expect } from "vitest";
import { getAiConfig, AiConfigSchema } from "@/modules/ai/config";
import { decideLlm, type Tier } from "@/modules/tiers/index";
import { createStrategyProvider } from "@/modules/ai/strategy-provider";
import { MockAiProvider } from "@/modules/ai/mock-provider";
import type { AiProviderEntry, AiStrategyRoute } from "@/modules/ai/types";

/* AR-617 (Plan 062 S6 / 064 Phase 3b): Docker-first integration test for the
   multi-provider AI config. Runs inside `make api-test-container` against the
   real config values and the keyless mock provider — no live API keys. */

const TIERS: readonly Tier[] = [
  "anonymous",
  "logged_in",
  "basic",
  "high_tier",
  "engineering",
  "superuser",
];

const VALID_STRATEGIES = new Set<AiStrategyRoute["strategy"]>([
  "round_robin",
  "fallback_chain",
  "list_pick",
]);

const KNOWN_PROVIDERS = new Set(["mock", "anthropic", "deepseek", "openrouter", "opencode"]);

describe("multi-provider AI config — container integration (AR-617)", () => {
  it("loads the real config and gives every tier a valid provider chain", () => {
    const cfg = getAiConfig();
    expect(AiConfigSchema.safeParse(cfg).success).toBe(true);

    for (const tier of TIERS) {
      const strategy = cfg.strategies[tier];
      expect(strategy, `tier ${tier} has a strategy`).toBeDefined();
      expect(strategy.providers.length, `tier ${tier} has providers`).toBeGreaterThan(0);
      for (const entry of strategy.providers) {
        expect(KNOWN_PROVIDERS.has(entry.provider), `tier ${tier} provider ${entry.provider}`).toBe(true);
        expect(entry.model.length).toBeGreaterThan(0);
      }
    }
  });

  it("decideLlm resolves every tier to a valid strategy route", () => {
    const config = getAiConfig();
    for (const tier of TIERS) {
      const route = decideLlm(tier);
      expect(VALID_STRATEGIES.has(route.strategy), `tier ${tier} strategy`).toBe(true);
      expect(route.providers.length).toBeGreaterThan(0);
      expect(route.providers).toEqual(config.strategies[tier].providers);
      expect(route.retryCount).toBe(config.aiRetryCount);
    }
  });

  it("instantiates every strategy wrapper with the mock provider and generates keyless", async () => {
    const mock: AiProviderEntry = { provider: "mock", model: "mock-model" };
    const routes: AiStrategyRoute[] = [
      { strategy: "round_robin", providers: [mock], retryCount: 1 },
      { strategy: "fallback_chain", providers: [mock], retryCount: 1 },
      { strategy: "list_pick", providers: [mock], retryCount: 1 },
    ];

    for (const route of routes) {
      const provider = createStrategyProvider(route);
      const out = await provider.generateNarrative("AREA: Manchester\nINTENT: investing\n");
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it("MockAiProvider instantiates and narrates without any API key", async () => {
    const provider = new MockAiProvider();
    const out = await provider.generateNarrative("AREA: Manchester\nINTENT: investing\n");
    expect(JSON.parse(out).area).toBe("Manchester");
  });
});
