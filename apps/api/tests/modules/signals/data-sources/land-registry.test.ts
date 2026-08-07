import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { getPropertyPrices, getPropertyTransactions, formatPropertyDataForPrompt, clearPropertyCache } from "@/modules/signals/data-sources/land-registry";
import type { PropertyPriceData } from "@/modules/signals/inputs";

/* MSW intercepts the Land Registry SPARQL endpoint. Dates are built relative
   to now so the current-year / prior-year split is deterministic. Locks the
   median/mean, by-type grouping, tenure split, YoY change and empty paths. */

const ENDPOINT = "http://landregistry.data.gov.uk/landregistry/query";
const COMMON = "http://landregistry.data.gov.uk/def/common";

function isoMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

function binding(price: number, date: string, type: string, estate: string) {
  return {
    price: { value: String(price) },
    date: { value: date },
    type: { value: `${COMMON}/${type}` },
    estate: { value: `${COMMON}/${estate}` },
  };
}

function sparql(bindings: ReturnType<typeof binding>[]) {
  return HttpResponse.json({ results: { bindings } });
}

describe("getPropertyPrices", () => {
  beforeEach(() => clearPropertyCache());

  it("computes median/mean, by-type, tenure and YoY change", async () => {
    const recent = isoMonthsAgo(2);
    const prior = isoMonthsAgo(18);
    server.use(
      http.post(ENDPOINT, () =>
        sparql([
          binding(300000, recent, "detached", "freehold"),
          binding(250000, recent, "detached", "freehold"),
          binding(200000, recent, "terraced", "leasehold"),
          // 5 prior-year sales -> prior median established (needs >= 5)
          ...Array.from({ length: 5 }, () => binding(200000, prior, "detached", "freehold")),
        ])
      )
    );

    const r = await getPropertyPrices("M1 1AE");
    expect(r).not.toBeNull();
    const d = r!;
    expect(d.postcode_area).toBe("M1");
    expect(d.transaction_count).toBe(3); // current year only
    expect(d.median_price).toBe(250000);
    expect(d.mean_price).toBe(250000);
    expect(d.by_property_type).toEqual([
      { type: "Detached", median: 275000, count: 2 },
      { type: "Terraced", median: 200000, count: 1 },
    ]);
    expect(d.tenure_split).toEqual({ freehold: 2, leasehold: 1 });
    expect(d.price_range).toEqual({ min: 200000, max: 300000 });
    expect(d.prior_median).toBe(200000);
    expect(d.price_change_pct).toBe(25); // (250k-200k)/200k
  });

  it("returns null when there are no bindings", async () => {
    server.use(http.post(ENDPOINT, () => sparql([])));
    expect(await getPropertyPrices("M1 1AE")).toBeNull();
  });

  it("returns null when all sales are older than a year", async () => {
    const prior = isoMonthsAgo(18);
    server.use(http.post(ENDPOINT, () => sparql([binding(200000, prior, "detached", "freehold")])));
    expect(await getPropertyPrices("M1 1AE")).toBeNull();
  });

  it("caches result so second call for same outcode skips HTTP (AR-678)", async () => {
    const recent = isoMonthsAgo(2);
    let callCount = 0;
    server.use(
      http.post(ENDPOINT, () => {
        callCount++;
        return sparql([binding(300000, recent, "detached", "freehold")]);
      })
    );

    const first = await getPropertyPrices("M1 1AE");
    expect(first).not.toBeNull();
    expect(callCount).toBe(1);

    const second = await getPropertyPrices("M1 1AE");
    expect(second).toEqual(first);
    expect(callCount).toBe(1);
  });

  it("clearPropertyCache forces a fresh HTTP fetch", async () => {
    const recent = isoMonthsAgo(2);
    let callCount = 0;
    server.use(
      http.post(ENDPOINT, () => {
        callCount++;
        return sparql([binding(300000, recent, "detached", "freehold")]);
      })
    );

    await getPropertyPrices("M1 1AE");
    expect(callCount).toBe(1);

    clearPropertyCache();
    await getPropertyPrices("M1 1AE");
    expect(callCount).toBe(2);
  });
});

describe("getPropertyTransactions", () => {
  beforeEach(() => clearPropertyCache());

  it("returns last-12-month sales newest-first with labels", async () => {
    const recent = isoMonthsAgo(2);
    const mid = isoMonthsAgo(6);
    const prior = isoMonthsAgo(18);
    server.use(
      http.post(ENDPOINT, () =>
        sparql([
          binding(300000, recent, "detached", "freehold"),
          binding(200000, mid, "flat-maisonette", "leasehold"),
          // prior-year sales are excluded from the transactions list
          ...Array.from({ length: 5 }, () => binding(200000, prior, "detached", "freehold")),
        ])
      )
    );

    const txs = await getPropertyTransactions("M1 1AE");
    expect(txs).not.toBeNull();
    expect(txs).toHaveLength(2);
    // newest first
    expect(txs![0]).toEqual({ date: recent, price: 300000, property_type: "Detached", estate_type: "freehold" });
    expect(txs![1]).toEqual({ date: mid, price: 200000, property_type: "Flat", estate_type: "leasehold" });
  });

  it("excludes current-year sales below/equal zero price", async () => {
    const recent = isoMonthsAgo(2);
    server.use(
      http.post(ENDPOINT, () =>
        sparql([
          binding(300000, recent, "detached", "freehold"),
          binding(0, recent, "terraced", "leasehold"),
          binding(-5, recent, "terraced", "leasehold"),
        ])
      )
    );

    const txs = await getPropertyTransactions("M1 1AE");
    expect(txs).not.toBeNull();
    expect(txs).toHaveLength(1);
    expect(txs![0].price).toBe(300000);
  });

  it("returns null when there are no bindings", async () => {
    server.use(http.post(ENDPOINT, () => sparql([])));
    expect(await getPropertyTransactions("M1 1AE")).toBeNull();
  });

  it("returns null when all sales are older than a year", async () => {
    const prior = isoMonthsAgo(18);
    server.use(http.post(ENDPOINT, () => sparql([binding(200000, prior, "detached", "freehold")])));
    expect(await getPropertyTransactions("M1 1AE")).toBeNull();
  });

  it("shares the cache with getPropertyPrices so one HTTP fetch serves both (AR-758)", async () => {
    const recent = isoMonthsAgo(2);
    let callCount = 0;
    server.use(
      http.post(ENDPOINT, () => {
        callCount++;
        return sparql([binding(300000, recent, "detached", "freehold")]);
      })
    );

    const prices = await getPropertyPrices("M1 1AE");
    const txs = await getPropertyTransactions("M1 1AE");
    expect(prices).not.toBeNull();
    expect(txs).not.toBeNull();
    expect(callCount).toBe(1);
  });
});

describe("formatPropertyDataForPrompt", () => {
  it("renders prices, YoY direction and tenure", () => {
    const data: PropertyPriceData = {
      postcode_area: "M1",
      median_price: 250000,
      mean_price: 250000,
      transaction_count: 3,
      price_change_pct: 25,
      by_property_type: [{ type: "Detached", median: 275000, count: 2 }],
      tenure_split: { freehold: 2, leasehold: 1 },
      price_range: { min: 200000, max: 300000 },
      period: "Jan 2025 to Jan 2026",
      prior_median: 200000,
    };
    const out = formatPropertyDataForPrompt(data);
    expect(out).toContain("HM Land Registry Price Paid");
    expect(out).toContain("Median sold price: £250,000");
    expect(out).toContain("YoY change: up 25%");
    expect(out).toContain("67% freehold, 33% leasehold");
  });
});
