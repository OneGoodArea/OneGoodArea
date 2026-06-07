/* AR-245 (Dashboard redesign Epic AR-217 — Phase 0.5): chart primitive.

   Three variants in one primitive — line / bar / sparkline. Pure SVG;
   no D3, no Recharts, no Chart.js. Small, focused, no dependency cost.

   Planned consumers (2-3 Phase 2+):
   - Forecast confidence band — POST /v1/forecast per ADR 0025 (line + band)
   - Insights peer-relative-z chart — per ADR 0024 (line / bar)
   - /api-usage page metric chart (bar — monthly)

   Plus the sparkline variant slots into StatsCard when AR-217-B5 wires
   the /dashboard Home top strip.

   Brand v3 vocabulary:
   - Hairline axes + gridlines at low ink/white opacity
   - Mono caps tick labels at the same family as DataTable headers
   - Status palette for series colours (green / amber / red)
   - Soft-warm hover tooltip with the panel material from Tooltip
   - Light + dark surface variants via data-surface

   Layout: SVG with viewBox uses pixel-equivalent coordinate system;
   width: 100% on the container so charts scale to their parent.
   Height defaults to 280px (consumer can override). Inner plot area
   accounts for axis padding (40px left / 36px bottom for axis labels,
   16px right + 16px top breathing room). Sparkline variant skips axes
   and uses a tighter padding for inline use.

   Tooltip: track mousemove on the SVG, find the nearest x-data-point,
   highlight it + render an HTML overlay above the plot point with the
   x + y values formatted via xAxis.format / yAxis.format.

   Out of scope (per Jira):
   - Stacked bars
   - Pie / donut / radar / scatter
   - Pan / zoom
   - Animated transitions
   - Legend interactivity (click to hide series) */

"use client";

import { useMemo, useRef, useState } from "react";
import "./chart-shell.css";

/* ============================================================
   Types
   ============================================================ */

export type ChartVariant = "line" | "bar" | "sparkline";

export interface ChartPoint {
  /** Category / time / numeric x. */
  x: string | number;
  /** Numeric y value. */
  y: number;
  /** Optional series key (for multi-series line variant). */
  series?: string;
}

export interface ChartSeries {
  /** Stable key — matches ChartPoint.series. */
  key: string;
  /** Display label rendered in the legend / tooltip. */
  label: string;
  /** CSS colour override. Defaults rotate through the status palette. */
  color?: string;
}

export interface ChartConfidenceBand {
  /** Lower bound points; xs must match the main data line. */
  lower: ChartPoint[];
  /** Upper bound points; xs must match the main data line. */
  upper: ChartPoint[];
}

export interface ChartAxisConfig {
  /** Optional axis label (mono caps eyebrow). */
  label?: string;
  /** Optional formatter for tick + tooltip values. */
  format?: (v: number | string) => string;
  /** Force a fixed y-domain; otherwise computed from data with 5% padding. */
  domain?: [number, number];
}

export interface ChartShellProps {
  /** Visual variant. */
  variant: ChartVariant;
  /** Data points. Multi-series via ChartPoint.series. */
  data: ChartPoint[];
  /** Multi-series config; pass when data points carry .series. */
  series?: ChartSeries[];
  /** Optional confidence band area (line variant only). */
  confidenceBand?: ChartConfidenceBand;
  /** X-axis config. */
  xAxis?: ChartAxisConfig;
  /** Y-axis config. */
  yAxis?: ChartAxisConfig;
  /** Chart height in pixels. Default 280 (line / bar) or 48 (sparkline). */
  height?: number;
  /** Surface variant. Default "light". */
  surface?: "light" | "dark";
  /** Accessible label for the chart. */
  "aria-label"?: string;

  /* ----- Optional editorial header ----- */

  /** Small mono caps eyebrow above the title (e.g. "Forecast",
      "Peer comparison"). Same recipe as `.oga-eyebrow`. */
  eyebrow?: string;
  /** Main chart title in Geist sans. */
  title?: string;
  /** Caption below the title — supporting context (date range,
      methodology note, etc.). */
  caption?: string;
  /** When true, render the chart "raw" with no surface container
      around it — for embedding inside another card (e.g. StatsCard
      sparkline slot, dashboard tile body). Default false. Sparkline
      variant defaults to raw=true since it's always embedded. */
  raw?: boolean;
}

/* ============================================================
   Constants
   ============================================================ */

