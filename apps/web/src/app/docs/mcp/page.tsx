import type { Metadata } from "next";
import Script from "next/script";
import McpDocsClient from "./client";

export const metadata: Metadata = {
  title: "MCP Server | OneGoodArea",
  description:
    "Use OneGoodArea's UK location intelligence inside Claude Desktop, Cursor, or any MCP-compatible client. Score postcodes, compare areas, query methodology, all inline in your AI workflow.",
  alternates: { canonical: "https://www.onegoodarea.com/docs/mcp" },
};

/* TechArticle schema (AR-780): marks the MCP server docs as authoritative
   technical documentation for search and AI assistants. */
const techArticleLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "OneGoodArea MCP server",
  description:
    "How to use OneGoodArea as a Model Context Protocol server inside Claude, Cursor, and any MCP client: setup and the available tools for scoring, signals, comparison, and monitoring.",
  url: "https://www.onegoodarea.com/docs/mcp",
  author: { "@type": "Organization", name: "OneGoodArea", url: "https://www.onegoodarea.com" },
  publisher: { "@type": "Organization", name: "OneGoodArea", url: "https://www.onegoodarea.com" },
};

export default function McpDocsPage() {
  return (
    <>
      <Script
        id="ld-techarticle-mcp"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleLd) }}
      />
      <McpDocsClient />
    </>
  );
}
