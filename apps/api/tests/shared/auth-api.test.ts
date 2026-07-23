import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn(), canMakeApiCall: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", async (orig) => ({
  ...(await orig() as object),
  rateLimit: vi.fn(),
}));
vi.mock("@/shared/http", () => ({ clientIpOf: vi.fn(() => "203.0.113.5") }));
/* Stub tier resolution (same pattern as intelligence.test.ts / AR-547),
   keep checkQuota (and the RATE_LIMITS-driven free-tier backstop) real. */
vi.mock("@/modules/tiers", async (orig) => ({
  ...(await orig() as object),
  resolveTier: vi.fn(async ({ userId }: { userId: string | null }) => (userId ? "logged_in" : "anonymous")),
}));

import { validateApiKey } from "@/modules/api-keys";
import { hasApiAccess, canMakeApiCall } from "@/modules/usage";
import { rateLimit } from "@/infrastructure/rate-limit";
import { requireApiAccessWithOrgOrAnonymous } from "@/shared/auth-api";

const mockValidate = vi.mocked(validateApiKey);
const mockHasApiAccess = vi.mocked(hasApiAccess);
const mockCanMakeApiCall = vi.mocked(canMakeApiCall);
const mockRateLimit = vi.mocked(rateLimit);

function mockReply() {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn(() => reply),
    headers: vi.fn(() => reply),
  };
  return reply as unknown as FastifyReply;
}

function mockRequest(authorization?: string): FastifyRequest {
  return { headers: { authorization } } as unknown as FastifyRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_1" } as never);
  mockHasApiAccess.mockResolvedValue(true);
  mockCanMakeApiCall.mockResolvedValue({ allowed: true, plan: "sandbox", used: 0, limit: 200 } as never);
  mockRateLimit.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
});

describe("requireApiAccessWithOrgOrAnonymous", () => {
  it("delegates to the normal authenticated path when a Bearer header is present", async () => {
    const reply = mockReply();
    const ctx = await requireApiAccessWithOrgOrAnonymous(mockRequest("Bearer oga_good"), reply);
    expect(ctx).toEqual({ userId: "user_1", orgId: "org_1", trainingOptout: false, tier: "logged_in" });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("resolves to the anonymous tier keyed by IP when there is no header", async () => {
    const reply = mockReply();
    const ctx = await requireApiAccessWithOrgOrAnonymous(mockRequest(undefined), reply);
    expect(ctx).toEqual({ userId: null, orgId: null, trainingOptout: false, tier: "anonymous" });
    expect(mockRateLimit).toHaveBeenCalledWith("anon-ip:203.0.113.5", { max: 5, windowSeconds: 60 });
  });

  it("returns null and 429s when the anonymous caller is over quota", async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() / 1000 + 60 });
    const reply = mockReply();
    const ctx = await requireApiAccessWithOrgOrAnonymous(mockRequest(undefined), reply);
    expect(ctx).toBeNull();
    expect(reply.code).toHaveBeenCalledWith(429);
  });

  it("still enforces the normal authenticated checks for a Bearer caller (e.g. no API access)", async () => {
    mockHasApiAccess.mockResolvedValue(false);
    const reply = mockReply();
    const ctx = await requireApiAccessWithOrgOrAnonymous(mockRequest("Bearer oga_good"), reply);
    expect(ctx).toBeNull();
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it("returns null and 401s an invalid Bearer key without falling back to anonymous", async () => {
    mockValidate.mockResolvedValue(null);
    const reply = mockReply();
    const ctx = await requireApiAccessWithOrgOrAnonymous(mockRequest("Bearer oga_bad"), reply);
    expect(ctx).toBeNull();
    expect(reply.code).toHaveBeenCalledWith(401);
  });
});
