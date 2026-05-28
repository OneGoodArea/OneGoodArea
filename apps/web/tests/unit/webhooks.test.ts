import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  buildSignatureHeader,
  generateWebhookSecret,
  signWebhookPayload,
  SUPPORTED_EVENT_TYPES,
  validateEventTypes,
  validateWebhookUrl,
} from "@/lib/webhooks";

/* AR-129 verification suite for the pure helpers. The HTTP + DB layer
   (createWebhookSubscription, fireWebhookEvent) is covered indirectly
   when Marcos's local-runtime container is wired into the test workflow. */

describe("AR-129: generateWebhookSecret", () => {
  it("starts with the whsec_ prefix", () => {
    expect(generateWebhookSecret().startsWith("whsec_")).toBe(true);
  });

  it("produces a 48-hex-char token after the prefix", () => {
    const secret = generateWebhookSecret();
    const tail = secret.slice("whsec_".length);
    expect(tail).toHaveLength(48);
    expect(tail).toMatch(/^[a-f0-9]{48}$/);
  });

  it("is unique on each call (different randomBytes per invocation)", () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).not.toBe(b);
  });
});

describe("AR-129: signWebhookPayload", () => {
  it("returns a 64-char hex SHA-256 HMAC", () => {
    const sig = signWebhookPayload("whsec_test", 1234567890, '{"hello":"world"}');
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same secret + timestamp + body", () => {
    const args: [string, number, string] = ["whsec_x", 1700000000, '{"a":1}'];
    const a = signWebhookPayload(...args);
    const b = signWebhookPayload(...args);
    expect(a).toBe(b);
  });

  it("differs when the timestamp changes (replay protection)", () => {
    const a = signWebhookPayload("whsec_x", 1700000000, '{"a":1}');
    const b = signWebhookPayload("whsec_x", 1700000001, '{"a":1}');
    expect(a).not.toBe(b);
  });

  it("differs when the body changes (integrity)", () => {
    const a = signWebhookPayload("whsec_x", 1700000000, '{"a":1}');
    const b = signWebhookPayload("whsec_x", 1700000000, '{"a":2}');
    expect(a).not.toBe(b);
  });

  it("differs when the secret changes (no cross-customer forgery)", () => {
    const a = signWebhookPayload("whsec_aaa", 1700000000, '{"a":1}');
    const b = signWebhookPayload("whsec_bbb", 1700000000, '{"a":1}');
    expect(a).not.toBe(b);
  });

  it("matches a known reference HMAC", () => {
    // Sanity check that our HMAC implementation hasn't drifted.
    const expected = crypto
      .createHmac("sha256", "whsec_known")
      .update("1700000000.{\"hello\":\"world\"}")
      .digest("hex");
    expect(signWebhookPayload("whsec_known", 1700000000, '{"hello":"world"}')).toBe(expected);
  });
});

describe("AR-129: buildSignatureHeader", () => {
  it("produces Stripe-format `t=<ts>,v1=<hex>` value", () => {
    const value = buildSignatureHeader("whsec_x", '{"a":1}', 1700000000);
    expect(value).toMatch(/^t=1700000000,v1=[a-f0-9]{64}$/);
  });

  it("uses now() when timestamp omitted (fresh signatures)", () => {
    const a = buildSignatureHeader("whsec_x", '{"a":1}');
    const tsMatch = a.match(/^t=(\d+),/);
    expect(tsMatch).not.toBeNull();
    const ts = parseInt(tsMatch![1], 10);
    const nowSec = Math.floor(Date.now() / 1000);
    expect(Math.abs(ts - nowSec)).toBeLessThan(5);
  });
});

describe("AR-129: validateWebhookUrl", () => {
  it("accepts a plain HTTPS URL", () => {
    const r = validateWebhookUrl("https://hooks.example.com/inbound");
    expect(r.valid).toBe(true);
  });

  it("rejects non-string input", () => {
    expect(validateWebhookUrl(null).valid).toBe(false);
    expect(validateWebhookUrl(42).valid).toBe(false);
    expect(validateWebhookUrl({ url: "x" }).valid).toBe(false);
  });

  it("rejects http:// (forces HTTPS)", () => {
    const r = validateWebhookUrl("http://example.com/inbound");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/HTTPS/);
  });

  it("rejects localhost", () => {
    expect(validateWebhookUrl("https://localhost/inbound").valid).toBe(false);
    expect(validateWebhookUrl("https://127.0.0.1/inbound").valid).toBe(false);
    expect(validateWebhookUrl("https://0.0.0.0/inbound").valid).toBe(false);
  });

  it("rejects RFC 1918 private ranges", () => {
    expect(validateWebhookUrl("https://10.0.0.1/inbound").valid).toBe(false);
    expect(validateWebhookUrl("https://192.168.1.1/inbound").valid).toBe(false);
    expect(validateWebhookUrl("https://172.16.0.1/inbound").valid).toBe(false);
    expect(validateWebhookUrl("https://172.31.255.255/inbound").valid).toBe(false);
  });

  it("accepts 172.x.x.x IPs OUTSIDE 16-31 (technically valid public)", () => {
    expect(validateWebhookUrl("https://172.15.0.1/inbound").valid).toBe(true);
    expect(validateWebhookUrl("https://172.32.0.1/inbound").valid).toBe(true);
  });

  it("rejects malformed URLs", () => {
    expect(validateWebhookUrl("not a url").valid).toBe(false);
    expect(validateWebhookUrl("").valid).toBe(false);
  });
});

describe("AR-129: validateEventTypes", () => {
  it("accepts a supported single-event array", () => {
    expect(validateEventTypes(["report.created"])).toEqual(["report.created"]);
  });

  it("accepts multiple supported types and dedupes", () => {
    expect(validateEventTypes(["report.created", "score.changed", "report.created"]))
      .toEqual(["report.created", "score.changed"]);
  });

  it("filters out unknown types", () => {
    expect(validateEventTypes(["report.created", "unknown.event"]))
      .toEqual(["report.created"]);
  });

  it("returns null when only unknown types provided", () => {
    expect(validateEventTypes(["fake.event", "also.fake"])).toBeNull();
  });

  it("returns null for non-arrays", () => {
    expect(validateEventTypes("report.created")).toBeNull();
    expect(validateEventTypes(null)).toBeNull();
    expect(validateEventTypes({})).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(validateEventTypes([])).toBeNull();
  });

  it("exposes the supported event type list", () => {
    expect(SUPPORTED_EVENT_TYPES).toContain("report.created");
    expect(SUPPORTED_EVENT_TYPES).toContain("score.changed");
  });
});
