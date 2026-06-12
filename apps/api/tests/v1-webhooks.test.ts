import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
// Partial mock: keep the pure validators (validateWebhookUrl / validateEventTypes)
// real so the 400 paths exercise the genuine logic; only the DB-touching CRUD
// is stubbed.
vi.mock("@/modules/webhooks", async () => {
  const actual = await vi.importActual<typeof import("@/modules/webhooks")>("@/modules/webhooks");
  return {
    ...actual,
    createWebhookSubscription: vi.fn(),
    listWebhookSubscriptions: vi.fn(),
    revokeWebhookSubscription: vi.fn(),
  };
});

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess } from "@/modules/usage";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  revokeWebhookSubscription,
} from "@/modules/webhooks";

const app = buildApp();

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockCreate = vi.mocked(createWebhookSubscription);
const mockList = vi.mocked(listWebhookSubscriptions);
const mockRevoke = vi.mocked(revokeWebhookSubscription);

const AUTH = { authorization: "Bearer oga_good" };

beforeEach(() => {
  vi.clearAllMocks();
  // Happy-path defaults; individual tests override one gate.
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockCreate.mockResolvedValue({
    id: "whsub_1",
    url: "https://example.com/hook",
    events: ["report.created"],
    secret: "whsec_abc123",
    created_at: "2026-05-24T00:00:00.000Z",
  });
  mockList.mockResolvedValue([]);
  mockRevoke.mockResolvedValue(true);
});

function postWebhook(body: unknown, headers: Record<string, string> = AUTH) {
  return app.inject({
    method: "POST",
    url: "/v1/webhooks",
    headers: { "content-type": "application/json", ...headers },
    payload: JSON.stringify(body),
  });
}

describe("POST /v1/webhooks", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(401);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s on an invalid key", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await postWebhook({ url: "https://example.com/hook", events: ["report.created"] });
    expect(res.statusCode).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await postWebhook({ url: "https://example.com/hook", events: ["report.created"] });
    expect(res.statusCode).toBe(429);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await postWebhook({ url: "https://example.com/hook", events: ["report.created"] });
    expect(res.statusCode).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400s when the body is not an object", async () => {
    const res = await postWebhook(null);
    expect(res.statusCode).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400s on a non-HTTPS / private URL", async () => {
    const res = await postWebhook({ url: "http://localhost/hook", events: ["report.created"] });
    expect(res.statusCode).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400s when events is empty or unsupported", async () => {
    const res = await postWebhook({ url: "https://example.com/hook", events: ["bogus.event"] });
    expect(res.statusCode).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("201s on the happy path and returns the secret once", async () => {
    const res = await postWebhook({ url: "https://example.com/hook", events: ["report.created"] });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe("whsub_1");
    expect(body.secret).toBe("whsec_abc123");
    expect(body.events).toEqual(["report.created"]);
    expect(mockCreate).toHaveBeenCalledWith("user_1", "https://example.com/hook", ["report.created"]);
  });

  it("dedupes and filters the events list before persisting", async () => {
    /* AR-283: score.changed was removed (never fired). Replaced with
       signal.changed which is the real other event in the taxonomy. */
    await postWebhook({
      url: "https://example.com/hook",
      events: ["report.created", "report.created", "bogus.event", "signal.changed"],
    });
    expect(mockCreate).toHaveBeenCalledWith("user_1", "https://example.com/hook", [
      "report.created",
      "signal.changed",
    ]);
  });
});

describe("GET /v1/webhooks", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/webhooks" });
    expect(res.statusCode).toBe(401);
  });

  it("200s with the caller's subscriptions", async () => {
    mockList.mockResolvedValue([
      {
        id: "whsub_1",
        url: "https://example.com/hook",
        events: ["report.created"],
        status: "active",
        created_at: "2026-05-24T00:00:00.000Z",
        last_success_at: null,
        last_failure_at: null,
      },
    ]);
    const res = await app.inject({ method: "GET", url: "/v1/webhooks", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.subscriptions).toHaveLength(1);
    expect(body.subscriptions[0].id).toBe("whsub_1");
    // The secret is never exposed on list.
    expect(body.subscriptions[0].secret).toBeUndefined();
    expect(mockList).toHaveBeenCalledWith("user_1");
  });
});

describe("DELETE /v1/webhooks/:id", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/v1/webhooks/whsub_1" });
    expect(res.statusCode).toBe(401);
  });

  it("200s and reports revoked when the subscription is the caller's", async () => {
    const res = await app.inject({ method: "DELETE", url: "/v1/webhooks/whsub_1", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "whsub_1", status: "revoked" });
    expect(mockRevoke).toHaveBeenCalledWith("user_1", "whsub_1");
  });

  it("404s when the subscription is unknown or already revoked", async () => {
    mockRevoke.mockResolvedValue(false);
    const res = await app.inject({ method: "DELETE", url: "/v1/webhooks/whsub_x", headers: AUTH });
    expect(res.statusCode).toBe(404);
  });
});
