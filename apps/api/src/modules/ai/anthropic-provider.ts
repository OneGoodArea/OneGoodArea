import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../infrastructure/config";
import type { AiProvider } from "./types";

/* Migrated VERBATIM from legacy src/lib/ai/providers/anthropic-provider.ts.
   Reads ANTHROPIC_API_KEY from centralised config.

   AR-383: model is now read from getConfig().anthropicModel
   (env: ANTHROPIC_MODEL) with a current-Sonnet default. The previous
   hardcoded snapshot ID was retired by Anthropic, breaking every NL
   planner call with a 404 not_found_error. Configurable so future
   model retirements are a Render env-var change, not a code deploy. */

export class AnthropicAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly params: Partial<Anthropic.MessageCreateParamsNonStreaming>;

  /** AR-499/AR-614: optional model override for tier-based routing.
      When provided, uses this instead of the default from config.
      params (from the AI config provider entry) are spread into every
      messages.create call, so per-tier entries can set max_tokens etc. */
  constructor(modelOverride?: string, params?: Record<string, unknown>) {
    const config = getConfig();
    const apiKey = config.anthropicApiKey;

    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    this.client = new Anthropic({ apiKey });
    this.model = modelOverride ?? config.anthropicModel;
    this.params = params as Partial<Anthropic.MessageCreateParamsNonStreaming>;
  }

  async generateNarrative(prompt: string): Promise<string> {
    const args: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      ...this.params,
    };
    const response = await this.client.messages.create(args);

    const text = response.content.find((item) => item.type === "text");
    if (!text || text.type !== "text") {
      throw new Error("No text response from AI");
    }

    return text.text;
  }
}
