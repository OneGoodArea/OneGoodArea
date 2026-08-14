import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runAmenitiesRefresh,
  findLsoaCentroids,
  type AmenitiesRefreshDeps,
} from "@/modules/signals/refresh/amenities";
import type { QueryRunner } from "@/modules/signals/refresh/store-writer";

/* A fake runner that records every SQL call. Default: the candidate LSOAs
   get a centroid; others get none. */
function makeRunner(initial: unknown[] = [], centroids: unknown[] = [
  { lsoa_code: "E01005207", lat: 53.47, lng: -2.23 },
]): { run: QueryRunner; calls: string[] } {
  const calls: string[] = [];
  const run: QueryRunner = async (text) => {
    calls.push(text);
    if (text.includes("SELECT DISTINCT geo_code")) return initial as unknown[];
    if (text.includes("geo_lookup")) return centroids as unknown[];
    return [] as unknown[];
  };
  return { run, calls };
}

const LIVE_AMENITIES = {
  schools: 5, restaurants_cafes: 25, pubs_bars: 4, healthcare: 3, shops: 18,
  parks_leisure: 7, transport_stations: 2, bus_stops: 11, total: 75, highlights: ["Fresh Bake"],
};

describe("findLsoaCentroids", () => {
  it("returns an empty map when there are no LSOAs", async () => {
    const { run } = makeRunner();
    expect(await findLsoaCentroids([], run)).toEqual(new Map());
  });

  it("averages postcode lat/lng per LSOA", async () => {
    const run: QueryRunner = async () => [
      { lsoa_code: "E01005207", lat: 53.47, lng: -2.23 },
      { lsoa_code: "E01005208", lat: null, lng: null },
    ] as unknown[];
    const out = await findLsoaCentroids(["E01005207", "E01005208"], run);
    expect(out.get("E01005207")).toEqual({ latitude: 53.47, longitude: -2.23 });
    expect(out.has("E01005208")).toBe(false); // null coords are skipped
  });
});

describe("runAmenitiesRefresh (one-shot)", () => {
  const staleCandidates = [
    { geo_code: "E01005207" },
    { geo_code: "E01005208" }, // no centroid -> skipped_no_coords
  ];

  beforeEach(() => { vi.restoreAllMocks(); });

  function deps(run: QueryRunner, overrides: Partial<AmenitiesRefreshDeps> = {}): AmenitiesRefreshDeps {
    return {
      run,
      gapMsBetweenCalls: 0,
      staleAfterHours: 168,
      fetchLive: vi.fn(async () => LIVE_AMENITIES),
      ...overrides,
    };
  }

  it("refreshes stale rows and reports the summary", async () => {
    const { run } = makeRunner(staleCandidates);
    const fetchLive = vi.fn(async () => LIVE_AMENITIES);
    const summary = await runAmenitiesRefresh(deps(run, { fetchLive }));

    expect(fetchLive).toHaveBeenCalledWith(53.47, -2.23);
    expect(summary).toMatchObject({ candidates: 2, stale: 2, refreshed: 1, skipped_no_coords: 1, failures: 0 });
    expect(summary.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("counts a null live result as a failure", async () => {
    const { run } = makeRunner(staleCandidates);
    const fetchLive = vi.fn(async () => null);
    const summary = await runAmenitiesRefresh(deps(run, { fetchLive }));

    expect(fetchLive).toHaveBeenCalledOnce();
    expect(summary).toMatchObject({ refreshed: 0, failures: 1 });
  });

  it("paces calls with gapMsBetweenCalls", async () => {
    const { run } = makeRunner([{ geo_code: "E01005207" }, { geo_code: "E01005207" }]);
    const fetchLive = vi.fn(async () => LIVE_AMENITIES);
    const sleepSpy = vi.spyOn(globalThis, "setTimeout");
    await runAmenitiesRefresh(deps(run, { fetchLive, gapMsBetweenCalls: 10 }));

    expect(fetchLive).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalled();
  });

  it("propagates a runner failure as an error", async () => {
    const run: QueryRunner = async () => { throw new Error("db down"); };
    await expect(runAmenitiesRefresh(deps(run))).rejects.toThrow("db down");
  });
});
