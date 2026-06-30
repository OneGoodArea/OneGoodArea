import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { getFloodRisk, formatFloodRiskForPrompt, clearFloodCache } from "@/modules/signals/data-sources/flood";
import type { FloodRiskData } from "@/modules/signals/inputs";

/* MSW intercepts the two Environment Agency endpoints (flood areas + active
   warnings, fetched in parallel). Locks the aggregation, river dedup, the
   empty-response path, the risk-level wording in the formatter, and (AR-396)
   the TTL cache around the EA lookups. */

const AREAS = "https://environment.data.gov.uk/flood-monitoring/id/floodAreas";
const FLOODS = "https://environment.data.gov.uk/flood-monitoring/id/floods";

/* AR-396 added a module-level cache; reset between every test so cache
   carry-over from one test can't pre-warm the next. */
beforeEach(() => {
  clearFloodCache();
});

describe("getFloodRisk", () => {
  it("aggregates areas + warnings and dedups rivers", async () => {
    server.use(
      http.get(AREAS, () =>
        HttpResponse.json({
          items: [
            { label: "River Mersey reach 1", riverOrSea: "River Mersey" },
            { label: "River Mersey reach 2", riverOrSea: "River Mersey" },
            { label: "Bridgewater Canal", riverOrSea: "Bridgewater Canal" },
          ],
        })
      ),
      http.get(FLOODS, () =>
        HttpResponse.json({
          items: [{ description: "Flood warning for the Mersey", severity: "Flood Warning", severityLevel: 2, message: "Act now" }],
        })
      )
    );

    const r = await getFloodRisk(53.4, -2.2);
    expect(r).not.toBeNull();
    expect(r!.flood_areas_nearby).toBe(3);
    expect(r!.rivers_at_risk).toEqual(["River Mersey", "Bridgewater Canal"]);
    expect(r!.active_warnings).toHaveLength(1);
    expect(r!.active_warnings[0].severityLevel).toBe(2);
  });

  it("handles empty responses without throwing", async () => {
    server.use(
      http.get(AREAS, () => HttpResponse.json({})),
      http.get(FLOODS, () => HttpResponse.json({}))
    );
    const r = await getFloodRisk(53.4, -2.2);
    expect(r).toEqual<FloodRiskData>({ flood_areas_nearby: 0, rivers_at_risk: [], active_warnings: [] });
  });
});

describe("getFloodRisk caching (AR-396)", () => {
  it("serves a cached value on the second call (no second EA round-trip)", async () => {
    let calls = 0;
    server.use(
      http.get(AREAS, () => {
        calls += 1;
        return HttpResponse.json({ items: [{ label: "X", riverOrSea: "R" }] });
      }),
      http.get(FLOODS, () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
    );
    const first = await getFloodRisk(53.4, -2.2);
    expect(calls).toBe(2);
    const second = await getFloodRisk(53.4, -2.2);
    expect(calls).toBe(2); // unchanged: second hit was cached
    expect(second).toEqual(first);
  });

  it("treats coords within ~10m as the same cache key (3 decimal places)", async () => {
    let calls = 0;
    server.use(
      http.get(AREAS, () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(FLOODS, () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
    );
    await getFloodRisk(53.4001, -2.2001);
    await getFloodRisk(53.4002, -2.2002); // rounds to the same key
    expect(calls).toBe(2); // only the first call hit the network
  });

  it("treats coords past 3 decimal places as different cache keys", async () => {
    let calls = 0;
    server.use(
      http.get(AREAS, () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(FLOODS, () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
    );
    await getFloodRisk(53.400, -2.200);
    await getFloodRisk(53.500, -2.300); // different LSOA, different key
    expect(calls).toBe(4);
  });

  it("caches null results too (sustained EA outage doesn't keep paying the timeout)", async () => {
    let calls = 0;
    server.use(
      http.get(AREAS, () => {
        calls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
      http.get(FLOODS, () => {
        calls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    /* The 500s yield two empty Promise.all results (areasRes.ok = false,
       warningsRes.ok = false), which still resolves to an empty
       FloodRiskData object. Cache that too — the next call shouldn't
       re-hit the failing API. */
    const first = await getFloodRisk(53.4, -2.2);
    expect(calls).toBe(2);
    const second = await getFloodRisk(53.4, -2.2);
    expect(calls).toBe(2);
    expect(second).toEqual(first);
  });
});

describe("formatFloodRiskForPrompt", () => {
  it("reports elevated risk when a severe warning is active", () => {
    const data: FloodRiskData = {
      flood_areas_nearby: 2,
      rivers_at_risk: ["River Mersey"],
      active_warnings: [{ description: "Severe", severity: "Severe Flood Warning", severityLevel: 1, message: "" }],
    };
    const out = formatFloodRiskForPrompt(data);
    expect(out).toContain("ACTIVE FLOOD WARNINGS (1)");
    expect(out).toContain("Elevated");
  });

  it("reports very low risk with no areas or warnings", () => {
    const out = formatFloodRiskForPrompt({ flood_areas_nearby: 0, rivers_at_risk: [], active_warnings: [] });
    expect(out).toContain("Very Low");
    expect(out).toContain("Active flood warnings: None");
  });
});
