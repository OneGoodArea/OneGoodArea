/**
 * Shared markdown formatter for the Signals tools (AR-366).
 *
 * Both `get_area_signals` and `get_signals_by_category` return the same
 * AreaProfile shape; this module renders it consistently. Every line is
 * a real field from the response — no client-side text synthesis.
 */

import type { OogaAreaProfile, OogaSignal, SignalCategory } from "../api-client.js";

/** Format a Signal value for display. Numbers get optional comma thousands
    separators when they're large; strings render verbatim; null → "—". */
function formatValue(s: OogaSignal): string {
  if (s.value === null) return "—";
  if (typeof s.value === "string") return s.value;
  const n = s.value;

  /* Currency: render as £42,500 with no decimals. */
  if (s.unit === "GBP") return `£${Math.round(n).toLocaleString("en-GB")}`;

  /* Percent: render with one decimal + suffix. */
  if (s.unit === "pct") return `${n.toFixed(1)}%`;

  /* Integer-like units. */
  if (s.unit === "count" || s.unit === "rank" || s.unit === "decile") {
    return Math.round(n).toLocaleString("en-GB");
  }

  /* Per-period. */
  if (s.unit === "per_month") return `${n.toFixed(1)} / mo`;

  /* Default: number as-is. */
  return n.toLocaleString("en-GB");
}

function formatPercentile(p: number): string {
  /* Use one decimal only when the value would otherwise round away. */
  if (p === Math.round(p)) return `${p}th percentile`;
  return `${p.toFixed(1)}th percentile`;
}

function renderSignal(s: OogaSignal): string[] {
  const lines: string[] = [];
  const unit = s.unit ? ` ${s.unit}` : "";
  const valueLine = `**${s.label}**: ${formatValue(s)}${s.value !== null && s.unit && !["GBP", "pct"].includes(s.unit) ? unit : ""}`;
  lines.push(`- ${valueLine}`);

  /* Percentile (store-backed only). */
  if (typeof s.percentile === "number") {
    lines.push(`  ${formatPercentile(s.percentile)} (direction: ${s.direction.replace(/_/g, " ")})`);
  }

  /* Confidence with engine-grounded reason. */
  lines.push(`  Confidence ${(s.confidence * 100).toFixed(0)}% · ${s.confidence_reason}`);

  /* Provenance. */
  lines.push(`  Source: ${s.source} · ${s.observed_period}`);

  return lines;
}

/** Format an AreaProfile as a markdown brief. If `restrictTo` is given,
    only that category renders (used by get_signals_by_category). */
export function formatAreaProfileAsText(
  profile: OogaAreaProfile,
  restrictTo?: SignalCategory,
): string {
  const lines: string[] = [];
  const geo = profile.geo;

  /* Headline. */
  const headlineParts = [geo.query];
  if (geo.postcode && geo.postcode !== geo.query) headlineParts.push(`(${geo.postcode})`);
  if (restrictTo) headlineParts.push(`— ${restrictTo}`);
  lines.push(`# ${headlineParts.join(" ")}`);
  lines.push(`Engine version: ${profile.meta.engine_version} · Fetch mode: ${profile.meta.fetch_mode}`);
  lines.push("");

  /* Geo summary line. */
  const geoBits: string[] = [];
  if (geo.admin_district) geoBits.push(geo.admin_district);
  if (geo.region) geoBits.push(geo.region);
  geoBits.push(geo.country);
  geoBits.push(`${geo.area_type} area`);
  if (geo.lsoa) geoBits.push(`LSOA ${geo.lsoa}`);
  lines.push(`**Area:** ${geoBits.join(" · ")}`);
  lines.push("");

  /* Group signals by category (preserves category order from the data
     since /v1/area returns them in that order; filter() preserves order). */
  const signals = restrictTo
    ? profile.signals.filter((s) => s.category === restrictTo)
    : profile.signals;

  if (signals.length === 0) {
    lines.push(restrictTo
      ? `No ${restrictTo} signals returned for this area.`
      : "No signals returned for this area.");
    return lines.join("\n").trimEnd();
  }

  const byCategory = new Map<SignalCategory, OogaSignal[]>();
  for (const s of signals) {
    const cat = s.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(s);
  }

  /* Category header per group when not restricted; just one flat list
     when restricted (the category is already in the document title). */
  for (const [category, group] of byCategory) {
    if (!restrictTo) {
      lines.push(`## ${category}`);
    }
    for (const s of group) {
      for (const line of renderSignal(s)) lines.push(line);
    }
    lines.push("");
  }

  /* Sources footer (deduplicated, from the response meta). */
  if (profile.meta.sources.length > 0) {
    lines.push(`## Data sources`);
    lines.push(profile.meta.sources.join(" · "));
  }

  return lines.join("\n").trimEnd();
}
