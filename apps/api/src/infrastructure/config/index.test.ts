import { describe, it, expect, afterEach } from "vitest";
import { getConfig } from "./index";

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
