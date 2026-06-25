/* AR-352: the methodology version registry moved to @onegoodarea/contracts
   so apps/api and apps/web share a single source of truth. This file is
   now a re-export shim — preserves the @/lib/methodology-versions import
   path for the 11 in-repo consumers across marketing + dashboard pages. */

export {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  type MethodologyVersion,
  getCurrentMethodology,
  getMethodologyByVersion,
} from "@onegoodarea/contracts";
