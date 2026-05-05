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
});
