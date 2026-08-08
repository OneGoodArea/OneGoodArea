import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For AI agents | OneGoodArea",
  description:
    "OneGoodArea is built to be read, queried, and cited by AI. Public llms.txt, an MCP server, an OpenAPI spec, and deterministic, versioned UK area scoring.",
  openGraph: {
    title: "For AI agents | OneGoodArea",
    description:
      "Built to be read by AI: llms.txt, an MCP server, an OpenAPI spec, and versioned area scoring.",
    type: "website",
    url: "https://www.onegoodarea.com/ai",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "For AI agents | OneGoodArea",
    description: "Built to be read by AI: llms.txt, an MCP server, and an OpenAPI spec.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/ai" },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
