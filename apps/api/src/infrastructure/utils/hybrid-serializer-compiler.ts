/* AR-592: serializer counterpart to hybridValidatorCompiler (AR-546).

   AR-562 added `response` schemas to every route, mixing Zod objects
   (system.ts, orgs.ts, me.ts, ...) with plain JSON Schema (signals,
   scoring, ...). app.ts never registered a serializer compiler, so
   Fastify's default AJV-based serializer tried to read raw Zod
   objects as JSON Schema and crashed at boot with
   "FST_ERR_SCH_SERIALIZATION_BUILD ... data/required must be array".

   Same fix shape as hybridValidatorCompiler: dispatch per route.
   Zod schema goes to @fastify/type-provider-zod's serializerCompiler
   (Zod's own encode, no AJV involved); anything else goes to
   Fastify's default fast-json-stringify-based compiler. */

import { SerializerSelector } from "@fastify/fast-json-stringify-compiler";
import { serializerCompiler as zodSerializerCompiler } from "@fastify/type-provider-zod";
import type { FastifySerializerCompiler } from "fastify";

/** Same detection hybridValidatorCompiler and zodSafeJsonSchemaTransform use. */
function isZodSchema(value: unknown): boolean {
  return value !== null && typeof value === "object" && "_zod" in (value as Record<string, unknown>);
}

/* AR-629 (systemic follow-up to AR-628): the Neon driver returns timestamptz
   columns as JS Date objects, but response contracts type timestamps as
   z.string() (there are zero z.date() response fields, verified). The Zod
   serializer's safeEncode rejects a Date on a z.string() field and throws
   during serialization, OUTSIDE the route handler's try/catch, surfacing as a
   bare Fastify 500. AR-628 patched individual endpoints; this kills the whole
   class at the choke point by converting any Date to an ISO string before the
   Zod serializer validates the body.

   Scope guard: recurse only into arrays and PLAIN objects, and rewrite only
   Date instances. Non-plain objects (anything with a custom prototype /
   toJSON) are left untouched so a value that knows how to serialize itself is
   never clobbered. The tree is structurally shared (no clone) for any subtree
   that contains no Date, so a timestamp-free response pays a single shallow
   walk and no allocation. Exported for unit testing. */
export function isoifyDates(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const nv = isoifyDates(v);
      if (nv !== v) changed = true;
      return nv;
    });
    return changed ? out : value;
  }

  if (value !== null && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    // Leave non-plain objects (custom prototype / toJSON) exactly as they are.
    if (proto !== Object.prototype && proto !== null) return value;

    const source = value as Record<string, unknown>;
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      const nv = isoifyDates(source[key]);
      if (nv !== source[key]) changed = true;
      out[key] = nv;
    }
    return changed ? out : value;
  }

  return value;
}

const buildJsonSerializer = SerializerSelector()({}, {});

export const hybridSerializerCompiler: FastifySerializerCompiler<unknown> = (routeSchema) => {
  if (isZodSchema(routeSchema.schema)) {
    const encode = (zodSerializerCompiler as unknown as FastifySerializerCompiler<unknown>)(routeSchema) as (
      data: unknown,
    ) => string;
    return (data: unknown) => encode(isoifyDates(data));
  }
  return buildJsonSerializer(routeSchema as Parameters<typeof buildJsonSerializer>[0]);
};
