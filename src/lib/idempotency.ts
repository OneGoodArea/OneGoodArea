import crypto from "crypto";
import { sql } from "@/lib/db";
import { ensureIdempotencyRecordsTable } from "@/lib/db-schema";
import { generateId } from "@/lib/id";
import { rows } from "@/lib/db-types";
import { AppError } from "@/lib/errors";

/* AR-128: Stripe-style idempotency for the public REST API.
   Wraps a cost-bearing handler so retries with the same `Idempotency-Key`
   header return the cached response instead of re-running the engine. */

const TTL_HOURS = 24;
const MIN_KEY_LENGTH = 1;
const MAX_KEY_LENGTH = 255;

interface CachedResponse {
  request_hash: string;
  response_status: number;
  response_body: unknown;
}

let _tableReady = false;
async function ensureTable() {
  if (_tableReady) return;
  await ensureIdempotencyRecordsTable();
  _tableReady = true;
}

/**
 * Canonical SHA-256 of the request payload. Used to detect key reuse with a
 * different body (the Stripe IDEMPOTENCY_CONFLICT case). JSON.stringify gives
 * deterministic output for plain objects + primitive values, which is what
 * our handlers pass in. Note: key ordering matters for plain objects in JSON,
 * but in practice callers POST the same shape on retries.
 */
export function hashRequest(request: unknown): string {
  const canonical = JSON.stringify(request);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Validate the supplied Idempotency-Key header. Returns the trimmed key if
 * valid, null if absent, throws AppError if malformed. Mirrors Stripe's
 * tolerance: any non-empty ASCII string up to 255 chars.
 */
export function parseIdempotencyKey(headerValue: string | null): string | null {
  if (headerValue === null || headerValue === undefined) return null;
  const trimmed = headerValue.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_KEY_LENGTH || trimmed.length > MAX_KEY_LENGTH) {
    throw new AppError(
      `Idempotency-Key length must be ${MIN_KEY_LENGTH}-${MAX_KEY_LENGTH} characters`,
      400,
      "VALIDATION_ERROR",
    );
  }
  return trimmed;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

export interface WithIdempotencyResult extends HandlerResult {
  /** True if this response was served from the idempotency store, not freshly generated. */
  replayed: boolean;
}

/**
 * Wrap a cost-bearing handler with idempotency. If `key` is null, just runs
 * the handler (current behaviour, backwards-compatible). If `key` is supplied:
 *
 *  - Lookup in idempotency_records: if a row exists for (user_id, key) with
 *    matching request_hash, return its cached response with replayed=true.
 *  - If a row exists but the request_hash differs, throw 409 IDEMPOTENCY_CONFLICT.
 *  - Otherwise run the handler, store the result, return with replayed=false.
 *
 * Concurrent requests with the same key are not coordinated — whichever finishes
 * second hits the unique-constraint violation on INSERT and replays the cached
 * version. Stripe handles concurrent calls with row locking; we defer that until
 * a customer asks.
 */
export async function withIdempotency(
  userId: string,
  key: string | null,
  request: unknown,
  handler: () => Promise<HandlerResult>,
): Promise<WithIdempotencyResult> {
  if (!key) {
    const result = await handler();
    return { ...result, replayed: false };
  }

  await ensureTable();
  const requestHash = hashRequest(request);

  // Look up existing (only non-expired rows visible)
  const found = rows<CachedResponse>(await sql`
    SELECT request_hash, response_status, response_body
    FROM idempotency_records
    WHERE user_id = ${userId}
      AND idempotency_key = ${key}
      AND expires_at > NOW()
    LIMIT 1
  `);

  if (found.length > 0) {
    const cached = found[0];
    if (cached.request_hash !== requestHash) {
      throw new AppError(
        "Idempotency-Key was previously used with a different request body. " +
          "Use a new key for a different request, or retry with the original body.",
        409,
        "IDEMPOTENCY_CONFLICT",
      );
    }
    return {
      status: cached.response_status,
      body: cached.response_body,
      replayed: true,
    };
  }

  // Cache miss — run the handler
  const result = await handler();

  // Store. ON CONFLICT DO NOTHING handles the rare concurrent-retry race
  // where two parallel requests with the same key both reach this point.
  const id = generateId("idem");
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO idempotency_records (
      id, user_id, idempotency_key, request_hash,
      response_status, response_body, expires_at
    )
    VALUES (
      ${id}, ${userId}, ${key}, ${requestHash},
      ${result.status}, ${JSON.stringify(result.body)}, ${expiresAt}
    )
    ON CONFLICT (user_id, idempotency_key) DO NOTHING
  `;

  return { ...result, replayed: false };
}
