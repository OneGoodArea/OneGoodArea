import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenAiCompatibleProvider, type OpenAiCompatibleProviderConfig } from "@/modules/ai/openai-compatible-provider";

const config: OpenAiCompatibleProviderConfig = {
  name: "TestAI",
  envPrefix: "TESTAI",
  defaultBaseUrl: "https://api.test.example/v1",
  defaultModel: "test-model",
  defaultMaxTokens: 4096,
};

const ENV_KEYS = ["TESTAI_API_KEY", "TESTAI_BASE_URL", "TESTAI_MODEL", "TESTAI_MAX_TOKENS"];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

const okResponse = (content: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
  text: async () => "",
});

describe("OpenAiCompatibleProvider", () => {
  it("throws when the provider API key is missing", () => {
    expect(() => new OpenAiCompatibleProvider(config)).toThrow("Missing TESTAI_API_KEY");
  });

  it("constructs when the key is present", () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    expect(() => new OpenAiCompatibleProvider(config)).not.toThrow();
  });

  it("posts to the OpenAI-compatible endpoint and returns the message text", async () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    const provider = new OpenAiCompatibleProvider(config);
    const fetchMock = vi.fn().mockResolvedValue(okResponse("hello world"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(provider.generateNarrative("write something")).resolves.toBe("hello world");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.example/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer sk-test-not-real",
        },
        body: JSON.stringify({
          model: "test-model",
          max_tokens: 4096,
          messages: [{ role: "user", content: "write something" }],
        }),
      },
    );
  });

  it("reads env overrides for base URL, model and max tokens into the request", async () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    process.env.TESTAI_BASE_URL = "https://override.example";
    process.env.TESTAI_MODEL = "override-model";
    process.env.TESTAI_MAX_TOKENS = "1024";
    const provider = new OpenAiCompatibleProvider(config);
    const fetchMock = vi.fn().mockResolvedValue(okResponse("x"));
    vi.stubGlobal("fetch", fetchMock);

    await provider.generateNarrative("hi");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.example/chat/completions",
      expect.objectContaining({
        body: JSON.stringify({
          model: "override-model",
          max_tokens: 1024,
          messages: [{ role: "user", content: "hi" }],
        }),
      }),
    );
  });

  it("gives the model override precedence over the env model", async () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    process.env.TESTAI_MODEL = "env-model";
    const provider = new OpenAiCompatibleProvider(config, "override-model");
    const fetchMock = vi.fn().mockResolvedValue(okResponse("x"));
    vi.stubGlobal("fetch", fetchMock);

    await provider.generateNarrative("hi");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('"model":"override-model"') }),
    );
  });

  it("spreads params into the request body", async () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    const provider = new OpenAiCompatibleProvider(config, undefined, { max_tokens: 8192, temperature: 0.2 });
    const fetchMock = vi.fn().mockResolvedValue(okResponse("x"));
    vi.stubGlobal("fetch", fetchMock);

    await provider.generateNarrative("hi");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"max_tokens":8192'),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"temperature":0.2'),
      }),
    );
  });

  it("surfaces non-ok responses with the provider name, status and body", async () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    const provider = new OpenAiCompatibleProvider(config);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
      text: async () => "rate limited",
    }));

    await expect(provider.generateNarrative("hi")).rejects.toThrow("TestAI API error 429: rate limited");
  });

  it("rejects when the response contains no text", async () => {
    process.env.TESTAI_API_KEY = "sk-test-not-real";
    const provider = new OpenAiCompatibleProvider(config);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse("")));

    await expect(provider.generateNarrative("hi")).rejects.toThrow("No text response from TestAI");
  });
});
