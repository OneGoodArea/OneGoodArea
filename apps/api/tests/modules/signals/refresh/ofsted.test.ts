import { describe, it, expect } from "vitest";
import {
  extractLatestCsvUrl,
  parseAsAtDate,
  ratingText,
  parseSchools,
} from "@/modules/signals/refresh/ofsted";

describe("extractLatestCsvUrl", () => {
  // Mirrors the live page: many monthly snapshots listed oldest-first, mixed
  // abbreviated/full month names, plus the year-to-date file we must ignore.
  const html = `
    <a href="https://assets.publishing.service.gov.uk/media/aaa/Management_information_-_state-funded_schools_-_all_inspections_-_year_to_date_published_by_30_June_2026.csv">All</a>
    <a href="https://assets.publishing.service.gov.uk/media/bbb/Management_information_-_state-funded_schools_-_latest_inspections_as_at_31_Oct_2023.csv">Old</a>
    <a href="https://assets.publishing.service.gov.uk/media/ccc/Management_information_-_state-funded_schools_-_latest_inspections_as_at_30_June_2026.csv">Newest</a>
    <a href="https://assets.publishing.service.gov.uk/media/ddd/Management_information_-_state-funded_schools_-_latest_inspections_as_at_31_May_2026.csv">Mid</a>
  `;

  it("picks the NEWEST 'latest inspections' CSV, ignoring order and the year-to-date file", () => {
    expect(extractLatestCsvUrl(html)).toBe(
      "https://assets.publishing.service.gov.uk/media/ccc/Management_information_-_state-funded_schools_-_latest_inspections_as_at_30_June_2026.csv",
    );
  });

  it("returns null when no matching CSV link exists", () => {
    expect(extractLatestCsvUrl("<a href='https://example.com/x.pdf'>x</a>")).toBeNull();
  });
});

describe("parseAsAtDate", () => {
  it("parses the as-at date, handling abbreviated and full month names", () => {
    expect(parseAsAtDate("https://x/foo_latest_inspections_as_at_30_June_2026.csv")).toBe("2026-06-30");
    expect(parseAsAtDate("https://x/foo_latest_inspections_as_at_31_Oct_2023.csv")).toBe("2023-10-31");
    expect(parseAsAtDate("https://x/foo_latest_inspections_as_at_31_October_2025.csv")).toBe("2025-10-31");
    expect(parseAsAtDate("https://x/foo_as_at_1_Mar_2026.csv")).toBe("2026-03-01");
  });

  it("returns null when there is no as-at date", () => {
    expect(parseAsAtDate("https://x/nodate.csv")).toBeNull();
  });
});

describe("ratingText", () => {
  it("maps overall-effectiveness codes to labels", () => {
    expect(ratingText("1")).toBe("Outstanding");
    expect(ratingText("2")).toBe("Good");
    expect(ratingText("4")).toBe("Inadequate");
    expect(ratingText("9")).toBeNull();
  });
});

describe("parseSchools", () => {
  const csv = [
    "URN,School name,Ofsted phase,Postcode,Overall effectiveness,Inspection start date",
    "100000,Alpha Primary,Primary,M1 1AE,2,2025-01-15",
    '100001,Beta School,Secondary,"EC1A 1BB",1,2025-02-20',
    "100002,No Rating School,Primary,LS6 4DP,,2025-03-01",
    "notanumber,Bad URN,Primary,SW1A 1AA,2,2025-01-01",
  ].join("\n");

  it("parses rated schools and normalizes postcodes", () => {
    const rows = parseSchools(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      urn: 100000,
      postcode: "M11AE",
      overall_effectiveness: 2,
      rating_text: "Good",
    });
    expect(rows[1]).toMatchObject({ urn: 100001, postcode: "EC1A1BB", rating_text: "Outstanding" });
  });

  it("skips schools without a 1-4 rating and rows with a bad URN", () => {
    const rows = parseSchools(csv);
    expect(rows.find((r) => r.school_name === "No Rating School")).toBeUndefined();
    expect(rows.find((r) => r.school_name === "Bad URN")).toBeUndefined();
  });

  it("throws when required columns are missing", () => {
    expect(() => parseSchools("Foo,Bar\n1,2")).toThrow(/missing required columns/);
  });
});
