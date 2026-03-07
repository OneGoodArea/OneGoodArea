import { sql } from "@/lib/db";
import crypto from "crypto";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT DEFAULT 'Default',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    )
  `;
}

export async function createApiKey(userId: string, name: string = "Default"): Promise<{ id: string; key: string; name: string }> {
  await ensureTable();
  const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const key = `aiq_${crypto.randomBytes(24).toString("hex")}`;

  await sql`
    INSERT INTO api_keys (id, key, user_id, name)
    VALUES (${id}, ${key}, ${userId}, ${name})
  `;

  return { id, key, name };
}

export async function listApiKeys(userId: string) {
  await ensureTable();
  const rows = await sql`
    SELECT id, LEFT(key, 8) || '...' as key_preview, name, created_at, last_used_at
    FROM api_keys
    WHERE user_id = ${userId} AND revoked = FALSE
    ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    key_preview: r.key_preview as string,
    name: r.name as string,
    created_at: r.created_at as string,
    last_used_at: r.last_used_at as string | null,
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
  const rows = await sql`
    SELECT user_id FROM api_keys
    WHERE key = ${key} AND revoked = FALSE
  `;
  if (rows.length === 0) return null;

  // Update last_used_at (fire and forget)
  sql`UPDATE api_keys SET last_used_at = NOW() WHERE key = ${key}`.catch(() => {});

  return rows[0].user_id as string;
}