/* Default series colour rotation — ink-first editorial palette.
   Status colours (green / amber / red) MEAN status; they're not
   appropriate as default data colours. Consumers pass
   series.color explicitly when they actually want a status-keyed
   line. Light surface uses ink shades; dark inverts to warm-white
   shades via CSS custom properties defined in chart-shell.css. */
const DEFAULT_SERIES_COLORS = [
  "var(--oga-chart-series-1)",
  "var(--oga-chart-series-2)",
  "var(--oga-chart-series-3)",
];

/* Plot padding (line + bar variants). The y-axis label column lives
   OUTSIDE the SVG in a fixed-pixel sibling column (see CSS); the
   SVG's left padding is just breathing room between that column and
   the first chart point. Bottom padding is generous so the bottom
   y-label (e.g. "1.2k") has clear breathing room above the x-axis
   labels (e.g. "Jun 06") instead of crowding into them. Sparkline
   gets tighter padding all round. */
const PAD = { top: 16, right: 16, bottom: 56, left: 12 };
const SPARK_PAD = { top: 2, right: 2, bottom: 2, left: 2 };
const SVG_VIEW_WIDTH = 600;

/* ============================================================
   Component
   ============================================================ */

export function ChartShell({
  variant,
  data,
  series,
  confidenceBand,
  xAxis,
  yAxis,
  height,
  surface = "light",
  "aria-label": ariaLabel = "Chart",
  eyebrow,
  title,
  caption,
  raw,
}: ChartShellProps) {
  const isRaw = raw ?? variant === "sparkline";
  const hasHeader = !isRaw && (eyebrow || title || caption);
  const resolvedHeight = height ?? (variant === "sparkline" ? 48 : 280);
  const pad = variant === "sparkline" ? SPARK_PAD : PAD;

  /* Compute plot area dimensions in viewBox units. */
  const plotWidth = SVG_VIEW_WIDTH - pad.left - pad.right;
  const plotHeight = resolvedHeight - pad.top - pad.bottom;

  /* Group data by series. Single-series default if no series array. */
  const seriesMap = useMemo(() => {
    if (!series || series.length === 0) {
      return new Map<string, { meta: ChartSeries; points: ChartPoint[] }>([
        [
          "__default",
          {
            meta: { key: "__default", label: "Series", color: DEFAULT_SERIES_COLORS[0] },
            points: data,
          },
        ],
      ]);
    }
    const map = new Map<string, { meta: ChartSeries; points: ChartPoint[] }>();
    series.forEach((s, i) => {
      const color = s.color ?? DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
      map.set(s.key, { meta: { ...s, color }, points: [] });
    });
    data.forEach((p) => {
      const key = p.series ?? series[0]?.key ?? "__default";
      const entry = map.get(key);
      if (entry) entry.points.push(p);
    });
    return map;
  }, [data, series]);

  /* X scale — uses index for categorical / string xs, numeric for number xs. */
  const allXs = data.map((p) => p.x);
  const xIsNumeric = allXs.every((x) => typeof x === "number");
  const xValues = xIsNumeric ? (allXs as number[]) : allXs.map((_, i) => i);
  const xMin = xIsNumeric ? Math.min(...xValues) : 0;
  const xMax = xIsNumeric ? Math.max(...xValues) : Math.max(0, xValues.length - 1);

  /* Y scale — domain from data (with 5% padding), or override. */
  const allYs = useMemo(() => {
    const ys = data.map((p) => p.y);
    if (confidenceBand) {
      ys.push(...confidenceBand.lower.map((p) => p.y));
      ys.push(...confidenceBand.upper.map((p) => p.y));
    }
    return ys;
  }, [data, confidenceBand]);

  const yDomain: [number, number] = useMemo(() => {
    if (yAxis?.domain) return yAxis.domain;
    const yMin = Math.min(...allYs);
    const yMax = Math.max(...allYs);
    const span = yMax - yMin || 1;
    const paddedMin = yMin - span * 0.05;
    const paddedMax = yMax + span * 0.05;
    /* Snap the domain to the first and last nice tick so the chart
       top + bottom edges align with the rounded gridline labels.
       Without this the chart fits the padded data range exactly,
       and nice ticks (which extend slightly past) would render
       outside the visible plot area. */
    const ticks = niceTicks(paddedMin, paddedMax, 5);
    return [ticks[0], ticks[ticks.length - 1]];
  }, [yAxis, allYs]);

  /* Scale functions: data value → pixel position inside the plot area. */
  function scaleX(v: number): number {
    if (xMax === xMin) return pad.left + plotWidth / 2;
    return pad.left + ((v - xMin) / (xMax - xMin)) * plotWidth;
  }
  function scaleY(v: number): number {
    if (yDomain[1] === yDomain[0]) return pad.top + plotHeight / 2;
    return pad.top + (1 - (v - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight;
  }

  /* Y-axis ticks — round, human-readable values across the domain.
     Naive (min + step*i) generation lands on floating-point gunk
     like 1473.14999999 and 250.89000001 which then stringify as
     12-digit labels that overflow the y-axis column. niceTicks
     picks tick values rounded to nice multiples of {1, 2, 5}×10^k
     so labels stay short, readable, and proportional. */
  const yTicks = useMemo(() => {
    if (variant === "sparkline") return [];
    return niceTicks(yDomain[0], yDomain[1], 5);
  }, [yDomain, variant]);

  /* Hover state for the tooltip. */
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<{
    pointIndex: number;
    seriesKey: string;
    pixelX: number;
    pixelY: number;
  } | null>(null);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (variant === "sparkline") return; // no tooltip on sparkline
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    /* Convert mouse position to viewBox coordinates. */
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_VIEW_WIDTH;
    /* Find nearest x-data-point across all series. */
    let nearest: typeof hovered = null;
    let nearestDist = Infinity;
    seriesMap.forEach((entry) => {
      entry.points.forEach((p, i) => {
        const xVal = xIsNumeric ? (p.x as number) : data.indexOf(p);
        const px = scaleX(xVal);
        const dist = Math.abs(px - mouseX);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = {
            pointIndex: i,
            seriesKey: entry.meta.key,
            pixelX: px,
            pixelY: scaleY(p.y),
          };
        }
      });
    });
    setHovered(nearest);
  }

  function handleMouseLeave() {
    setHovered(null);
  }

  const hoveredPoint = hovered
    ? seriesMap.get(hovered.seriesKey)?.points[hovered.pointIndex]
    : null;
  const hoveredSeries = hovered ? seriesMap.get(hovered.seriesKey)?.meta : null;

  return (
    <div
      className="oga-chart-shell"
      data-surface={surface}
      data-variant={variant}
      data-raw={isRaw ? "true" : undefined}
    >
      {hasHeader ? (
        <header className="oga-chart-shell__header">
          {eyebrow ? <p className="oga-chart-shell__eyebrow">{eyebrow}</p> : null}
          {title ? <h3 className="oga-chart-shell__title">{title}</h3> : null}
          {caption ? <p className="oga-chart-shell__caption">{caption}</p> : null}
        </header>
      ) : null}
      <div
        className="oga-chart-shell__container"
        data-chart-height={resolvedHeight}
        style={{
          /* Baseline percentage flows to the x-label overlay's top
             so labels sit just below the chart baseline regardless
             of height prop or container width. */
          ["--oga-chart-baseline-pct" as string]: `${((pad.top + plotHeight) / resolvedHeight) * 100}%`,
        }}
      >
        {/* ---------- Y-axis labels (fixed-width column on the left) ----------
            Y-axis tick labels live in their own column OUTSIDE the
            SVG so they keep proportional sizes at any container
            width and never overlap the chart plot area. Vertical
            position uses percentages so labels track the gridlines
            as the SVG height scales. */}
        {variant !== "sparkline" ? (
          <ol className="oga-chart-shell__y-labels" aria-hidden="true">
            {yTicks.map((tick, i) => {
              const label = yAxis?.format ? yAxis.format(tick) : formatNumber(tick);
              const topPct = (scaleY(tick) / resolvedHeight) * 100;
              return (
                <li
                  key={`y-label-${i}`}
                  className="oga-chart-shell__y-label"
                  style={{ top: `${topPct}%` }}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        ) : null}

        <div className="oga-chart-shell__plot">
        <svg
          ref={svgRef}
          className="oga-chart-shell__svg"
          viewBox={`0 0 ${SVG_VIEW_WIDTH} ${resolvedHeight}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* ---------- Y-axis gridlines ----------
              Tick labels render as HTML overlay (below the SVG)
              so they don't stretch with preserveAspectRatio="none". */}
          {variant !== "sparkline" &&
            yTicks.map((tick, i) => {
              const y = scaleY(tick);
              return (
                <line
                  key={`y-${i}`}
                  className="oga-chart-shell__gridline"
                  x1={pad.left}
                  y1={y}
                  x2={SVG_VIEW_WIDTH - pad.right}
                  y2={y}
                />
              );
            })}

          {/* ---------- X-axis baseline ---------- */}
          {variant !== "sparkline" && (
            <line
              className="oga-chart-shell__axis"
              x1={pad.left}
              y1={pad.top + plotHeight}
              x2={SVG_VIEW_WIDTH - pad.right}
              y2={pad.top + plotHeight}
            />
          )}

          {/* ---------- Confidence band (line variant) ---------- */}
          {variant === "line" && confidenceBand && confidenceBand.upper.length > 0 ? (
            <path
              className="oga-chart-shell__band"
              d={buildBandPath(
                confidenceBand.upper,
                confidenceBand.lower,
                scaleX,
                scaleY,
                xIsNumeric,
                data,
              )}
            />
          ) : null}

          {/* ---------- Line variant ---------- */}
          {(variant === "line" || variant === "sparkline") &&
            Array.from(seriesMap.values()).map((entry) => {
              const path = buildLinePath(
                entry.points,
                scaleX,
                scaleY,
                xIsNumeric,
                data,
              );
              return (
                <g key={entry.meta.key}>
                  <path
                    className="oga-chart-shell__line"
                    d={path}
                    style={{ stroke: entry.meta.color }}
                  />
                  {variant === "line" &&
                    entry.points.map((p, i) => {
                      const xVal = xIsNumeric ? (p.x as number) : data.indexOf(p);
                      return (
                        <circle
                          key={i}
                          className="oga-chart-shell__point"
                          cx={scaleX(xVal)}
                          cy={scaleY(p.y)}
                          r={hovered?.seriesKey === entry.meta.key && hovered?.pointIndex === i ? 4 : 2.5}
                          style={{ fill: entry.meta.color }}
                        />
                      );
                    })}
                </g>
              );
            })}

          {/* ---------- Bar variant ---------- */}
          {variant === "bar" &&
            data.map((p, i) => {
              const xVal = xIsNumeric ? (p.x as number) : i;
              const barWidth = Math.max(2, (plotWidth / Math.max(1, data.length)) * 0.7);
              const cx = scaleX(xVal);
              const y = scaleY(p.y);
              const baseY = scaleY(Math.max(0, yDomain[0]));
              return (
                <rect
                  key={i}
                  className="oga-chart-shell__bar"
                  x={cx - barWidth / 2}
                  y={Math.min(y, baseY)}
                  width={barWidth}
                  height={Math.abs(baseY - y)}
                  style={{ fill: DEFAULT_SERIES_COLORS[0] }}
                />
              );
            })}

          {/* ---------- X-axis tick labels ---------- */}
          {/* ---------- Hover crosshair + highlighted point ---------- */}
          {hovered && variant !== "sparkline" ? (
            <line
              className="oga-chart-shell__crosshair"
              x1={hovered.pixelX}
              y1={pad.top}
              x2={hovered.pixelX}
              y2={pad.top + plotHeight}
            />
          ) : null}
        </svg>

        {/* ---------- X-axis tick labels (HTML overlay) ---------- */}
        {variant !== "sparkline" ? (
          <ol className="oga-chart-shell__x-labels" aria-hidden="true">
            {data.map((p, i) => {
              /* Show every Nth label so they don't crash together. */
              const step = Math.max(1, Math.ceil(data.length / 8));
              if (i % step !== 0 && i !== data.length - 1) return null;
              const xVal = xIsNumeric ? (p.x as number) : i;
              const label = xAxis?.format ? xAxis.format(p.x) : String(p.x);
              const leftPct = (scaleX(xVal) / SVG_VIEW_WIDTH) * 100;
              return (
                <li
                  key={`x-label-${i}`}
                  className="oga-chart-shell__x-label"
                  style={{ left: `${leftPct}%` }}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        ) : null}

        {/* ---------- Tooltip ---------- */}
        {hovered && hoveredPoint && hoveredSeries && variant !== "sparkline" ? (
          <div
            className="oga-chart-shell__tooltip"
            data-tooltip-x={Math.round((hovered.pixelX / SVG_VIEW_WIDTH) * 100)}
            data-tooltip-y={Math.round((hovered.pixelY / resolvedHeight) * 100)}
            style={{
              left: `${(hovered.pixelX / SVG_VIEW_WIDTH) * 100}%`,
              top: `${(hovered.pixelY / resolvedHeight) * 100}%`,
            }}
            role="status"
            aria-live="polite"
          >
            <div className="oga-chart-shell__tooltip-x">
              {xAxis?.format ? xAxis.format(hoveredPoint.x) : String(hoveredPoint.x)}
            </div>
            <div className="oga-chart-shell__tooltip-y">
              <span
                aria-hidden
                className="oga-chart-shell__tooltip-swatch"
                style={{ background: hoveredSeries.color }}
              />
              {hoveredSeries.label !== "Series" ? `${hoveredSeries.label}: ` : ""}
              {yAxis?.format ? yAxis.format(hoveredPoint.y) : formatNumber(hoveredPoint.y)}
            </div>
          </div>
        ) : null}
        </div>
      </div>

      {/* ---------- Legend (line / bar with multi-series) ---------- */}
      {variant !== "sparkline" && series && series.length > 0 ? (
        <ol className="oga-chart-shell__legend">
          {Array.from(seriesMap.values())
            .filter((e) => e.meta.key !== "__default")
            .map((entry) => (
              <li key={entry.meta.key} className="oga-chart-shell__legend-item">
                <span
                  aria-hidden
                  className="oga-chart-shell__legend-swatch"
                  style={{ background: entry.meta.color }}
                />
                <span>{entry.meta.label}</span>
              </li>
            ))}
        </ol>
      ) : null}
    </div>
  );
}

/* ============================================================
   SVG path builders
   ============================================================ */

function buildLinePath(
  points: ChartPoint[],
  scaleX: (v: number) => number,
  scaleY: (v: number) => number,
  xIsNumeric: boolean,
  allData: ChartPoint[],
): string {
  if (points.length === 0) return "";
  const parts: string[] = [];
  points.forEach((p, i) => {
    const xVal = xIsNumeric ? (p.x as number) : allData.indexOf(p);
    const x = scaleX(xVal);
    const y = scaleY(p.y);
    parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  });
  return parts.join(" ");
}

function buildBandPath(
  upper: ChartPoint[],
  lower: ChartPoint[],
  scaleX: (v: number) => number,
  scaleY: (v: number) => number,
  xIsNumeric: boolean,
  allData: ChartPoint[],
): string {
  if (upper.length === 0 || lower.length === 0) return "";
  const parts: string[] = [];
  upper.forEach((p, i) => {
    const xVal = xIsNumeric ? (p.x as number) : allData.indexOf(p);
    const x = scaleX(xVal);
    const y = scaleY(p.y);
    parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  });
  for (let i = lower.length - 1; i >= 0; i--) {
    const p = lower[i];
    const xVal = xIsNumeric ? (p.x as number) : allData.indexOf(p);
    const x = scaleX(xVal);
    const y = scaleY(p.y);
    parts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

/* Default number formatter — k/M abbreviations for big numbers,
   strips trailing zeros (so "2.0k" -> "2k", "1.5k" stays). */
function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${trimZeros((n / 1_000_000).toFixed(1))}M`;
  if (Math.abs(n) >= 1_000) return `${trimZeros((n / 1_000).toFixed(1))}k`;
  if (Number.isInteger(n)) return n.toString();
  return trimZeros(n.toFixed(2));
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/* "Nice" tick value generation — picks tick values rounded to the
   nearest {1, 2, 5}×10^k step that covers the [min, max] data
   range with roughly `count` ticks. Result is round numbers like
   [100, 150, 200, 250] instead of floating-point gunk like
   [94.91, 133.905, 172.9, 211.895, 250.89000001].

   Algorithm (standard d3-style):
   1. Estimate raw step = range / (count - 1)
   2. Snap step to the next "nice" number — one of {1, 2, 5} times a
      power of 10 chosen to cover the raw step
   3. Generate ticks from floor(min/step)*step up through ceil(max/step)*step
   4. Round each tick to the step's precision to eliminate any
      remaining floating-point accumulation drift */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max || !Number.isFinite(min) || !Number.isFinite(max)) {
    return [min];
  }
  const range = max - min;
  const roughStep = range / Math.max(1, count - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  let step: number;
  if (normalized < 1.5) step = 1;
  else if (normalized < 3) step = 2;
  else if (normalized < 7) step = 5;
  else step = 10;
  step *= magnitude;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  /* Derive a sensible decimal precision from the step (e.g. step=0.5
     -> 1 decimal, step=10 -> 0 decimals) so we can round each tick
     and kill any residual floating-point error from the loop. */
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.0001; v += step) {
    ticks.push(Number(v.toFixed(decimals)));
  }
  return ticks;
}
