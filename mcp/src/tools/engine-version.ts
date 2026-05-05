/**
 * MCP tool: engine_version
 *
 * Returns the current OneGoodArea engine version + changelog. Useful for
 * procurement / model-risk teams documenting which engine version is in
 * production, and for confirming version pinning when that ships.
 */

import { ENGINE } from "../methodology-data.js";

export const engineVersionToolName = "engine_version";

export const engineVersionToolDef = {
  name: engineVersionToolName,
  description:
    "Return the current OneGoodArea engine version (e.g. '2.0.0'), release date, and changelog. " +
    "Use this when a customer asks 'what version are we on' or for procurement / model-risk documentation. " +
    "The engine version is also stamped on every score_postcode response for audit trails.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
} as const;

export function executeEngineVersion(): {
  content: Array<{ type: "text"; text: string }>;
} {
  const lines: string[] = [];
  lines.push(`# OneGoodArea engine ${ENGINE.version}`);
  lines.push(`Released: ${ENGINE.released}`);
  lines.push("");
  lines.push(`## Changelog`);
  for (const entry of ENGINE.changelog) {
    lines.push(`### ${entry.version} — ${entry.date}`);
    lines.push(entry.summary);
    lines.push("");
  }
  lines.push(`Full methodology: https://www.onegoodarea.com/methodology`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
