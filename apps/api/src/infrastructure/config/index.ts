/* Backend configuration boundary.

   apps/api is a standalone containerised service: config comes straight from
   process.env (the container/orchestrator injects it). This deliberately does
   NOT port the legacy Next runtime/env subsystem, which reads .env files off
   the project root at runtime - that behaviour is specific to the Next app and
   does not fit a long-running service. Add fields here as modules need them. */

export interface ApiConfig {
  /** AI narration provider: "anthropic" (default) or "mock" for local/tests. */
  aiProvider: string;
}

export function getConfig(): ApiConfig {
  return {
    aiProvider: process.env.OGA_AI_PROVIDER ?? "anthropic",
  };
}
