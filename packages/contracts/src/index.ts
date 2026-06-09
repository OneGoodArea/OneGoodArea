/* @onegoodarea/contracts — the shared type surface for apps/web + apps/api.

   Phase 0 scaffold (separation impl plan): the canonical Intent type and the
   core query shape, so frontend and backend share ONE definition instead of
   drifting. Zod runtime schemas + the full DTO set land in Phase 2.

   Hard rule for this package: types + pure helpers only. No DB drivers, no
   secrets, no Node-only APIs — it is imported by the browser bundle. */

/* The signal-first primitive (Signal, AreaGeo, AreaProfile, AreaType) — the
   public shape the data layer is built around. Re-exported here so consumers
   can import everything from "@onegoodarea/contracts". AreaType is also imported
   locally below because the report shape references it. */
export * from "./signals";
export * from "./scores";
export * from "./portfolios";
export * from "./intelligence";
export * from "./orgs";
export * from "./bundles";
export * from "./presets";
export * from "./methodology";
export * from "./cohorts";
export * from "./users";
export * from "./activity";
import type { AreaType } from "./signals";

/** The four scoring intents the engine supports. Canonical source of truth. */
export const INTENTS = ["moving", "business", "investing", "research"] as const;
export type Intent = (typeof INTENTS)[number];

/** Runtime guard — use at trust boundaries (API input, query params). */
export function isIntent(value: unknown): value is Intent {
  return typeof value === "string" && (INTENTS as readonly string[]).includes(value);
}

/* AR-149: intent enum -> B2B workflow vocabulary. The enum names
   (moving/business/investing/research) are historical (v1 consumer product) and
   stay on the API contract + DB for backwards compatibility. Every user-visible
   surface (dashboard, report view, emails, marketing) uses these workflow
   labels. Migrated from the legacy src/lib/intents.ts into contracts so web +
   api share ONE definition. */
export const INTENT_WORKFLOW: Record<Intent, string> = {
  moving: "Origination",
  business: "Site selection",
  investing: "Investment",
  research: "Reference",
};

/** Long-form workflow description, for hover/tooltip surfaces. */
export const INTENT_WORKFLOW_DESCRIPTION: Record<Intent, string> = {
  moving: "Residential mortgage origination scoring. Used by lenders for portfolio screening, origination decisions, and demand-side risk enrichment.",
  business: "Commercial site selection. Used by retail, F&B, and CRE teams scoring candidate locations across thousands of postcodes.",
  investing: "Residential property investment screening. Used by BTL operators, BTR funds, and investment committees evaluating acquisitions.",
  research: "Neutral baseline scoring for analysts, planners, and researchers. Equal weight across the five dimensions.",
};

/** The customer-facing workflow label for an intent enum. Falls back to the raw
 *  string for unknown values (forward-compatible if a new enum is ever added). */
export function intentLabel(intent: Intent | string | null | undefined): string {
  if (!intent) return "";
  return INTENT_WORKFLOW[intent as Intent] ?? intent;
}

/** A single-area scoring query (the shape behind POST /v1/report today). */
export interface AreaQuery {
  /** Free-text area or postcode, e.g. "M1 1AE" or "Clapham". */
  area: string;
  intent: Intent;
}

/* ── Report shape ──
   The decision-grade report the engine produces and the web/PDF surfaces
   render. Migrated VERBATIM from the legacy src/lib/types.ts so both apps
   share ONE definition. (Intent above is the canonical source; the legacy
   file re-declared it locally.) Zod runtime schemas land in Phase 2. */

export interface SubScore {
  label: string;
  score: number;
  weight: number;
  summary: string;
  reasoning?: string;
  confidence?: number;          // 0.0-1.0, derived from data quality. Optional for back-compat with cached pre-2026-04-26 reports.
  confidence_reason?: string;   // Human-readable explanation of the confidence value.
}

export interface ReportSection {
  title: string;
  content: string;
  data_points?: { label: string; value: string }[];
}

/* AreaType is the canonical signal-first type, re-exported above from ./signals
   (single source: the Zod-inferred AreaTypeSchema). Used by the report shape
   below. */

export interface DataFreshness {
  source: string;
  period: string;
  status: "live" | "recent" | "static";
}

export interface PropertyMarketData {
  postcode_area: string;
  median_price: number;
  mean_price: number;
  transaction_count: number;
  price_change_pct: number | null;
  by_property_type: { type: string; median: number; count: number }[];
  tenure_split: { freehold: number; leasehold: number };
  price_range: { min: number; max: number };
  period: string;
}

export interface SchoolInfo {
  name: string;
  phase: string;
  rating: string;
  distance_km: number;
}

export interface SchoolsData {
  schools: SchoolInfo[];
  rating_breakdown: Record<string, number>;
  inspectorate: string;
}

export interface AreaReport {
  area: string;
  intent: Intent;
  areaiq_score: number;
  area_type?: AreaType;
  sub_scores: SubScore[];
  summary: string;
  sections: ReportSection[];
  recommendations: string[];
  data_sources?: string[];
  data_freshness?: DataFreshness[];
  property_data?: PropertyMarketData;
  schools_data?: SchoolsData;
  confidence?: number;          // Aggregate confidence across dimensions, 0.0-1.0. Optional for back-compat.
  engine_version?: string;      // Methodology version that produced this report (e.g. "2.0.0"). Optional for back-compat.
  generated_at: string;
}

export interface ReportRecord {
  id: string;
  area: string;
  intent: Intent;
  country: string;
  report: AreaReport;
  score: number;
  created_at: string;
}
