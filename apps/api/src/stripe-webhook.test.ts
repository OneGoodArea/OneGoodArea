import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/billing/webhook-handler", () => ({ handleStripeWebhook: vi.fn() }));

import { buildApp } from "./app";
import { handleStripeWebhook } from "./modules/billing/webhook-handler";

const app = buildApp();
const mockHandle = vi.mocked(handleStripeWebhook);

beforeEach(() => {
  vi.clearAllMocks();
  mockHandle.mockResolvedValue({ status: 200, body: { received: true } });
});

describe("POST /stripe/webhook", () => {
  it("forwards the exact raw body + signature header to the handler", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "ping" });
    const res = await app.inject({
      method: "POST",
      url: "/stripe/webhook",
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=abc" },
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
    // Raw body preserved byte-for-byte (signature verification depends on it).
    expect(mockHandle).toHaveBeenCalledWith(payload, "t=1,v1=abc");
  });

  it("passes null when the signature header is absent", async () => {
    await app.inject({
      method: "POST",
      url: "/stripe/webhook",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    expect(mockHandle).toHaveBeenCalledWith("{}", null);
  });

  it("relays the handler's status + body (e.g. 400 bad signature)", async () => {
    mockHandle.mockResolvedValue({ status: 400, body: { error: "Invalid signature" } });
    const res = await app.inject({
      method: "POST",
      url: "/stripe/webhook",
      headers: { "content-type": "application/json", "stripe-signature": "bad" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "Invalid signature" });
  });
});
