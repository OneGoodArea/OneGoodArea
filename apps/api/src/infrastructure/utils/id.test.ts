import { describe, it, expect } from "vitest";
import { generateId } from "./id";

describe("generateId", () => {
  it("returns a string with the correct prefix", () => {
    const id = generateId("user");
    expect(id).toMatch(/^user_/);
  });

  it("includes a timestamp component", () => {
    const before = Date.now();
    const id = generateId("evt");
    const after = Date.now();
    const parts = id.split("_");
    const ts = Number(parts[1]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("includes a random suffix", () => {
    const id = generateId("key");
    const parts = id.split("_");
    expect(parts[2]).toBeDefined();
    expect(parts[2].length).toBe(6);
  });

  it("supports custom random length", () => {
    const id = generateId("rpt", 8);
    const parts = id.split("_");
    expect(parts[2].length).toBe(8);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId("test")));
    expect(ids.size).toBe(100);
  });

  it("works with all standard prefixes", () => {
    const prefixes = ["user", "evt", "key", "rpt", "sub", "prt", "s", "toast"];
    for (const prefix of prefixes) {
      const id = generateId(prefix);
      expect(id.startsWith(`${prefix}_`)).toBe(true);
    }
  });
});
