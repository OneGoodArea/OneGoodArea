/**
 * MCP tool: get_portfolio_changes (AR-368)
 *
 * Check a Monitor portfolio for material signal changes between two
 * time-series periods. Wraps POST /v1/portfolios/:id/changes (with
 * emit:false — the MCP shouldn't fire webhooks on a probe call).
 *
 * Returns the change report rendered as markdown: scope (baseline,
 * threshold, min_transactions), counts (areas_checked, material_count),
 * and a per-area table of material signal moves.
 */

import type { OogaApiClient, OogaChangeReport, OogaSignalChange } from "../api-client.js";
import { OogaApiError } from "../api-client.js";

export const getPortfolioChangesToolName = "get_portfolio_changes";

export const getPortfolioChangesToolDef = {
  name: getPortfolioChangesToolName,
  description:
    "Check a Monitor portfolio for material signal changes between two time-series periods. " +
    "Returns the portfolio's baseline + threshold settings, counts of areas checked and material changes, and a per-area table of every material signal move (with direction, from/to values, delta, and percent change). " +
    "Use this after watch_portfolio has set up tracking — typically with default threshold_pct, or tighter when you want only large moves.",
  inputSchema: {
    type: "object",
    properties: {
      portfolio_id: {
        type: "string",
        description: "ID returned by watch_portfolio (e.g. 'ptf_...').",
      },
      threshold_pct: {
        type: "number",
        description: "Minimum |percent change| to flag a move as material. Default is the portfolio's configured threshold. Non-negative.",
        minimum: 0,
      },
      baseline: {
        type: "string",
        enum: ["previous", "first"],
        description: "Compare the latest period vs the previous period (default), or vs the first period in range.",
      },
      min_transactions: {
        type: "number",
        description: "Sample-size gate for price moves (de-noise). Non-negative integer; default is the portfolio's configured value.",
        minimum: 0,
      },
    },
    required: ["portfolio_id"],
    additionalProperties: false,
  },
} as const;

export interface GetPortfolioChangesArgs {
  portfolio_id: string;
  threshold_pct?: number;
  baseline?: "previous" | "first";
  min_transactions?: number;
}

export function parseGetPortfolioChangesArgs(raw: unknown): GetPortfolioChangesArgs {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("get_portfolio_changes arguments must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const portfolio_id = obj.portfolio_id;
  if (typeof portfolio_id !== "string" || portfolio_id.trim().length === 0) {
    throw new Error("portfolio_id must be a non-empty string");
  }

  const out: GetPortfolioChangesArgs = { portfolio_id: portfolio_id.trim() };

  if (obj.threshold_pct !== undefined) {
    if (typeof obj.threshold_pct !== "number" || !Number.isFinite(obj.threshold_pct) || obj.threshold_pct < 0) {
      throw new Error("threshold_pct must be a non-negative number");
    }
    out.threshold_pct = obj.threshold_pct;
  }
  if (obj.baseline !== undefined) {
    if (obj.baseline !== "previous" && obj.baseline !== "first") {
      throw new Error("baseline must be 'previous' or 'first'");
    }
    out.baseline = obj.baseline;
  }
  if (obj.min_transactions !== undefined) {
    if (typeof obj.min_transactions !== "number" || !Number.isFinite(obj.min_transactions) || obj.min_transactions < 0) {
      throw new Error("min_transactions must be a non-negative number");
    }
    out.min_transactions = obj.min_transactions;
  }

  return out;
}

function formatChange(c: OogaSignalChange): string {
  const arrow = c.direction === "up" ? "↑" : c.direction === "down" ? "↓" : "→";
  const pct = c.pct_change === null ? "—" : `${c.pct_change > 0 ? "+" : ""}${c.pct_change.toFixed(1)}%`;
  const from = c.value_from === null ? "—" : c.value_from.toLocaleString("en-GB");
  const to = c.value_to === null ? "—" : c.value_to.toLocaleString("en-GB");
  const label = c.label ?? c.signal_key;
  return `| ${c.area} (${c.geo_code}) | ${label} | ${c.period_from} → ${c.period_to} | ${from} ${arrow} ${to} | ${pct} |`;
}

export function formatChangeReportAsText(report: OogaChangeReport): string {
  const lines: string[] = [];
  lines.push(`# Portfolio changes · \`${report.portfolio_id}\``);
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`**Baseline:** ${report.baseline}`);
  lines.push(`**Threshold:** ${report.threshold_pct}% · **Min transactions:** ${report.min_transactions}`);
  lines.push(`**Areas checked:** ${report.areas_checked} · **Material changes:** ${report.material_count}`);
  lines.push("");

  if (report.changes.length === 0) {
    lines.push("No material signal changes detected for this portfolio with the current threshold.");
    return lines.join("\n").trimEnd();
  }

  lines.push("| Area | Signal | Period | Value | % change |");
  lines.push("|---|---|---|---|---|");
  for (const c of report.changes) lines.push(formatChange(c));
  return lines.join("\n").trimEnd();
}

export async function executeGetPortfolioChanges(
  client: OogaApiClient,
  args: GetPortfolioChangesArgs,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const report = await client.getPortfolioChanges(args.portfolio_id, {
      baseline: args.baseline,
      threshold_pct: args.threshold_pct,
      min_transactions: args.min_transactions,
    });
    return { content: [{ type: "text", text: formatChangeReportAsText(report) }] };
  } catch (err) {
    if (err instanceof OogaApiError) {
      const msg = `OneGoodArea API error (HTTP ${err.status ?? "?"}): ${err.message}`;
      return { content: [{ type: "text", text: msg }], isError: true };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Tool error: ${msg}` }], isError: true };
  }
}
