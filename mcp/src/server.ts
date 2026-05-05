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

const SERVER_VERSION = "0.1.0";

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

async function main(): Promise<void> {
  const apiKey = readApiKey();
  const baseUrl = process.env.OOGA_API_BASE;

  const client = new OogaApiClient({ apiKey, baseUrl });

  const server = new Server(
    {
      name: "onegoodarea",
      version: SERVER_VERSION,
    },
    {
      capabilities: { tools: {} },
    },
  );

  // List available tools — currently just score_postcode. Future tools:
  // compare_postcodes, methodology_for, engine_version (planned in
  // subsequent AR-144 sessions).
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [scorePostcodeToolDef],
  }));

  // Dispatch on tool name. Each tool owns its own arg parsing + execution.
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (name === scorePostcodeToolName) {
      const parsed = parseScorePostcodeArgs(args);
      return executeScorePostcode(client, parsed);
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
