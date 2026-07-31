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
