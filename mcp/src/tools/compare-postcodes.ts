/**
 * MCP tool: compare_postcodes
 *
 * Scores N postcodes (max 8) for a single intent in parallel and returns a
 * comparison table sorted by overall score. Uses the existing scoreArea
 * client method — Promise.all in parallel, individual failures are captured
 * inline rather than failing the whole call.
 */

import type { OogaApiClient, Intent, OogaScoreResponse } from "../api-client.js";
import { OogaApiError } from "../api-client.js";

const MAX_POSTCODES = 8;

export const comparePostcodesToolName = "compare_postcodes";

export const comparePostcodesToolDef = {
  name: comparePostcodesToolName,
  description:
    "Compare multiple UK postcodes (max 8) side-by-side for the same decision intent. " +
    "Returns a sorted table showing each area's overall score, area type, top dimensions, and a one-line takeaway. " +
    "Each postcode hits the cache independently — repeats are free for 24 hours per (postcode, intent).",
  inputSchema: {
    type: "object",
    properties: {
      postcodes: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: MAX_POSTCODES,
        description: `Array of UK postcodes or place names to compare. Between 2 and ${MAX_POSTCODES} entries.`,
      },
      intent: {
        type: "string",
        enum: ["moving", "business", "investing", "research"],
        description:
          "Same intent applied to every postcode. Use 'moving' for origination, 'business' for site selection, 'investing' for yield, 'research' for neutral baseline.",
      },
    },
    required: ["postcodes", "intent"],
    additionalProperties: false,
  },
} as const;

export interface ComparePostcodesArgs {
  postcodes: string[];
  intent: Intent;
}

export function parseComparePostcodesArgs(raw: unknown): ComparePostcodesArgs {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("compare_postcodes arguments must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const postcodes = obj.postcodes;
  const intent = obj.intent;

  if (!Array.isArray(postcodes)) {
    throw new Error("postcodes must be an array");
  }
  if (postcodes.length < 2) {
    throw new Error("postcodes must contain at least 2 entries");
  }
  if (postcodes.length > MAX_POSTCODES) {
    throw new Error(`postcodes must contain at most ${MAX_POSTCODES} entries`);
  }
  const cleaned: string[] = [];
  for (const p of postcodes) {
    if (typeof p !== "string" || p.trim().length === 0) {
      throw new Error("every postcode must be a non-empty string");
    }
    if (p.length > 100) {
      throw new Error("each postcode must be 100 characters or fewer");
    }
    cleaned.push(p.trim());
  }

  const intents: Intent[] = ["moving", "business", "investing", "research"];
  if (typeof intent !== "string" || !intents.includes(intent as Intent)) {
    throw new Error(`intent must be one of: ${intents.join(", ")}`);
  }

  return { postcodes: cleaned, intent: intent as Intent };
}

interface ComparisonRow {
  postcode: string;
  score: number | null;
  result: OogaScoreResponse | null;
  error: string | null;
}

export function formatComparisonAsText(rows: ComparisonRow[], intent: Intent): string {
  // Sort: successful results by descending score, errors at the bottom
  const sorted = [...rows].sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  });

  const lines: string[] = [];
  lines.push(`# Comparison · ${rows.length} postcodes · intent: ${intent}`);
  lines.push("");

  // Headline table — score + area type per postcode
  lines.push("| Rank | Postcode | Score | Area type | Top dimension |");
  lines.push("|---|---|---|---|---|");
  let rank = 1;
  for (const r of sorted) {
    if (r.score === null) {
      lines.push(`| — | ${r.postcode} | ERROR | — | ${r.error ?? "Unknown"} |`);
      continue;
    }
    const top = r.result?.sub_scores?.length
      ? r.result.sub_scores.reduce((a, b) => (a.score > b.score ? a : b))
      : null;
    const topStr = top ? `${top.label} (${top.score}/100)` : "—";
    const areaType = r.result?.area_type ?? "—";
    lines.push(`| ${rank} | ${r.postcode} | ${r.score}/100 | ${areaType} | ${topStr} |`);
    rank++;
  }
  lines.push("");

  // Per-postcode summary
  lines.push("## Summaries");
  for (const r of sorted) {
    if (r.score === null) {
      lines.push(`- **${r.postcode}**: error — ${r.error ?? "unknown failure"}`);
      continue;
    }
    lines.push(`- **${r.postcode}** (${r.score}/100): ${r.result?.summary ?? "(no summary)"}`);
  }

  // Footer with engine version if available
  const firstSuccess = sorted.find((r) => r.result !== null)?.result;
  if (firstSuccess?.engine_version) {
    lines.push("");
    lines.push(`Engine version: ${firstSuccess.engine_version}`);
  }

  return lines.join("\n");
}

export async function executeComparePostcodes(
  client: OogaApiClient,
  args: ComparePostcodesArgs,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const settled = await Promise.allSettled(
    args.postcodes.map((p) => client.scoreArea(p, args.intent)),
  );

  const rows: ComparisonRow[] = settled.map((s, i) => {
    if (s.status === "fulfilled") {
      return {
        postcode: args.postcodes[i],
        score: s.value.areaiq_score,
        result: s.value,
        error: null,
      };
    }
    const reason = s.reason instanceof OogaApiError
      ? `HTTP ${s.reason.status ?? "?"}: ${s.reason.message}`
      : s.reason instanceof Error
        ? s.reason.message
        : String(s.reason);
    return { postcode: args.postcodes[i], score: null, result: null, error: reason };
  });

  // If EVERY call failed, surface that as isError so the LLM can act
  const allFailed = rows.every((r) => r.error !== null);

  return {
    content: [{ type: "text", text: formatComparisonAsText(rows, args.intent) }],
    ...(allFailed ? { isError: true } : {}),
  };
}
