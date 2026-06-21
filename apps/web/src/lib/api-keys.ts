import { sql } from "@/lib/db";
import { ensureApiKeysTable } from "@/lib/db-schema";
import { generateId } from "@/lib/id";
import { ApiKeyRow, rows, row } from "@/lib/db-types";
import crypto from "crypto";

/** Projected shape returned by listApiKeys (subset + computed column). */
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & {
  key_preview: string;
};

/* AR-127: API keys are stored as SHA-256 hashes plus a display prefix.
   Validation is hash-based — the plaintext is never persisted server-side
   after creation. Hash is fast on purpose: API keys are 192-bit random
   tokens, so brute-forcing a SHA-256 of a high-entropy input is infeasible
   and PBKDF2's iteration overhead would slow every authenticated request
   for zero security benefit. Stripe / GitHub / GitLab use the same pattern. */

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function apiKeyPreview(key: string): string {
  // First 12 chars (e.g. "aiq_a1b2c3d4") + ellipsis + last 4. Enough for the user
  // to recognise their key visually without recovering any secret material.
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

let _apiKeysReady = false;
let _migrationRan = false;

async function ensureTable() {
  if (_apiKeysReady) return;
  await ensureApiKeysTable();
  _apiKeysReady = true;
  // Backfill any pre-AR-127 rows that still have plaintext `key` and no `key_hash`.
  // Runs once per process. WHERE clause matches zero rows after first run.
  if (!_migrationRan) {
    await migrateApiKeysToHash();
    _migrationRan = true;
  }
}

interface PlaintextRow { id: string; key: string; }

/**
 * AR-127 migration: walk any rows with plaintext `key` set and no `key_hash`,
 * compute hash + prefix in Node, write back, and clear the plaintext column.
 * Idempotent. Safe to re-run.
 */
async function migrateApiKeysToHash() {
  const pending = rows<PlaintextRow>(await sql`
    SELECT id, key FROM api_keys WHERE key_hash IS NULL AND key IS NOT NULL
  `);
  for (const r of pending) {
    const hash = hashApiKey(r.key);
    const preview = apiKeyPreview(r.key);
    await sql`
      UPDATE api_keys
      SET key_hash = ${hash}, key_prefix = ${preview}, key = NULL
      WHERE id = ${r.id}
    `;
  }
}

export async function createApiKey(userId: string, name: string = "Default"): Promise<{ id: string; key: string; name: string }> {
  await ensureTable();
  const id = generateId("key");
  /* AR-265: new keys carry the oga_ prefix. The web side had an
     aiq_ literal here from the AreaIQ era that never got migrated
     when apps/api flipped (see apps/api/src/modules/api-keys/index.ts
     header comment). validateApiKey is a pure hash lookup, no prefix
     gate, so existing aiq_ keys keep validating untouched. */
  const key = `oga_${crypto.randomBytes(24).toString("hex")}`;
  const hash = hashApiKey(key);
  const preview = apiKeyPreview(key);

  await sql`
    INSERT INTO api_keys (id, key_hash, key_prefix, user_id, name)
    VALUES (${id}, ${hash}, ${preview}, ${userId}, ${name})
  `;

  // Return the plaintext key ONCE. It's never stored, never recoverable.
  return { id, key, name };
}

export async function listApiKeys(userId: string) {
  await ensureTable();
  const result = rows<ApiKeyPreview>(await sql`
    SELECT id, key_prefix as key_preview, name, created_at, last_used_at
    FROM api_keys
    WHERE user_id = ${userId} AND revoked = FALSE
    ORDER BY created_at DESC
  `);
  return result.map((r) => ({
    id: r.id,
    key_preview: r.key_preview,
    name: r.name,
    created_at: r.created_at,
    last_used_at: r.last_used_at,
  }));
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  await ensureTable();
  const result = await sql`
    UPDATE api_keys SET revoked = TRUE
    WHERE id = ${keyId} AND user_id = ${userId}
    RETURNING id
  `;
  return result.length > 0;
}

export async function validateApiKey(key: string): Promise<string | null> {
  await ensureTable();
  const hash = hashApiKey(key);
  const result = rows<Pick<ApiKeyRow, "user_id">>(await sql`
    SELECT user_id FROM api_keys
    WHERE key_hash = ${hash} AND revoked = FALSE
  `);
  if (result.length === 0) return null;

  // Update last_used_at (fire and forget)
  sql`UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ${hash}`.catch(() => {});

  return result[0].user_id;
}
