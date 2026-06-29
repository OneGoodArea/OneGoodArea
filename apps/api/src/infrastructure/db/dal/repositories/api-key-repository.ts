import { sql } from "../../client";
import { type ApiKeyRow, rows } from "../../types";

/** Projected shape returned by listByUser (subset + computed column).
    AR-385: training_optout included so /api-usage can render the per-key
    toggle without an extra round-trip. */
export type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at" | "training_optout"> & {
  key_preview: string;
};

/** DAL repository for the `api_keys` table. */
export class ApiKeyRepository {
  async insert(
    id: string,
    keyHash: string,
    keyPrefix: string,
    userId: string,
    name: string,
  ): Promise<void> {
    await sql`
      INSERT INTO api_keys (id, key_hash, key_prefix, user_id, name)
      VALUES (${id}, ${keyHash}, ${keyPrefix}, ${userId}, ${name})
    `;
  }

  async listByUser(userId: string): Promise<ApiKeyPreview[]> {
    return rows<ApiKeyPreview>(await sql`
      SELECT id, key_prefix AS key_preview, name, created_at, last_used_at, training_optout
        FROM api_keys
       WHERE user_id = ${userId} AND revoked = FALSE
       ORDER BY created_at DESC
    `);
  }

  async revoke(keyId: string, userId: string): Promise<boolean> {
    const result = await sql`
      UPDATE api_keys SET revoked = TRUE
       WHERE id = ${keyId} AND user_id = ${userId}
       RETURNING id
    `;
    return result.length > 0;
  }

  /** AR-385: per-key training-data opt-out toggle. Owner-scoped via
      the user_id predicate — a customer can only flip flags on keys
      they own. Returns false when the key doesn't exist or belongs to
      another user (no information leak between users). */
  async setTrainingOptout(keyId: string, userId: string, optout: boolean): Promise<boolean> {
    const result = await sql`
      UPDATE api_keys SET training_optout = ${optout}
       WHERE id = ${keyId} AND user_id = ${userId} AND revoked = FALSE
       RETURNING id
    `;
    return result.length > 0;
  }

  /** Returns the minimal columns needed by validateApiKey, or null if not found. */
  async findByHash(
    hash: string,
  ): Promise<Pick<ApiKeyRow, "user_id" | "org_id" | "allowed_ip_cidrs" | "training_optout"> | null> {
    const result = rows<Pick<ApiKeyRow, "user_id" | "org_id" | "allowed_ip_cidrs" | "training_optout">>(await sql`
      SELECT user_id, org_id, allowed_ip_cidrs, training_optout
        FROM api_keys
       WHERE key_hash = ${hash} AND revoked = FALSE
    `);
    return result[0] ?? null;
  }

  /** Fire-and-forget UPDATE — the caller must attach .catch(() => {}) at the
   *  call site, not here. Returning the raw promise makes the intent explicit. */
  touchLastUsed(hash: string): Promise<unknown> {
    return sql`UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ${hash}`;
  }
}
