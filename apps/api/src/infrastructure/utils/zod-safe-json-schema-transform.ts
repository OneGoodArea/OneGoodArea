/* Custom jsonSchemaTransform for @fastify/swagger that handles both Zod v4
   schemas (via .toJSONSchema()) and plain JSON Schema objects.

   The stock jsonSchemaTransform from @fastify/type-provider-zod@1.0.0 only
   handles Zod schemas — passing a plain JSON Schema body object causes
   zodSchemaToJson to crash with "Cannot read properties of undefined
   (reading 'parent')".

   This transform detects the schema type and:
   - Zod schemas: convert via native .toJSONSchema()
   - Plain JSON Schema objects: pass through unchanged
   - undefined/missing: skip
*/

import type { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

function isZodSchema(value: unknown): value is { toJSONSchema(): Record<string, unknown> } {
  return value !== null && typeof value === "object" && "_zod" in (value as Record<string, unknown>);
}

function transformSchema(schema: unknown): unknown {
  if (!schema) return schema;
  if (isZodSchema(schema)) {
    return schema.toJSONSchema();
  }
  return schema;
}

export const zodSafeJsonSchemaTransform: FastifyDynamicSwaggerOptions["transform"] = (document) => {
  const { schema, url } = document;
  if (!schema) return { schema, url };

  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "response" && typeof value === "object" && value !== null) {
      transformed.response = {};
      for (const [statusCode, respSchema] of Object.entries(value as Record<string, unknown>)) {
        (transformed.response as Record<string, unknown>)[statusCode] = transformSchema(respSchema);
      }
    } else if (["body", "params", "querystring", "headers"].includes(key)) {
      transformed[key] = transformSchema(value);
    } else {
      transformed[key] = value;
    }
  }

  /* The transformed shape is structurally a route schema again, but its values
     are now JSON Schema rather than Zod, which the parameter type does not
     describe. Cast through the declared return type instead of `any`. */
  return { schema: transformed, url } as ReturnType<
    NonNullable<FastifyDynamicSwaggerOptions["transform"]>
  >;
};
