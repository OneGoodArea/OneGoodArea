/* AR-546: validator compiler that dispatches on schema type.

   AR-501 added route schemas in BOTH styles:
   - Zod (me.ts, org-*.ts, orgs.ts, contact.ts, which use withTypeProvider<ZodTypeProvider>)
   - plain JSON Schema (signals, scoring, intelligence, portfolios, webhooks)

   AR-525 then set the Zod-only validatorCompiler globally. A Zod compiler
   cannot compile a plain JSON Schema object, so every JSON Schema route
   crashed at request time with
   "FST_ERR_VALIDATION: Cannot read properties of undefined (reading 'run')".
   Deleting the Zod compiler instead would break the Zod routes, since AJV
   cannot compile a Zod object. Neither style can be dropped without
   reverting AR-501 work, so the compiler dispatches per route.

   Same shape as zodSafeJsonSchemaTransform, which already solves this exact
   mismatch on the OpenAPI docs side. */

import AjvCompiler from "@fastify/ajv-compiler";
import { validatorCompiler as zodValidatorCompiler } from "@fastify/type-provider-zod";
import type { FastifySchemaCompiler } from "fastify";

/** Zod schemas carry the internal `_zod` marker in Zod v4. Same detection the
    OpenAPI transform uses, kept deliberately identical so the two stay in sync. */
function isZodSchema(value: unknown): boolean {
  return value !== null && typeof value === "object" && "_zod" in (value as Record<string, unknown>);
}

/* Fastify's own default validator, built with the same AJV options passed to
   Fastify() in app.ts so the JSON Schema routes validate exactly as they did
   before AR-525. `example` is a documentation keyword the route schemas use;
   AJV must be told to allow it. */
const buildAjvValidator = AjvCompiler()(
  {},
  { customOptions: { keywords: ["example"] } },
);

/**
 * Route-level validator compiler. Zod schema goes to the Zod compiler, anything
 * else to Fastify's default AJV compiler.
 */
export const hybridValidatorCompiler: FastifySchemaCompiler<unknown> = (routeSchema) => {
  if (isZodSchema(routeSchema.schema)) {
    return (zodValidatorCompiler as unknown as FastifySchemaCompiler<unknown>)(routeSchema);
  }
  return buildAjvValidator(routeSchema as Parameters<typeof buildAjvValidator>[0]);
};
