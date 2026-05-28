import { describe, it, expect } from "vitest";
import { PortfolioSchema, PortfolioDetailSchema, PortfolioEnrichItemSchema } from "../src/portfolios";

describe("portfolio DTOs", () => {
  it("parses a portfolio summary", () => {
    expect(PortfolioSchema.parse({ id: "pf_1", name: "My book", area_count: 3 }).area_count).toBe(3);
  });

  it("parses a portfolio detail with areas", () => {
    const d = PortfolioDetailSchema.parse({
      id: "pf_1", name: "A", area_count: 1,
      areas: [{ id: "pfa_1", area: "M1 1AE", label: null }],
    });
    expect(d.areas[0]?.area).toBe("M1 1AE");
  });

  it("parses an enrich item (score or error)", () => {
    expect(PortfolioEnrichItemSchema.parse({ area: "M1 1AE", label: null, score: null, error: "Could not resolve area" }).error).toBeTruthy();
  });
});
