import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sql } from "@/infrastructure/db/client";
import { getOfstedSchools, formatOfstedForPrompt } from "@/modules/signals/data-sources/ofsted";
import type { OfstedData } from "@/modules/signals/inputs";

/* ofsted reads a local DB table (no network). We mock the sql client and lock
   the England-only guard, the no-rows path, the 1.5km haversine filter, the
   rating-text fallback, and the prompt formatter. */

const mockSql = vi.mocked(sql);

beforeEach(() => mockSql.mockReset());

describe("getOfstedSchools", () => {
  it("returns null for non-England without querying", async () => {
    expect(await getOfstedSchools(53.4, -2.2, "Scotland")).toBeNull();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("returns null when no rows are in the bounding box", async () => {
    mockSql.mockResolvedValue([] as never);
    expect(await getOfstedSchools(53.4, -2.2)).toBeNull();
  });

  it("keeps schools within 1.5km, drops the rest, and builds the breakdown", async () => {
    mockSql.mockResolvedValue([
      // ~0km away (same coords) -> kept; rating_text null exercises the fallback
      {
        urn: 1, school_name: "Near Primary", phase: "Primary",
        overall_effectiveness: 1, rating_text: null, inspection_date: "2024-01-01",
        latitude: 53.4, longitude: -2.2,
      },
      // ~11km away -> dropped
      {
        urn: 2, school_name: "Far Secondary", phase: "Secondary",
        overall_effectiveness: 2, rating_text: "Good", inspection_date: "2023-06-01",
        latitude: 53.5, longitude: -2.2,
      },
    ] as never);

    const r = await getOfstedSchools(53.4, -2.2);
    expect(r).not.toBeNull();
    const d = r!;
    expect(d.total_rated).toBe(1);
    expect(d.schools).toHaveLength(1);
    expect(d.schools[0].school_name).toBe("Near Primary");
    expect(d.schools[0].rating_text).toBe("Outstanding"); // fallback from rating 1
    expect(d.schools[0].distance_km).toBe(0);
    expect(d.rating_breakdown).toEqual({ Outstanding: 1 });
  });
});

describe("formatOfstedForPrompt", () => {
  it("renders inspectorate, breakdown and the school list", () => {
    const data: OfstedData = {
      schools: [
        { urn: 1, school_name: "St Mary's", phase: "Primary", overall_rating: 1, rating_text: "Outstanding", inspection_date: "2024-01-01", distance_km: 0.3 },
      ],
      total_rated: 1,
      rating_breakdown: { Outstanding: 1 },
      inspectorate: "Ofsted",
    };
    const out = formatOfstedForPrompt(data);
    expect(out).toContain("Source: Ofsted");
    expect(out).toContain("1 Outstanding");
    expect(out).toContain("St Mary's (Primary): Outstanding (inspected 2024-01-01) [0.3km]");
  });
});
