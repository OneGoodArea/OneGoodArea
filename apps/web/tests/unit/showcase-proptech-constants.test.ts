import { describe, it, expect } from "vitest";
import { formatPercentage } from "@/modules/showcase-proptech/constants";

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
});
