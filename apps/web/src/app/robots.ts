import type { MetadataRoute } from "next";

/* robots.txt (AR-773). OneGoodArea sells into AI workflows, so unlike most
   sites we explicitly WELCOME AI crawlers and assistants rather than block
   them. Named groups for the major AI user agents make that intent legible to
   both readiness scanners and the crawlers themselves. Private app surfaces
   stay disallowed for every agent. The machine-readable entry points
   (/llms.txt, /openapi.json, /sitemap.xml) all live under "/" and are allowed. */

const PRIVATE = [
  "/api/",
  "/admin",
  "/dashboard",
  "/settings",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/api-usage",
];

// AI assistants and crawlers we explicitly allow to read and cite OneGoodArea.
const AI_AGENTS = [
  "GPTBot", // OpenAI training + ChatGPT browsing
  "OAI-SearchBot", // OpenAI search index
  "ChatGPT-User", // ChatGPT on-demand fetch
  "ClaudeBot", // Anthropic Claude crawler
  "anthropic-ai", // Anthropic
  "Claude-Web", // Claude browsing
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity on-demand fetch
  "Google-Extended", // Gemini / Google AI
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl (feeds many models)
  "cohere-ai", // Cohere
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: "https://www.onegoodarea.com/sitemap.xml",
    host: "https://www.onegoodarea.com",
  };
}
