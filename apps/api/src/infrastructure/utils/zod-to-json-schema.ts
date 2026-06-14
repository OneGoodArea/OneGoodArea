/* Utility: convert a Zod 4 schema to a JSON Schema object for Fastify's
   route .schema property. Delegates to Zod 4's built-in toJSONSchema().

   Usage:
     import { zodToJsonSchema } from "./infrastructure/utils/zod-to-json-schema";
     import { CreateOrgRequestSchema } from "@onegoodarea/contracts";

     app.post("/v1/orgs", {
       schema: {
         body: zodToJsonSchema(CreateOrgRequestSchema),
       },
     }, handler);
*/

import type { ZodSchema } from "zod";

export function zodToJsonSchema(schema: ZodSchema): Record<string, unknown> {
  return schema.toJSONSchema() as Record<string, unknown>;
}
