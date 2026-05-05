import type { Metadata } from "next";
import McpDocsClient from "./client";

export const metadata: Metadata = {
  title: "MCP Server | OneGoodArea",
  description:
    "Use OneGoodArea's UK location intelligence inside Claude Desktop, Cursor, or any MCP-compatible client. Score postcodes, compare areas, query methodology — all inline in your AI workflow.",
  alternates: { canonical: "https://www.onegoodarea.com/docs/mcp" },
};

export default function McpDocsPage() {
  return <McpDocsClient />;
}
