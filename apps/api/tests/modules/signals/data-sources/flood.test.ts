import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { getFloodRisk, formatFloodRiskForPrompt } from "@/modules/signals/data-sources/flood";
import type { FloodRiskData } from "@/modules/signals/inputs";

/* MSW intercepts the two Environment Agency endpoints (flood areas + active
   warnings, fetched in parallel). Locks the aggregation, river dedup, the
   empty-response path, and the risk-level wording in the formatter. */

const AREAS = "https://environment.data.gov.uk/flood-monitoring/id/floodAreas";
const FLOODS = "https://environment.data.gov.uk/flood-monitoring/id/floods";

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
