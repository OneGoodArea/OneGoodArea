import type { Intent } from "@onegoodarea/contracts";

/* AR-739: demo-local tab labels for the estate-agents showcase. Scoring presets
   are ICP-agnostic; only the tab vocabulary changes for this demo. The canonical
   INTENT_WORKFLOW labels in contracts are untouched. */
export const ESTATE_AGENT_INTENT_LABELS: Record<Intent, string> = {
  moving: "For sale",
  business: "Lettings",
  investing: "Investment",
  research: "Reference",
};
