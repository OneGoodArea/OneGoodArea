import crypto from "crypto";
import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { rows } from "../../infrastructure/db/types";
import { logger } from "../tracking/structured-logger";

/* AR-129: outbound webhook subscriptions + signed delivery.

   Migrated from legacy src/lib/webhooks.ts. Changes: imports repointed to the
   apps/api infrastructure; the legacy ensureTables() self-create is dropped
   (the migrator owns the byte-identical webhook_subscriptions +
   webhook_deliveries DDL). All signing, validation, CRUD and delivery logic is
   otherwise verbatim.

   Customer registers a URL + event list. When a matching event fires (today:
   `signal.changed` from portfolio change detection), we POST the signed
   payload to the customer's URL.

   Stripe-style HMAC-SHA256 signing on `t=<timestamp>.<json-body>`, sent as
   `X-OneGoodArea-Signature: t=<ts>,v1=<hex>`. Customer verifies on their end
   by recomputing the HMAC with their secret and constant-time-comparing. */

const WEBHOOK_DELIVERY_TIMEOUT_MS = 5000;
const SECRET_PREFIX = "whsec_";

/* AR-283: dropped score.changed -- it lived in this list since AR-129
   but was NEVER fired anywhere in the codebase. Customers subscribing
   to it silently got nothing.
   AR-328: dropped report.created alongside the legacy /v1/report kill
   (epic AR-324). signal.changed remains as the live event, fired from
   modules/monitor/change-detection.ts when portfolio change detection
   crosses a threshold. When proper score threshold tracking ships, add
   score.threshold_crossed (new semantic) rather than reviving any of
   the retired slots. */
export const SUPPORTED_EVENT_TYPES = ["signal.changed"] as const;
export type WebhookEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

export interface WebhookSubscriptionRow {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: string[];
  status: string;
  created_at: Date | string;
  last_success_at: Date | string | null;
  last_failure_at: Date | string | null;
}

/* ── Signing ── */

export function generateWebhookSecret(): string {
  return `${SECRET_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

/** Stripe-style HMAC-SHA256 over `t=<unix-seconds>.<raw-body>`. */
export function signWebhookPayload(secret: string, timestamp: number, body: string): string {
  const message = `${timestamp}.${body}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/** Returns the value of the X-OneGoodArea-Signature header for a given body. */
export function buildSignatureHeader(
  secret: string,
  body: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): string {
  const v1 = signWebhookPayload(secret, timestamp, body);
  return `t=${timestamp},v1=${v1}`;
}

/* ── Validation ── */

export type UrlValidationResult =
  | { valid: true; sanitized: string }
  | { valid: false; error: string };

/** Webhook destinations MUST be public HTTPS endpoints. Reject http://, localhost,
 *  RFC 1918 private ranges, and link-local IPv6. */
export function validateWebhookUrl(input: unknown): UrlValidationResult {
  if (typeof input !== "string") {
    return { valid: false, error: "Webhook URL must be a string" };
  }
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { valid: false, error: "Webhook URL must be a valid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Webhook URL must use HTTPS" };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return { valid: false, error: "Webhook URL cannot point at localhost or a private network" };
  }
  return { valid: true, sanitized: parsed.toString() };
}

/** Filters the supplied event list to known supported types. Returns null on empty/invalid. */
export function validateEventTypes(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const supported = new Set<string>(SUPPORTED_EVENT_TYPES);
  const filtered = input.filter((e): e is string => typeof e === "string" && supported.has(e));
  if (filtered.length === 0) return null;
  return Array.from(new Set(filtered));
}

/* ── CRUD ── */

export interface CreatedWebhookSubscription {
  id: string;
  url: string;
  events: string[];
  /** Returned ONCE on creation. Never recoverable. */
  secret: string;
  created_at: string;
}

export async function createWebhookSubscription(
  userId: string,
  url: string,
  events: string[],
): Promise<CreatedWebhookSubscription> {
  const id = generateId("whsub");
  const secret = generateWebhookSecret();
  await sql`
    INSERT INTO webhook_subscriptions (id, user_id, url, secret, events, status)
    VALUES (${id}, ${userId}, ${url}, ${secret}, ${events}, 'active')
  `;
  return {
    id,
    url,
    events,
    secret,
    created_at: new Date().toISOString(),
  };
}

export interface ListedWebhookSubscription {
  id: string;
  url: string;
  events: string[];
  status: string;
  created_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
}

export async function listWebhookSubscriptions(userId: string): Promise<ListedWebhookSubscription[]> {
  const result = rows<WebhookSubscriptionRow>(await sql`
    SELECT id, user_id, url, secret, events, status, created_at, last_success_at, last_failure_at
    FROM webhook_subscriptions
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY created_at DESC
  `);
  return result.map((r) => ({
    id: r.id,
    url: r.url,
    events: r.events,
    status: r.status,
    created_at: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    last_success_at: r.last_success_at
      ? typeof r.last_success_at === "string"
        ? r.last_success_at
        : r.last_success_at.toISOString()
      : null,
    last_failure_at: r.last_failure_at
      ? typeof r.last_failure_at === "string"
        ? r.last_failure_at
        : r.last_failure_at.toISOString()
      : null,
  }));
}

