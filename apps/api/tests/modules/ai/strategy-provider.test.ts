import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStrategyProvider } from "@/modules/ai/strategy-provider";
import { getAiProviderForTier } from "@/modules/ai/provider-factory";
import type { AiProviderEntry, AiStrategyRoute } from "@/modules/ai/types";

const OPENCODE: AiProviderEntry = { provider: "opencode", model: "opencode-model" };
const OPENROUTER: AiProviderEntry = { provider: "openrouter", model: "openrouter-model" };

const ENV_KEYS = ["OPENCODE_API_KEY", "OPENROUTER_API_KEY", "DEEPSEEK_API_KEY"];

const okResponse = (content: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
  text: async () => "",
});

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.OPENCODE_API_KEY = "sk-opencode";
  process.env.OPENROUTER_API_KEY = "sk-openrouter";
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OGA_AI_PROVIDER;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  delete process.env.OGA_AI_PROVIDER;
  vi.unstubAllGlobals();
});

/** fetch stub that records URLs and fails for the given host substrings. */
function stubFetch(failHosts: string[] = []) {
  const calls: string[] = [];
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    calls.push(url);
    const failing = failHosts.find((host) => url.includes(host));
    if (failing) return Promise.reject(new Error(`${failing} down`));
    return Promise.resolve(okResponse(`ok-${calls.length}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

describe("fallback_chain", () => {
  it("starts at the first provider and falls through on error", async () => {
    const route: AiStrategyRoute = { strategy: "fallback_chain", providers: [OPENCODE, OPENROUTER], retryCount: 0 };
    const provider = createStrategyProvider(route);
    const { calls } = stubFetch(["opencode.ai"]);

    await expect(provider.generateNarrative("hi")).resolves.toBe("ok-2");

    expect(calls[0]).toContain("opencode.ai");
    expect(calls[1]).toContain("openrouter.ai");
  });

  it("skips an entry whose API key is missing", async () => {
    delete process.env.OPENCODE_API_KEY;
    const route: AiStrategyRoute = { strategy: "fallback_chain", providers: [OPENCODE, OPENROUTER], retryCount: 0 };
    const provider = createStrategyProvider(route);
    const { fetchMock } = stubFetch();

    await expect(provider.generateNarrative("hi")).resolves.toBe("ok-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("openrouter.ai");
  });

  it("rethrows the last error when every provider fails", async () => {
    const route: AiStrategyRoute = { strategy: "fallback_chain", providers: [OPENCODE, OPENROUTER], retryCount: 0 };
    const provider = createStrategyProvider(route);
    const { fetchMock } = stubFetch(["opencode.ai", "openrouter.ai"]);

    await expect(provider.generateNarrative("hi")).rejects.toThrow("openrouter.ai down");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passes provider entry params through to the underlying provider", async () => {
    const entry: AiProviderEntry = { provider: "opencode", model: "m", params: { max_tokens: 8192 } };
    const route: AiStrategyRoute = { strategy: "fallback_chain", providers: [entry], retryCount: 0 };
    const provider = createStrategyProvider(route);
    const { fetchMock } = stubFetch();

    await provider.generateNarrative("hi");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('"max_tokens":8192') }),
    );
  });
});

describe("round_robin", () => {
  it("rotates across providers on successive calls", async () => {
    const route: AiStrategyRoute = { strategy: "round_robin", providers: [OPENCODE, OPENROUTER], retryCount: 0 };
    const provider = createStrategyProvider(route);
    const { calls } = stubFetch();

    await expect(provider.generateNarrative("hi")).resolves.toBe("ok-1");
    await expect(provider.generateNarrative("hi")).resolves.toBe("ok-2");

    expect(calls[0]).toContain("opencode.ai");
    expect(calls[1]).toContain("openrouter.ai");
  });

  it("retries the next provider on error up to aiRetryCount", async () => {
    const route: AiStrategyRoute = { strategy: "round_robin", providers: [OPENCODE, OPENROUTER], retryCount: 1 };
    const provider = createStrategyProvider(route);
    const { fetchMock, calls } = stubFetch(["opencode.ai"]);

    await expect(provider.generateNarrative("hi")).resolves.toBe("ok-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calls[0]).toContain("opencode.ai");
    expect(calls[1]).toContain("openrouter.ai");
  });

  it("rethrows after exhausting retries", async () => {
    const route: AiStrategyRoute = { strategy: "round_robin", providers: [OPENCODE, OPENROUTER], retryCount: 1 };
    const provider = createStrategyProvider(route);
    const { fetchMock } = stubFetch(["opencode.ai", "openrouter.ai"]);

    await expect(provider.generateNarrative("hi")).rejects.toThrow("openrouter.ai down");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("list_pick", () => {
  it("always uses the first provider and does not fall back", async () => {
    const route: AiStrategyRoute = { strategy: "list_pick", providers: [OPENCODE, OPENROUTER], retryCount: 1 };
    const provider = createStrategyProvider(route);
    const { fetchMock } = stubFetch(["opencode.ai"]);

    await expect(provider.generateNarrative("hi")).rejects.toThrow("opencode.ai down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getAiProviderForTier", () => {
  it("resolves a tier to its configured strategy chain", async () => {
    const { calls } = stubFetch();

    const provider = getAiProviderForTier("anonymous");
    await provider.generateNarrative("hi");

    expect(calls[0]).toContain("opencode.ai");
  });

  it("still honours the mock env shortcut for test stacks", () => {
    process.env.OGA_AI_PROVIDER = "mock";
    const provider = getAiProviderForTier("anonymous");
    expect(provider.constructor.name).toBe("MockAiProvider");
  });
});
