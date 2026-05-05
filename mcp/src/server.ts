#!/usr/bin/env node
/**
 * OneGoodArea MCP server — entry point.
 *
 * Exposes the OneGoodArea engine as MCP tools so Claude Desktop / Cursor /
 * any MCP-compatible client can score UK postcodes inline.
 *
 * Auth: reads OOGA_API_KEY from env (the customer's API key from
 * https://www.onegoodarea.com/dashboard).
 *
 * Base URL: defaults to https://www.onegoodarea.com. Override via
 * OOGA_API_BASE env (useful for local dev against npm run dev).
 *
 * Run via npx: `npx @onegoodarea/mcp-server`
 *
 * Claude Desktop config example:
 *   {
 *     "mcpServers": {
 *       "onegoodarea": {
 *         "command": "npx",
 *         "args": ["-y", "@onegoodarea/mcp-server"],
 *         "env": { "OOGA_API_KEY": "aiq_..." }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OogaApiClient } from "./api-client.js";
import {
  scorePostcodeToolDef,
  scorePostcodeToolName,
  parseScorePostcodeArgs,
  executeScorePostcode,
} from "./tools/score-postcode.js";
import {
  comparePostcodesToolDef,
  comparePostcodesToolName,
  parseComparePostcodesArgs,
  executeComparePostcodes,
} from "./tools/compare-postcodes.js";
import {
  methodologyForToolDef,
  methodologyForToolName,
  parseMethodologyForArgs,
  executeMethodologyFor,
} from "./tools/methodology-for.js";
import {
  engineVersionToolDef,
  engineVersionToolName,
  executeEngineVersion,
} from "./tools/engine-version.js";

const SERVER_VERSION = "0.2.0";

function readApiKey(): string {
  const key = process.env.OOGA_API_KEY;
  if (!key) {
    process.stderr.write(
      "[onegoodarea-mcp] Missing OOGA_API_KEY env var. Get one at https://www.onegoodarea.com/dashboard\n",
    );
    process.exit(1);
  }
  if (!key.startsWith("aiq_")) {
    process.stderr.write(
      `[onegoodarea-mcp] OOGA_API_KEY looks malformed (expected to start with 'aiq_'). Got prefix: ${key.slice(0, 4)}\n`,
    );
    process.exit(1);
  }
  return key;
}

async function checkMcpAccess(client: OogaApiClient): Promise<void> {
  // Skip the entitlement check if explicitly disabled (e.g. for local dev
  // before the /api/v1/me endpoint is deployed). Production should never
  // set this — it's a developer escape hatch.
  if (process.env.OOGA_SKIP_ENTITLEMENT_CHECK === "1") {
    process.stderr.write("[onegoodarea-mcp] OOGA_SKIP_ENTITLEMENT_CHECK=1 — skipping /me check\n");
    return;
  }

  let me;
  try {
    me = await client.me();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[onegoodarea-mcp] Could not verify entitlement at /api/v1/me: ${msg}\n`);
    process.stderr.write(`[onegoodarea-mcp] Check OOGA_API_KEY is valid and OOGA_API_BASE is reachable.\n`);
    process.exit(1);
  }

  if (!me.mcp_access) {
    process.stderr.write(
      `[onegoodarea-mcp] Your plan (${me.plan_name}) does not include MCP access.\n` +
        `[onegoodarea-mcp] MCP is included free on Growth (£1,499/mo) and Enterprise tiers.\n` +
        `[onegoodarea-mcp] On Sandbox / Starter / Build / Scale you can purchase the £29/mo MCP add-on.\n` +
        `[onegoodarea-mcp] Upgrade or add MCP at https://www.onegoodarea.com/pricing\n`,
    );
    process.exit(1);
  }

  process.stderr.write(
    `[onegoodarea-mcp] Entitlement OK · plan: ${me.plan_name} · engine: ${me.engine_version}\n`,
  );
}

async function main(): Promise<void> {
  const apiKey = readApiKey();
  const baseUrl = process.env.OOGA_API_BASE;

  const client = new OogaApiClient({ apiKey, baseUrl });

  // Fail fast if customer's plan doesn't include MCP access.
  await checkMcpAccess(client);

  const server = new Server(
    {
      name: "onegoodarea",
      version: SERVER_VERSION,
    },
    {
      capabilities: { tools: {} },
    },
  );

  // 4 tools: score_postcode, compare_postcodes (network), methodology_for,
  // engine_version (static lookup, no network).
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      scorePostcodeToolDef,
      comparePostcodesToolDef,
      methodologyForToolDef,
      engineVersionToolDef,
    ],
  }));

  // Dispatch on tool name. Each tool owns its own arg parsing + execution.
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (name === scorePostcodeToolName) {
      const parsed = parseScorePostcodeArgs(args);
      return executeScorePostcode(client, parsed);
    }
    if (name === comparePostcodesToolName) {
      const parsed = parseComparePostcodesArgs(args);
      return executeComparePostcodes(client, parsed);
    }
    if (name === methodologyForToolName) {
      const parsed = parseMethodologyForArgs(args);
      return executeMethodologyFor(parsed);
    }
    if (name === engineVersionToolName) {
      return executeEngineVersion();
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[onegoodarea-mcp] v${SERVER_VERSION} listening on stdio (api: ${baseUrl ?? "https://www.onegoodarea.com"})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[onegoodarea-mcp] Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
