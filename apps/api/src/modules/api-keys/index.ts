import crypto from "crypto";
import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { type ApiKeyRow, rows } from "../../infrastructure/db/types";

/* Migrated from legacy src/lib/api-keys.ts. Changes:
   - imports repointed to apps/api infrastructure;
   - the legacy ensureTable() self-create is dropped (the migrator owns api_keys);
   - the one-time AR-127 plaintext->hash backfill (migrateApiKeysToHash) is
     dropped: it only ever matched pre-AR-127 rows, already migrated in prod, and
     the standalone service never writes plaintext keys (createApiKey writes a
     hash), so it is a guaranteed no-op here;
   - new keys use the `oga_` prefix (was `aiq_`). SAFE: validateApiKey is a pure
     hash lookup with no prefix gate, so existing `aiq_` keys keep validating.

   AR-127: API keys are stored as SHA-256 hashes plus a display prefix. The
   plaintext is never persisted server-side after creation. SHA-256 (not PBKDF2)
   is correct here: keys are 192-bit random tokens, so brute-forcing the hash of
   a high-entropy input is infeasible and per-request KDF overhead buys nothing.
   Stripe / GitHub / GitLab use the same pattern. */

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function apiKeyPreview(key: string): string {
  // First 12 chars (e.g. "oga_a1b2c3d4") + ellipsis + last 4. Enough for the user
  // to recognise their key visually without recovering any secret material.
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

/** Projected shape returned by listApiKeys (subset + computed column). */
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & {
  key_preview: string;
};

export async function createApiKey(userId: string, name: string = "Default"): Promise<{ id: string; key: string; name: string }> {
  const id = generateId("key");
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
  const result = await sql`
    UPDATE api_keys SET revoked = TRUE
    WHERE id = ${keyId} AND user_id = ${userId}
    RETURNING id
  `;
  return result.length > 0;
}

export async function validateApiKey(key: string): Promise<string | null> {
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
