import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/api-keys", () => ({
  validateApiKey: vi.fn(),
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  setApiKeyTrainingOptout: vi.fn(),
}));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { createApiKey, listApiKeys, revokeApiKey, setApiKeyTrainingOptout } from "@/modules/api-keys";
import { hasApiAccess } from "@/modules/usage";

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockCreate = vi.mocked(createApiKey);
const mockList = vi.mocked(listApiKeys);
const mockRevoke = vi.mocked(revokeApiKey);
const mockSetOptout = vi.mocked(setApiKeyTrainingOptout);
const mockApiAccess = vi.mocked(hasApiAccess);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
  mockApiAccess.mockResolvedValue(true);
});

describe("GET /keys", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/keys" })).statusCode).toBe(401);
  });

  it("lists the caller's keys", async () => {
    mockList.mockResolvedValue([{ id: "key_1", name: "Default" }] as never);
    const res = await app.inject({ method: "GET", url: "/keys", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().keys).toEqual([{ id: "key_1", name: "Default" }]);
    expect(mockList).toHaveBeenCalledWith("user_1");
  });
});

describe("POST /keys", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/keys", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await app.inject({ method: "POST", url: "/keys", headers: AUTH, payload: JSON.stringify({ name: "CI" }) });
    expect(res.statusCode).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a key with the given name and returns it", async () => {
    mockCreate.mockResolvedValue({ id: "key_1", key: "oga_secret", name: "CI" } as never);
    const res = await app.inject({ method: "POST", url: "/keys", headers: AUTH, payload: JSON.stringify({ name: "CI" }) });
    expect(res.statusCode).toBe(200);
    expect(res.json().key).toEqual({ id: "key_1", key: "oga_secret", name: "CI" });
    expect(mockCreate).toHaveBeenCalledWith("user_1", "CI");
  });

  it("defaults the name to 'Default' when omitted", async () => {
    mockCreate.mockResolvedValue({ id: "key_2", key: "oga_x", name: "Default" } as never);
    await app.inject({ method: "POST", url: "/keys", headers: AUTH, payload: "{}" });
    expect(mockCreate).toHaveBeenCalledWith("user_1", "Default");
  });
});

describe("DELETE /keys/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "DELETE", url: "/keys/key_1" })).statusCode).toBe(401);
  });

  it("404s when the key is not the caller's", async () => {
    mockRevoke.mockResolvedValue(false);
    const res = await app.inject({ method: "DELETE", url: "/keys/key_x", headers: AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("revokes the caller's key", async () => {
    mockRevoke.mockResolvedValue(true);
    const res = await app.inject({ method: "DELETE", url: "/keys/key_1", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    expect(mockRevoke).toHaveBeenCalledWith("user_1", "key_1");
  });
});

/* AR-385: per-key training-data opt-out toggle. Same auth shape as
   DELETE — session-only, owner-scoped (non-owner attempts surface as
   404, not 403, to avoid leaking key-ID existence between users). */
describe("PATCH /keys/:id", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/keys/key_1",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ training_optout: true }),
    });
    expect(res.statusCode).toBe(401);
  });

  it("400s when the body is missing training_optout", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/keys/key_1",
      headers: AUTH,
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
    expect(mockSetOptout).not.toHaveBeenCalled();
  });

  it("400s when training_optout is not a boolean", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/keys/key_1",
      headers: AUTH,
      payload: JSON.stringify({ training_optout: "yes" }),
    });
    expect(res.statusCode).toBe(400);
    expect(mockSetOptout).not.toHaveBeenCalled();
  });

  it("404s when the key is not the caller's", async () => {
    mockSetOptout.mockResolvedValue(false);
    const res = await app.inject({
      method: "PATCH",
      url: "/keys/key_x",
      headers: AUTH,
      payload: JSON.stringify({ training_optout: true }),
    });
    expect(res.statusCode).toBe(404);
  });

  it("toggles training_optout TRUE for the caller's key", async () => {
    mockSetOptout.mockResolvedValue(true);
    const res = await app.inject({
      method: "PATCH",
      url: "/keys/key_1",
      headers: AUTH,
      payload: JSON.stringify({ training_optout: true }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "key_1", training_optout: true });
    expect(mockSetOptout).toHaveBeenCalledWith("user_1", "key_1", true);
  });

  it("toggles training_optout FALSE for the caller's key (opt back IN)", async () => {
    mockSetOptout.mockResolvedValue(true);
    const res = await app.inject({
      method: "PATCH",
      url: "/keys/key_1",
      headers: AUTH,
      payload: JSON.stringify({ training_optout: false }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "key_1", training_optout: false });
    expect(mockSetOptout).toHaveBeenCalledWith("user_1", "key_1", false);
  });
});
