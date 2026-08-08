import { describe, it, expect } from "vitest";
import { formatPercentage, TABS } from "@/modules/showcase-proptech/constants";

describe("showcase-proptech constants", () => {
  describe("formatPercentage", () => {
    it("scales a 0-1 fraction to a percentage", () => {
      expect(formatPercentage(0.79)).toBe("79%");
      expect(formatPercentage(1)).toBe("100%");
      expect(formatPercentage(0)).toBe("0%");
    });

    it("rounds to the nearest whole percent", () => {
      expect(formatPercentage(0.225)).toBe("23%");
      expect(formatPercentage(0.224)).toBe("22%");
    });
  });

  describe("tabs", () => {
    it("uses a portfolio tab instead of the old monitor tab", () => {
      const ids = TABS.map((t) => t.id);
      expect(ids).toContain("portfolio");
      expect(ids).not.toContain("monitor");
    });

    it("mentions the 20-area cap in the portfolio blurb", () => {
      const portfolio = TABS.find((t) => t.id === "portfolio");
      expect(portfolio?.blurb).toContain("20 areas");
    });

    it("exposes a price changes tab", () => {
      const ids = TABS.map((t) => t.id);
      expect(ids).toContain("price");
      const price = TABS.find((t) => t.id === "price");
      expect(price?.blurb).toContain("Forecast");
    });
  });
});
