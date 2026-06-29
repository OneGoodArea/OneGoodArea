import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business & API | OneGoodArea",
  description:
    "Embed UK area intelligence into your product. REST API and MCP server for estate agents, property portals, investment platforms, and relocation companies.",
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
