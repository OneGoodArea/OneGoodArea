/* AR-352: the methodology version registry moved to @onegoodarea/contracts
   so apps/api and apps/web share a single source of truth. This file is
   now a re-export shim — preserves the import path for the 10+ in-repo
   consumers across the engine, signals, intelligence, routes, etc. */

export {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  type MethodologyVersion,
  getCurrentMethodology,
  getMethodologyByVersion,
} from "@onegoodarea/contracts";
