import { describe, it, expect } from "vitest";
import {
  methodologyForToolDef,
  parseMethodologyForArgs,
  executeMethodologyFor,
} from "./methodology-for.js";

describe("methodologyForToolDef", () => {
  it("requires dimension", () => {
    expect(methodologyForToolDef.inputSchema.required).toEqual(["dimension"]);
  });

  it("description lists recognised dimensions", () => {
    expect(methodologyForToolDef.description).toContain("Safety & Crime");
    expect(methodologyForToolDef.description).toContain("Transport");
  });
});

describe("parseMethodologyForArgs", () => {
  it("accepts valid input", () => {
    expect(parseMethodologyForArgs({ dimension: "Safety" })).toEqual({ dimension: "Safety" });
  });

  it("trims whitespace", () => {
    expect(parseMethodologyForArgs({ dimension: "  Schools  " }).dimension).toBe("Schools");
  });

  it("rejects empty string", () => {
    expect(() => parseMethodologyForArgs({ dimension: "" })).toThrow();
    expect(() => parseMethodologyForArgs({ dimension: "   " })).toThrow();
  });
});

describe("executeMethodologyFor", () => {
  it("returns methodology for exact dimension name", () => {
    const out = executeMethodologyFor({ dimension: "Safety & Crime" });
    expect(out.isError).toBeFalsy();
    expect(out.content[0].text).toContain("# Safety & Crime");
    expect(out.content[0].text).toContain("Police.uk");
    expect(out.content[0].text).toContain("moving");
  });

  it("matches case-insensitively", () => {
    const out = executeMethodologyFor({ dimension: "SAFETY & crime" });
    expect(out.isError).toBeFalsy();
    expect(out.content[0].text).toContain("Safety & Crime");
  });

  it("matches partial query (substring)", () => {
    const out = executeMethodologyFor({ dimension: "transport" });
    expect(out.isError).toBeFalsy();
    expect(out.content[0].text).toContain("Transport");
    expect(out.content[0].text).toContain("OpenStreetMap");
  });

  it("returns error with available list when unknown dimension", () => {
    const out = executeMethodologyFor({ dimension: "made-up dimension" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("No methodology found");
    expect(out.content[0].text).toContain("Safety & Crime");
  });

  it("includes per-intent weights for the dimension", () => {
    const out = executeMethodologyFor({ dimension: "Cost of Living" });
    expect(out.content[0].text).toContain("moving");
    expect(out.content[0].text).toContain("20%");
  });

  it("includes link to full methodology page", () => {
    const out = executeMethodologyFor({ dimension: "Schools" });
    expect(out.content[0].text).toContain("/methodology");
  });

  /* AR-391: "Used in intents" header must agree with the weights
     table — derived from non-zero weights, NOT the static intents
     field which had drifted. Safety & Crime previously read
     "Used in intents: moving, research" but had non-zero weights
     for all 4 presets. */
  it("derives 'Used in intents' from non-zero weights (no header/table drift)", () => {
    const out = executeMethodologyFor({ dimension: "Safety & Crime" });
    const text = out.content[0].text;
    // Header reflects ALL 4 presets (all have non-zero weight).
    expect(text).toMatch(/Used in intents:.*moving.*business.*investing.*research/s);
  });

  it("'Used in intents' excludes zero-weight presets", () => {
    // Schools has business: 0, so it should NOT appear in the header.
    const out = executeMethodologyFor({ dimension: "Schools" });
    const text = out.content[0].text;
    const header = text.split("\n").find((l) => l.startsWith("**Used in intents:"));
    expect(header).toBeDefined();
    expect(header).not.toContain("business");
  });
});
