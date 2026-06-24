import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw-server";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sql } from "@/infrastructure/db/client";
import { logger } from "@/modules/tracking/structured-logger";
import {
  generateWebhookSecret,
  signWebhookPayload,
  buildSignatureHeader,
  validateWebhookUrl,
  validateEventTypes,
  fireWebhookEvent,
  type WebhookSubscriptionRow,
} from "@/modules/webhooks/index";

const mockSql = vi.mocked(sql);
const mockLogger = vi.mocked(logger);

beforeEach(() => {
  mockSql.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.error.mockReset();
});

/* ── Pure signing / validation ── */

describe("signing", () => {
  it("generates secrets with the whsec_ prefix", () => {
    const s = generateWebhookSecret();
    expect(s).toMatch(/^whsec_[0-9a-f]{48}$/);
  });

  it("signs deterministically (HMAC-SHA256 over t.body)", () => {
    const a = signWebhookPayload("secret", 1700000000, "{}");
    const b = signWebhookPayload("secret", 1700000000, "{}");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(signWebhookPayload("other", 1700000000, "{}")).not.toBe(a);
  });

  it("builds the t=,v1= signature header", () => {
    expect(buildSignatureHeader("secret", "{}", 1700000000)).toMatch(/^t=1700000000,v1=[0-9a-f]{64}$/);
  });
});

describe("validateWebhookUrl", () => {
  it("accepts public https URLs", () => {
    expect(validateWebhookUrl("https://hooks.customer.com/oga")).toEqual({
      valid: true,
      sanitized: "https://hooks.customer.com/oga",
    });
  });

  it.each([
    "http://hooks.customer.com",       // not https
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://10.0.0.5/x",
    "https://192.168.1.1/x",
    "https://172.16.0.1/x",
    "not a url",
  ])("rejects %s", (url) => {
    expect(validateWebhookUrl(url).valid).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(validateWebhookUrl(123).valid).toBe(false);
  });
});

describe("validateEventTypes", () => {
  it("keeps supported types and dedups", () => {
    /* AR-328: signal.changed is the only supported event type post-AR-324
       (report.created was removed alongside the legacy /v1/report kill).
       Dedup behaviour still exercised — the helper collapses repeats. */
    expect(validateEventTypes(["signal.changed", "signal.changed", "signal.changed"])).toEqual([
      "signal.changed",
    ]);
  });

  it("returns null for empty or all-unknown lists", () => {
    expect(validateEventTypes([])).toBeNull();
    expect(validateEventTypes(["nope"])).toBeNull();
    expect(validateEventTypes("signal.changed")).toBeNull();
  });
});

/* ── Delivery ── */

const SUB: WebhookSubscriptionRow = {
  id: "whsub_1",
  user_id: "u1",
  url: "https://customer.example.com/hook",
  secret: "whsec_test",
  events: ["signal.changed"],
  status: "active",
  created_at: "2026-01-01",
  last_success_at: null,
  last_failure_at: null,
};

function flatArgs(): unknown[] {
  return mockSql.mock.calls.flat();
}

describe("fireWebhookEvent", () => {
  it("does nothing when there are no matching subscriptions", async () => {
    mockSql.mockResolvedValueOnce([] as never);
    await fireWebhookEvent("u1", "signal.changed", { report_id: "rpt_1" });
    expect(mockSql).toHaveBeenCalledTimes(1); // SELECT only
  });

  it("POSTs a signed payload, records a delivered row and stamps last_success", async () => {
    let signature: string | null = null;
    server.use(
      http.post(SUB.url, ({ request }) => {
        signature = request.headers.get("X-OneGoodArea-Signature");
        return HttpResponse.json({ ok: true });
      })
    );
    mockSql.mockResolvedValueOnce([SUB] as never).mockResolvedValue([] as never);

    await fireWebhookEvent("u1", "signal.changed", { report_id: "rpt_1" });

    expect(signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(mockSql).toHaveBeenCalledTimes(3); // SELECT + INSERT delivery + UPDATE last_success
    expect(flatArgs()).toContain("delivered");
  });

  it("records a failed row and warns when the customer endpoint errors", async () => {
    server.use(http.post(SUB.url, () => new HttpResponse(null, { status: 500 })));
    mockSql.mockResolvedValueOnce([SUB] as never).mockResolvedValue([] as never);

    await fireWebhookEvent("u1", "signal.changed", { report_id: "rpt_1" });

    expect(flatArgs()).toContain("failed");
    expect(mockLogger.warn).toHaveBeenCalledOnce();
  });
});
