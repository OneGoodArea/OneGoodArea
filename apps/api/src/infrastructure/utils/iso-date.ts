/* AR-628: the Neon serverless driver returns timestamptz/timestamp columns
   as JS Date objects, even though the DAL row types label them `string` (a
   long-standing type-lie; see infrastructure/db/types.ts). API response
   contracts type these fields as ISO strings, and the Zod response serializer
   (AR-592, @fastify/type-provider-zod safeEncode) rejects a Date where the
   schema says z.string(). That throw happens during serialization, OUTSIDE
   the route handler's try/catch, so it surfaces as a bare Fastify 500
   ("Internal Server Error") rather than the handler's own error body.

   Normalize at the response boundary: any handler that puts a raw DB
   timestamp into a Zod-serialized response must pass it through here. Robust
   whether the driver hands back a Date (production) or already a string
   (older drivers / test mocks / already-coerced values). */

/** Coerce a DB timestamp (Date | string | null | undefined) to an ISO-8601
    string, or null. Use for nullable timestamp response fields. */
export function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}
