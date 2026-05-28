import { describe, expect, it } from "vitest";
import { MockAiProvider } from "@/lib/ai/providers/mock-provider";

describe("MockAiProvider", () => {
  it("returns deterministic json for the same prompt", async () => {
    const provider = new MockAiProvider();
    const prompt = "AREA: Leeds\nINTENT: research\nPRE-COMPUTED SCORES\n- Dimension A: 70\n- Dimension B: 80";

    const first = await provider.generateNarrative(prompt);
    const second = await provider.generateNarrative(prompt);

    expect(first).toBe(second);
    expect(JSON.parse(first)).toMatchObject({
      area: "Leeds",
      intent: "research",
    });
  });

  it("can force failures", async () => {
    const provider = new MockAiProvider({ forceFailure: true });

    await expect(provider.generateNarrative("AREA: Leeds\nINTENT: research")).rejects.toThrow(
      "Mock AI forced failure",
    );
  });
});
