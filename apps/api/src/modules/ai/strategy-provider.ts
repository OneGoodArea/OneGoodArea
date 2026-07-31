import { AnthropicAiProvider } from "./anthropic-provider";
import { createDeepSeekProvider } from "./deepseek-provider";
import { createOpenRouterProvider } from "./openrouter-provider";
import { createOpenCodeProvider } from "./opencode-provider";
import { MockAiProvider } from "./mock-provider";
import type { AiProvider, AiProviderEntry, AiStrategyRoute } from "./types";

/* AR-614 (Plan 062 S3): strategy-based provider selection.

   Wraps a list of provider entries with one of three strategies:
     - round_robin:    rotate across entries per call; on error retry with the
                       next entry (up to route.retryCount retries).
     - fallback_chain: always start at entry 0; walk forward on error.
     - list_pick:      always use entry 0, no fallback.

   Providers are constructed lazily inside generateNarrative so an entry whose
   API key is missing (the constructor throws) is simply skipped by the
   fallback chain — matching the "cheap first, expensive fallback" design.
   When every entry fails, the last error is rethrown; callers (e.g. the
   planner) map it to a typed llm_error. */

function createProvider(entry: AiProviderEntry): AiProvider {
  switch (entry.provider) {
    case "mock":
      return new MockAiProvider();
    case "anthropic":
      return new AnthropicAiProvider(entry.model, entry.params);
    case "deepseek":
      return createDeepSeekProvider(entry.model, entry.params);
    case "openrouter":
      return createOpenRouterProvider(entry.model, entry.params);
    case "opencode":
      return createOpenCodeProvider(entry.model, entry.params);
    default:
      throw new Error(`Unknown AI provider: ${entry.provider}`);
  }
}

class RoundRobinStrategy implements AiProvider {
  private cursor = 0;

  constructor(private readonly route: AiStrategyRoute) {}

  async generateNarrative(prompt: string): Promise<string> {
    let lastError: unknown;
    const attempts = this.route.retryCount + 1;
    const count = this.route.providers.length;

    for (let index = 0; index < attempts; index += 1) {
      const entry = this.route.providers[this.cursor % count];
      this.cursor += 1;
      try {
        return await createProvider(entry).generateNarrative(prompt);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

class FallbackChainStrategy implements AiProvider {
  constructor(private readonly route: AiStrategyRoute) {}

  async generateNarrative(prompt: string): Promise<string> {
    let lastError: unknown;

    for (const entry of this.route.providers) {
      try {
        return await createProvider(entry).generateNarrative(prompt);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

class ListPickStrategy implements AiProvider {
  constructor(private readonly route: AiStrategyRoute) {}

  async generateNarrative(prompt: string): Promise<string> {
    return createProvider(this.route.providers[0]).generateNarrative(prompt);
  }
}

/** Build an AiProvider that honours the given strategy route. */
export function createStrategyProvider(route: AiStrategyRoute): AiProvider {
  switch (route.strategy) {
    case "round_robin":
      return new RoundRobinStrategy(route);
    case "fallback_chain":
      return new FallbackChainStrategy(route);
    case "list_pick":
      return new ListPickStrategy(route);
    default: {
      const exhaustive: never = route.strategy;
      throw new Error(`Unknown AI strategy: ${exhaustive}`);
    }
  }
}