export async function revokeWebhookSubscription(userId: string, id: string): Promise<boolean> {
  const result = await sql`
    UPDATE webhook_subscriptions
    SET status = 'revoked'
    WHERE id = ${id} AND user_id = ${userId} AND status = 'active'
    RETURNING id
  `;
  return result.length > 0;
}

/** AR-283: rotate the signing secret on an active subscription.
    Generates a fresh whsec_ secret, persists it, returns the plaintext
    ONCE for the dashboard's one-time-reveal panel. The old secret
    stops verifying signatures the instant this commits -- any in-flight
    deliveries still in the retry queue at the moment of rotation will
    fail signature verification on the receiver side. Returns null if
    the subscription doesn't belong to the caller or was already revoked. */
export async function rotateWebhookSecret(userId: string, id: string): Promise<string | null> {
  const newSecret = generateWebhookSecret();
  const result = await sql`
    UPDATE webhook_subscriptions
       SET secret = ${newSecret}
     WHERE id = ${id} AND user_id = ${userId} AND status = 'active'
     RETURNING id
  `;
  if (result.length === 0) return null;
  return newSecret;
}

/* ── Delivery ── */

interface DeliveryResult {
  delivered: boolean;
  httpStatus: number | null;
  responseBody: string;
}

async function postWebhookDelivery(
  url: string,
  secret: string,
  bodyString: string,
  headers: Record<string, string>,
): Promise<DeliveryResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildSignatureHeader(secret, bodyString, timestamp);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-OneGoodArea-Signature": signature,
        "User-Agent": "OneGoodArea-Webhooks/1.0",
      },
      body: bodyString,
      signal: AbortSignal.timeout(WEBHOOK_DELIVERY_TIMEOUT_MS),
    });
    // Capture a snippet of the response body for debugging without writing too much
    const text = await res.text().catch(() => "");
    return {
      delivered: res.ok,
      httpStatus: res.status,
      responseBody: text.slice(0, 500),
    };
  } catch (err) {
    return {
      delivered: false,
      httpStatus: null,
      responseBody: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Fire a webhook event for one user. Looks up active matching subscriptions,
 * records a delivery row per subscription, attempts HTTP POST synchronously
 * (with 5s timeout). Returns immediately — caller should NOT await this if
 * latency-sensitive. Errors are recorded in webhook_deliveries.status='failed'
 * for the Phase-2 retry cron to pick up.
 */
export async function fireWebhookEvent(
  userId: string,
  eventType: WebhookEventType,
  data: unknown,
): Promise<void> {
  try {
    const subs = rows<WebhookSubscriptionRow>(await sql`
      SELECT id, user_id, url, secret, events, status, created_at, last_success_at, last_failure_at
      FROM webhook_subscriptions
      WHERE user_id = ${userId}
        AND status = 'active'
        AND ${eventType} = ANY(events)
    `);
    if (subs.length === 0) return;

    await Promise.allSettled(
      subs.map((sub) => deliverOneEvent(sub, eventType, data)),
    );
  } catch (err) {
    // Never let webhook errors break the calling code path.
    logger.error("[webhooks] fireWebhookEvent failed", err);
  }
}

async function deliverOneEvent(
  sub: WebhookSubscriptionRow,
  eventType: WebhookEventType,
  data: unknown,
): Promise<void> {
  const eventId = generateId("evt");
  const deliveryId = generateId("whd");
  const envelope = {
    id: eventId,
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data,
  };
  const bodyString = JSON.stringify(envelope);

  const result = await postWebhookDelivery(sub.url, sub.secret, bodyString, {
    "X-OneGoodArea-Event": eventType,
    "X-OneGoodArea-Delivery": deliveryId,
  });

  await sql`
    INSERT INTO webhook_deliveries (
      id, subscription_id, event_id, event_type, payload,
      status, http_status, response_body, attempts, delivered_at
    )
    VALUES (
      ${deliveryId}, ${sub.id}, ${eventId}, ${eventType}, ${bodyString}::jsonb,
      ${result.delivered ? "delivered" : "failed"},
      ${result.httpStatus},
      ${result.responseBody},
      1,
      ${result.delivered ? new Date().toISOString() : null}
    )
    ON CONFLICT (event_id) DO NOTHING
  `;

  if (result.delivered) {
    await sql`UPDATE webhook_subscriptions SET last_success_at = NOW() WHERE id = ${sub.id}`.catch(() => {});
  } else {
    await sql`UPDATE webhook_subscriptions SET last_failure_at = NOW() WHERE id = ${sub.id}`.catch(() => {});
    logger.warn("[webhooks] delivery failed", {
      subscription_id: sub.id,
      event_type: eventType,
      http_status: result.httpStatus,
      response_snippet: result.responseBody.slice(0, 200),
    });
  }
}
