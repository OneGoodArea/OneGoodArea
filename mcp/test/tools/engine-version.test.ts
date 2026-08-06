import { describe, it, expect } from "vitest";
import { engineVersionToolDef, executeEngineVersion } from "../../src/tools/engine-version.js";

describe("engineVersionToolDef", () => {
  it("takes no required args", () => {
    expect(engineVersionToolDef.inputSchema.properties).toEqual({});
    expect(engineVersionToolDef.inputSchema.additionalProperties).toBe(false);
  });
});

describe("executeEngineVersion", () => {
  it("returns the current version + changelog", () => {
    const out = executeEngineVersion();
    expect(out.content[0]!.type).toBe("text");
    expect(out.content[0]!.text).toContain("OneGoodArea engine 1.1.0");
    expect(out.content[0]!.text).toContain("Released:");
    expect(out.content[0]!.text).toContain("Changelog");
  });

  it("includes link to methodology page", () => {
    expect(executeEngineVersion().content[0]!.text).toContain("/methodology");
  });
});
