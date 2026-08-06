import { describe, it, expect } from "vitest";
import { INTENTS, INTENT_WORKFLOW } from "@onegoodarea/contracts";
import { ESTATE_AGENT_INTENT_LABELS } from "@/lib/showcase/estate-agent-labels";

/* AR-739: the estate-agents demo re-labels the four scoring presets demo-locally
   without touching INTENT_WORKFLOW in contracts. */

describe("ESTATE_AGENT_INTENT_LABELS (AR-739)", () => {
  it("maps the four presets to estate-agent vocabulary", () => {
    expect(ESTATE_AGENT_INTENT_LABELS.moving).toBe("For sale");
    expect(ESTATE_AGENT_INTENT_LABELS.business).toBe("Lettings");
    expect(ESTATE_AGENT_INTENT_LABELS.investing).toBe("Investment");
    expect(ESTATE_AGENT_INTENT_LABELS.research).toBe("Reference");
  });

  it("covers every canonical intent", () => {
    for (const intent of INTENTS) {
      expect(ESTATE_AGENT_INTENT_LABELS[intent]).toBeTypeOf("string");
    }
  });

  it("leaves the canonical INTENT_WORKFLOW labels untouched", () => {
    expect(INTENT_WORKFLOW.moving).toBe("Origination");
    expect(INTENT_WORKFLOW.business).toBe("Site selection");
    expect(INTENT_WORKFLOW.investing).toBe("Investment");
    expect(INTENT_WORKFLOW.research).toBe("Reference");
  });
});
