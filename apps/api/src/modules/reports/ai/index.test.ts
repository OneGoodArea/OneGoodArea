import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAiProvider } from "./index";
import { MockAiProvider } from "./mock-provider";

/* getAiProvider caches at module scope; this file makes a single selection so
   the cache is deterministic. The anthropic branch is covered by
   anthropic-provider.test.ts (constructor guard). */

beforeEach(() => {
  process.env.OGA_AI_PROVIDER = "mock";
});
afterEach(() => {
  delete process.env.OGA_AI_PROVIDER;
});

describe("getAiProvider", () => {
  it("selects the mock provider and caches the instance", () => {
    const a = getAiProvider();
    const b = getAiProvider();
    expect(a).toBeInstanceOf(MockAiProvider);
    expect(a).toBe(b);
  });
});
