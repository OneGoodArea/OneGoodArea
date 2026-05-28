/* @onegoodarea/contracts — Levers (AR-197): per-org methodology pinning.

   A pin is the engine_version every response from this org will be
   stamped with when no explicit X-Engine-Version header is sent. The
   header still wins per-request. See ADR 0031. */

import { z } from "zod";

/** GET /v1/orgs/:id/methodology — `engine_version` is null when no pin
    is set (the caller will get the latest stamp on subsequent requests).
    `pinned` mirrors `engine_version !== null` and is the friendlier
    boolean for clients that just want to know "are we locked?". */
export const MethodologyPinSchema = z.object({
  engine_version: z.string().nullable(),
  pinned: z.boolean(),
}).strict();
export type MethodologyPin = z.infer<typeof MethodologyPinSchema>;

/** PUT /v1/orgs/:id/methodology — body. The server validates the value
    against SUPPORTED_ENGINE_VERSIONS (no equivalent contract-level
    enum here because the supported window evolves on the server side
    and we don't want to ship a new contracts release every time). */
export const SetMethodologyPinRequestSchema = z.object({
  engine_version: z.string().min(1),
}).strict();
export type SetMethodologyPinRequest = z.infer<typeof SetMethodologyPinRequestSchema>;
