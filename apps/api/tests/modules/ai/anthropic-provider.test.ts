import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { AnthropicAiProvider } from "@/modules/engine/ai/anthropic-provider";
import { getConfig } from "@/infrastructure/config";

/* We never call the real API here; just lock the constructor guard
   and the AR-383 model-pin behaviour. */

let savedKey: string | undefined;
let savedModel: string | undefined;

beforeEach(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  savedModel = process.env.ANTHROPIC_MODEL;
});
afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
  if (savedModel === undefined) delete process.env.ANTHROPIC_MODEL;
  else process.env.ANTHROPIC_MODEL = savedModel;
});

describe("AnthropicAiProvider", () => {
  it("throws when ANTHROPIC_API_KEY is missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new AnthropicAiProvider()).toThrow("Missing ANTHROPIC_API_KEY");
  });

  it("constructs when the key is present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-not-real";
    expect(() => new AnthropicAiProvider()).not.toThrow();
  });

  /* AR-383: model is read from config (env var ANTHROPIC_MODEL with a
     current-Sonnet default). This locks the default + override
     contract so the next retirement is an env tweak, not a redeploy. */
  it("defaults the model to a current, non-retired Sonnet", () => {
    delete process.env.ANTHROPIC_MODEL;
    expect(getConfig().anthropicModel).toBe("claude-sonnet-4-6");
  });

  it("honours an explicit ANTHROPIC_MODEL override", () => {
    process.env.ANTHROPIC_MODEL = "claude-opus-4-8";
    expect(getConfig().anthropicModel).toBe("claude-opus-4-8");
  });
});
