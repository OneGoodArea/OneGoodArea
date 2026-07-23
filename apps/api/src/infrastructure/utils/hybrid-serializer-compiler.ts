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

const buildJsonSerializer = SerializerSelector()({}, {});

export const hybridSerializerCompiler: FastifySerializerCompiler<unknown> = (routeSchema) => {
  if (isZodSchema(routeSchema.schema)) {
    return (zodSerializerCompiler as unknown as FastifySerializerCompiler<unknown>)(routeSchema);
  }
  return buildJsonSerializer(routeSchema as Parameters<typeof buildJsonSerializer>[0]);
};
