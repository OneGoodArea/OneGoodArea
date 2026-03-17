import { sql } from "@/lib/db";
import { ensureApiKeysTable } from "@/lib/db-schema";
import { generateId } from "@/lib/id";
import { ApiKeyRow, rows, row } from "@/lib/db-types";
import crypto from "crypto";

/** Projected shape returned by listApiKeys (subset + computed column). */
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & {
  key_preview: string;
};

let _apiKeysReady = false;
async function ensureTable() {
  if (_apiKeysReady) return;
  await ensureApiKeysTable();
  _apiKeysReady = true;
}

export async function createApiKey(userId: string, name: string = "Default"): Promise<{ id: string; key: string; name: string }> {
  await ensureTable();
  const id = generateId("key");
  const key = `aiq_${crypto.randomBytes(24).toString("hex")}`;

  await sql`
    INSERT INTO api_keys (id, key, user_id, name)
    VALUES (${id}, ${key}, ${userId}, ${name})
  `;

  return { id, key, name };
}

export async function listApiKeys(userId: string) {
  await ensureTable();
  const result = rows<ApiKeyPreview>(await sql`
    SELECT id, LEFT(key, 8) || '...' as key_preview, name, created_at, last_used_at
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
  const rows = await sql`
    UPDATE api_keys SET revoked = TRUE
    WHERE id = ${keyId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function validateApiKey(key: string): Promise<string | null> {
  await ensureTable();
  const result = rows<Pick<ApiKeyRow, "user_id">>(await sql`
    SELECT user_id FROM api_keys
    WHERE key = ${key} AND revoked = FALSE
  `);
  if (result.length === 0) return null;

  // Update last_used_at (fire and forget)
  sql`UPDATE api_keys SET last_used_at = NOW() WHERE key = ${key}`.catch(() => {});

  return result[0].user_id;
}
