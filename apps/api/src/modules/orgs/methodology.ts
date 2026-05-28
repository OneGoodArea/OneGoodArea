/* modules/orgs/methodology — Levers (AR-197): per-org engine_version pin.

   When an org owner sets a pin, every response from that org's keys
   (without an explicit X-Engine-Version header) is stamped with the
   pinned version on both the response header and the body's
   engine_version field. The header still wins when explicitly set
   per-request.

   See ADR 0031. */

import { sql } from "../../infrastructure/db/client";
import type { OrgMethodologyPinRow } from "../../infrastructure/db/types";
import { rows } from "../../infrastructure/db/types";

/** Fetch the org's pinned engine_version. Returns null if no pin set
    (caller falls back to the latest). */
export async function getMethodologyPin(orgId: string): Promise<string | null> {
  const result = rows<OrgMethodologyPinRow>(await sql`
    SELECT org_id, engine_version, created_at, updated_at
      FROM org_methodology_pins
     WHERE org_id = ${orgId}
     LIMIT 1
  `);
  return result.length === 0 ? null : result[0].engine_version;
}

/** Set / replace the org's pin. Caller has already validated the
    engine_version against SUPPORTED_ENGINE_VERSIONS — write-time
    validation is the contract that makes reads safe. */
export async function setMethodologyPin(orgId: string, engineVersion: string): Promise<void> {
  await sql`
    INSERT INTO org_methodology_pins (org_id, engine_version)
    VALUES (${orgId}, ${engineVersion})
    ON CONFLICT (org_id) DO UPDATE
       SET engine_version = ${engineVersion},
           updated_at = NOW()
  `;
}

/** Clear the org's pin. Returns true if a row was removed. */
export async function clearMethodologyPin(orgId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM org_methodology_pins WHERE org_id = ${orgId} RETURNING org_id
  `;
  return deleted.length > 0;
}
