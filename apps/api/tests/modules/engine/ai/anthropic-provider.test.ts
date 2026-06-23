import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { AnthropicAiProvider } from "@/modules/engine/ai/anthropic-provider";

/* We never call the real API here; just lock the constructor guard. */

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = saved;
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
});
