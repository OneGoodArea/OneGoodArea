import { describe, it, expect } from "vitest";
import { INTENTS, isIntent, intentLabel, INTENT_WORKFLOW, type Intent } from "../src/index";

describe("@onegoodarea/contracts — Intent", () => {
  it("exposes the four canonical intents in a stable order", () => {
    expect(INTENTS).toEqual(["moving", "business", "investing", "research"]);
  });

  it("isIntent accepts every canonical intent", () => {
    for (const intent of INTENTS) {
      expect(isIntent(intent)).toBe(true);
    }
  });

  it("isIntent rejects non-intents", () => {
    expect(isIntent("buying")).toBe(false);
    expect(isIntent("")).toBe(false);
    expect(isIntent(42)).toBe(false);
    expect(isIntent(null)).toBe(false);
    expect(isIntent(undefined)).toBe(false);
  });

  it("narrows the type after isIntent", () => {
    const raw: unknown = "investing";
    if (isIntent(raw)) {
      const intent: Intent = raw; // compiles only if narrowed
      expect(intent).toBe("investing");
    }
  });
});

describe("@onegoodarea/contracts — intent workflow labels", () => {
  it("maps every intent to a workflow label", () => {
    expect(INTENT_WORKFLOW).toEqual({
      moving: "Origination",
      business: "Site selection",
      investing: "Investment",
      research: "Reference",
    });
  });

  it("intentLabel returns the workflow label for each enum", () => {
    expect(intentLabel("moving")).toBe("Origination");
    expect(intentLabel("business")).toBe("Site selection");
    expect(intentLabel("investing")).toBe("Investment");
    expect(intentLabel("research")).toBe("Reference");
  });

  it("intentLabel returns empty string for nullish, and falls back for unknowns", () => {
    expect(intentLabel(null)).toBe("");
    expect(intentLabel(undefined)).toBe("");
    expect(intentLabel("")).toBe("");
    expect(intentLabel("future_intent")).toBe("future_intent");
  });
});
