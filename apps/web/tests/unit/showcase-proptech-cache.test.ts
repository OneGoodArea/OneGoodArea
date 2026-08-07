import { describe, it, expect } from "vitest";
import { remember } from "@/modules/showcase-proptech/cache";

describe("showcase-proptech cache", () => {
  describe("remember", () => {
    it("returns the same reference for an identical response", async () => {
      const response = { postcode_area: "M21", transaction_count: 3 };
      const first = await remember(response);
      const second = await remember({ postcode_area: "M21", transaction_count: 3 });
      expect(second).toBe(first);
    });

    it("keeps distinct responses distinct", async () => {
      const a = { transaction_count: 1 };
      const b = { transaction_count: 2 };
      expect(await remember(a)).toBe(a);
      expect(await remember(b)).toBe(b);
    });

    it("keys by the serialized body, so key order is significant", async () => {
      const a = { pc: "M21", count: 3 };
      const b = { count: 3, pc: "M21" };
      const ra = await remember(a);
      const rb = await remember(b);
      expect(ra).toBe(a);
      expect(rb).toBe(b);
      expect(rb).not.toBe(ra);
    });

    it("stores primitives and nested data", async () => {
      const payload = { transactions: [{ date: "2026-07-01", price: 425000 }] };
      expect(await remember(payload)).toBe(payload);
      expect(await remember("plain")).toBe("plain");
    });
  });
});
