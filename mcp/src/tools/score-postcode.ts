/**
 * MCP tool: score_postcode
 *
 * Lets a Claude / Cursor / MCP-compatible client score any UK postcode for a
 * given decision intent. Wraps the OneGoodArea REST API.
 */

import type { OogaApiClient, Intent, OogaScoreResponse } from "../api-client.js";
import { OogaApiError } from "../api-client.js";

export const scorePostcodeToolName = "score_postcode";

export const scorePostcodeToolDef = {
  name: scorePostcodeToolName,
  description:
    "Score a UK postcode (or place name) for a given decision intent using the OneGoodArea engine. " +
    "Returns the overall 0-100 score, five weighted dimensions with confidence and reasoning, a plain-English summary, " +
    "and the list of public datasets used. Cached for 24 hours per (area + intent) combination — repeat calls are free.",
  inputSchema: {
    type: "object",
    properties: {
      postcode: {
        type: "string",
        description:
          "UK postcode (e.g. 'SW1A 1AA') or place name (e.g. 'Manchester city centre', 'Shoreditch'). Max 100 characters.",
      },
      intent: {
        type: "string",
        enum: ["moving", "business", "investing", "research"],
        description:
          "Decision context. 'moving' = origination scoring (residential mortgage suitability, demand-side risk). " +
          "'business' = site selection (footfall, competition, commercial viability). " +
          "'investing' = investment scoring (yield, growth, regeneration). " +
          "'research' = reference scoring (neutral baseline across all five dimensions).",
      },
    },
    required: ["postcode", "intent"],
    additionalProperties: false,
  },
} as const;

export interface ScorePostcodeArgs {
  postcode: string;
  intent: Intent;
}

export function parseScorePostcodeArgs(raw: unknown): ScorePostcodeArgs {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("score_postcode arguments must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const postcode = obj.postcode;
  const intent = obj.intent;

  if (typeof postcode !== "string" || postcode.trim().length === 0) {
    throw new Error("postcode must be a non-empty string");
  }
  if (postcode.length > 100) {
    throw new Error("postcode must be 100 characters or fewer");
  }
  const intents: Intent[] = ["moving", "business", "investing", "research"];
  if (typeof intent !== "string" || !intents.includes(intent as Intent)) {
    throw new Error(`intent must be one of: ${intents.join(", ")}`);
  }

  return { postcode: postcode.trim(), intent: intent as Intent };
}

export function formatScoreResultAsText(result: OogaScoreResponse): string {
  const lines: string[] = [];

  lines.push(`# ${result.area} · ${result.intent} · ${result.areaiq_score}/100`);
  if (result.engine_version) lines.push(`Engine version: ${result.engine_version}`);
  if (result.area_type) lines.push(`Area type: ${result.area_type}`);
  lines.push("");

  lines.push(`## Summary`);
  lines.push(result.summary);
  lines.push("");

  lines.push(`## Dimensions`);
  for (const d of result.sub_scores) {
    const conf =
      typeof d.confidence === "number"
        ? ` · confidence ${(d.confidence * 100).toFixed(0)}%`
        : "";
    lines.push(`- **${d.label}**: ${d.score}/100 (weight ${d.weight}%${conf})`);
    lines.push(`  ${d.reasoning}`);
  }
  lines.push("");

  if (result.recommendations.length > 0) {
    lines.push(`## Recommendations`);
    for (const r of result.recommendations) lines.push(`- ${r}`);
    lines.push("");
  }

  lines.push(`## Data sources`);
  lines.push(result.data_sources.join(" · "));
  lines.push("");
  lines.push(`Generated at: ${result.generated_at}`);

  return lines.join("\n");
}

/**
 * Tool execution. Calls the API, returns formatted text. Throws on auth /
 * quota errors with a clear message the LLM can pass to the user.
 */
export async function executeScorePostcode(
  client: OogaApiClient,
  args: ScorePostcodeArgs,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const result = await client.scoreArea(args.postcode, args.intent);
    return {
      content: [{ type: "text", text: formatScoreResultAsText(result) }],
    };
  } catch (err) {
    if (err instanceof OogaApiError) {
      const msg = `OneGoodArea API error (HTTP ${err.status ?? "?"}): ${err.message}`;
      return { content: [{ type: "text", text: msg }], isError: true };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Tool error: ${msg}` }], isError: true };
  }
}
