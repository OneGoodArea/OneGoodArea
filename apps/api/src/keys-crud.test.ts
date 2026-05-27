import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("./modules/api-keys", () => ({
  validateApiKey: vi.fn(),
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
}));
vi.mock("./modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { verifySessionToken } from "./modules/auth/session-token";
import { createApiKey, listApiKeys, revokeApiKey } from "./modules/api-keys";
import { hasApiAccess } from "./modules/usage";

const app = buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockCreate = vi.mocked(createApiKey);
const mockList = vi.mocked(listApiKeys);
const mockRevoke = vi.mocked(revokeApiKey);
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
