import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getConfig } from "@/infrastructure/config/index";

// Hermetic: the container test env (compose.test.yml) sets OGA_AI_PROVIDER=mock,
// so clear it before each test — the default-value test must not see ambient env.
beforeEach(() => {
  delete process.env.OGA_AI_PROVIDER;
});

afterEach(() => {
  delete process.env.OGA_AI_PROVIDER;
});

describe("getConfig", () => {
  it("defaults aiProvider to anthropic", () => {
    expect(getConfig().aiProvider).toBe("anthropic");
  });

  it("reads OGA_AI_PROVIDER from the environment", () => {
    process.env.OGA_AI_PROVIDER = "mock";
    expect(getConfig().aiProvider).toBe("mock");
  });
});
