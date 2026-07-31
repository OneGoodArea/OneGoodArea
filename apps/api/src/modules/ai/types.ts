export interface AiProvider {
  generateNarrative(prompt: string): Promise<string>;
}

export interface AiProviderEntry {
  provider: string;
  model: string;
  params?: Record<string, unknown>;
}

export type AiStrategy = "round_robin" | "fallback_chain" | "list_pick";

export interface AiStrategyConfig {
  strategy: AiStrategy;
  providers: AiProviderEntry[];
}

export interface AiConfig {
  aiRetryCount: number;
  strategies: Record<string, AiStrategyConfig>;
}

/** A fully-resolved strategy route for one tier: the strategy, the provider
    chain, and the retry budget (aiRetryCount). Returned by decideLlm() and
    consumed by createStrategyProvider(). */
export interface AiStrategyRoute {
  strategy: AiStrategy;
  providers: AiProviderEntry[];
  retryCount: number;
}
