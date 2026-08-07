export type TabId = "signals" | "scores" | "monitor";

export const TABS: { id: TabId; label: string; blurb: string }[] = [
  {
    id: "signals",
    label: "Signals",
    blurb: "Source-backed area metrics for any UK postcode, one call.",
  },
  {
    id: "scores",
    label: "Scores",
    blurb: "One headline number, weighted for the decision you are making.",
  },
  {
    id: "monitor",
    label: "Monitor",
    blurb: "Track up to 10 areas in a shared demo portfolio, scored live.",
  },
];

export const SIGNAL_CATEGORY_LABELS: Record<string, string> = {
  crime: "Crime & Safety",
  deprivation: "Deprivation",
  property: "Property Market",
  schools: "Schools & Education",
  transport: "Transport & Connectivity",
  environment: "Environment & Flood Risk",
};

export const PRESET_LABELS: Record<string, string> = {
  moving: "Moving home",
  business: "Business growth",
  investing: "Investing",
  research: "Research",
};

export const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
