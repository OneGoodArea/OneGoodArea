import { describe, it, expect } from "vitest";
import { MockAiProvider } from "@/modules/engine/ai/mock-provider";

/* The mock provider is the deterministic AI test double for the orchestrator,
   so its contract is worth locking: parseable JSON echoing the prompt's AREA/
   INTENT, determinism for a given prompt, and the forced-failure path. */

const PROMPT = `AREA: Manchester
INTENT: investing
PRE-COMPUTED SCORES:
- Safety: 70/100
- Transport: 80/100
- Schools: 60/100
- Environment: 90/100
data_sources`;

describe("MockAiProvider", () => {
  it("returns parseable JSON echoing AREA and INTENT", async () => {
    const out = await new MockAiProvider().generateNarrative(PROMPT);
    const report = JSON.parse(out);
    expect(report.area).toBe("Manchester");
    expect(report.intent).toBe("investing");
    expect(Array.isArray(report.sub_scores)).toBe(true);
    expect(report.sub_scores.length).toBeGreaterThanOrEqual(4);
  });

  it("is deterministic for the same prompt", async () => {
    const a = await new MockAiProvider().generateNarrative(PROMPT);
    const b = await new MockAiProvider().generateNarrative(PROMPT);
    expect(a).toBe(b);
  });

  it("throws when forced to fail", async () => {
    await expect(
      new MockAiProvider({ forceFailure: true }).generateNarrative(PROMPT)
    ).rejects.toThrow("Mock AI forced failure");
  });
});
