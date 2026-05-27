import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./bridge", () => ({ mintBridgeToken: vi.fn(async () => "minted.jwt.token") }));

import { callApi, apiBaseUrl } from "./api-client";
import { mintBridgeToken } from "./bridge";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  delete process.env.INTERNAL_API_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonRes(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  };
}

describe("apiBaseUrl", () => {
  it("defaults to the local apps/api port", () => {
    expect(apiBaseUrl()).toBe("http://localhost:4000");
  });

  it("uses INTERNAL_API_URL when set", () => {
    process.env.INTERNAL_API_URL = "https://api.internal";
    expect(apiBaseUrl()).toBe("https://api.internal");
  });
});

describe("callApi", () => {
  it("GETs with a minted bridge token and parses the JSON body", async () => {
    fetchMock.mockResolvedValue(jsonRes(200, { ok: true, areas: [] }));
    const res = await callApi("/watchlist", { userId: "user_1" });

    expect(mintBridgeToken).toHaveBeenCalledWith("user_1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4000/watchlist");
    expect(init.method).toBe("GET");
    expect(init.headers.authorization).toBe("Bearer minted.jwt.token");
    expect(init.body).toBeUndefined();
    expect(res).toEqual({ status: 200, ok: true, data: { ok: true, areas: [] } });
  });

  it("serialises a JSON body + sets content-type on writes", async () => {
    fetchMock.mockResolvedValue(jsonRes(201, { area: { id: "sa_1" } }));
    await callApi("/watchlist", { userId: "user_1", method: "POST", body: { postcode: "M1 1AE" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ postcode: "M1 1AE" }));
  });

  it("forwards extra headers (e.g. Idempotency-Key) + hits INTERNAL_API_URL", async () => {
    process.env.INTERNAL_API_URL = "https://api.internal";
    fetchMock.mockResolvedValue(jsonRes(200, {}));
    await callApi("/v1/report", {
      userId: "u",
      method: "POST",
      body: {},
      headers: { "idempotency-key": "abc" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.internal/v1/report");
    expect(init.headers["idempotency-key"]).toBe("abc");
  });

  it("relays non-2xx status + body (ok=false) instead of throwing", async () => {
    fetchMock.mockResolvedValue(jsonRes(404, { error: "Not found" }));
    const res = await callApi("/report/x", { userId: "u", method: "DELETE" });
    expect(res.status).toBe(404);
    expect(res.ok).toBe(false);
    expect(res.data).toEqual({ error: "Not found" });
  });

  it("returns null data for an empty response body", async () => {
    fetchMock.mockResolvedValue(jsonRes(204, undefined));
    const res = await callApi("/health", { userId: "u" });
    expect(res.data).toBeNull();
  });
});
