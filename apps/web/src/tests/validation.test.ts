import { describe, it, expect } from "vitest";
import { validateLocationInput, validateIntent } from "../lib/validation";

describe("validateLocationInput", () => {
  it("accepts valid UK locations", () => {
    const cases = ["London", "Manchester", "SW1A 1AA", "St Albans", "Bishop's Stortford", "Stoke-on-Trent"];
    for (const loc of cases) {
      const result = validateLocationInput(loc);
      expect(result.valid, `"${loc}" should be valid`).toBe(true);
      expect(result.sanitized).toBe(loc);
    }
  });

  it("trims whitespace", () => {
    const result = validateLocationInput("  London  ");
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe("London");
  });

  it("rejects empty input", () => {
    expect(validateLocationInput("").valid).toBe(false);
    expect(validateLocationInput("   ").valid).toBe(false);
    expect(validateLocationInput(null).valid).toBe(false);
    expect(validateLocationInput(undefined).valid).toBe(false);
  });

  it("rejects HTML tags (XSS)", () => {
    expect(validateLocationInput("<script>alert('xss')</script>").valid).toBe(false);
    expect(validateLocationInput("London<img src=x>").valid).toBe(false);
    expect(validateLocationInput("<div>test</div>").valid).toBe(false);
  });

  it("rejects SQL injection attempts", () => {
    expect(validateLocationInput("London; DROP TABLE users").valid).toBe(false);
    expect(validateLocationInput("' OR 1=1 --").valid).toBe(false);
    expect(validateLocationInput("London UNION SELECT * FROM users").valid).toBe(false);
    expect(validateLocationInput("test'; DELETE FROM reports;--").valid).toBe(false);
  });

  it("rejects locations that are too long", () => {
    const long = "A".repeat(101);
    expect(validateLocationInput(long).valid).toBe(false);
  });

  it("accepts locations at the max length", () => {
    const maxLen = "A".repeat(100);
    expect(validateLocationInput(maxLen).valid).toBe(true);
  });

  it("rejects special characters", () => {
    expect(validateLocationInput("London!@#$%").valid).toBe(false);
    expect(validateLocationInput("test{json}").valid).toBe(false);
  });

  it("accepts accented characters", () => {
    expect(validateLocationInput("Llanfairpwllgwyngyll").valid).toBe(true);
  });
});

describe("validateIntent", () => {
  it("accepts all 4 valid intents", () => {
    for (const intent of ["moving", "investing", "business", "research"]) {
      expect(validateIntent(intent).valid, `"${intent}" should be valid`).toBe(true);
    }
  });

  it("rejects invalid intents", () => {
    expect(validateIntent("invalid").valid).toBe(false);
    expect(validateIntent("").valid).toBe(false);
    expect(validateIntent(null).valid).toBe(false);
    expect(validateIntent(123).valid).toBe(false);
  });

  it("provides a helpful error message", () => {
    const result = validateIntent("wrong");
    expect(result.error).toContain("moving");
    expect(result.error).toContain("investing");
    expect(result.error).toContain("business");
    expect(result.error).toContain("research");
  });
});
