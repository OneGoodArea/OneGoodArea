import { describe, it, expect } from "vitest";
import { classifyClientApp } from "@/shared/http";

/* AR-375: the classifier is a pure function — Pedro's load-bearing
   decision in plan/029. We test every UA shape we've seen or expect.
   When new wrapping-client UAs show up in production, add them here
   and update the classifier together. */

describe("classifyClientApp", () => {
  it("classifies a bare MCP-server UA as mcp + other (no wrapping client visible)", () => {
    expect(classifyClientApp("onegoodarea-mcp-server/1.0.1")).toEqual({
      source: "mcp",
      client_app: "other",
    });
  });

  it("classifies Claude Code wrapping the MCP server as mcp + claude-code", () => {
    expect(
      classifyClientApp("claude-code/1.0 onegoodarea-mcp-server/1.0.1"),
    ).toEqual({ source: "mcp", client_app: "claude-code" });
  });

  it("classifies Claude Desktop wrapping the MCP server as mcp + claude-desktop", () => {
    expect(
      classifyClientApp(
        "Mozilla/5.0 Claude/1.0 onegoodarea-mcp-server/1.0.1",
      ),
    ).toEqual({ source: "mcp", client_app: "claude-desktop" });
  });

  it("classifies Cursor wrapping the MCP server as mcp + cursor", () => {
    expect(
      classifyClientApp("Cursor/0.42 onegoodarea-mcp-server/1.0.1"),
    ).toEqual({ source: "mcp", client_app: "cursor" });
  });

  it("classifies curl direct as api + other", () => {
    expect(classifyClientApp("curl/8.0.1")).toEqual({
      source: "api",
      client_app: "other",
    });
  });

  it("classifies a vanilla browser UA as api + other", () => {
    expect(
      classifyClientApp(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15",
      ),
    ).toEqual({ source: "api", client_app: "other" });
  });

  it("classifies an empty UA as api + other", () => {
    expect(classifyClientApp("")).toEqual({ source: "api", client_app: "other" });
  });

  it("classifies a null/undefined UA as api + other", () => {
    expect(classifyClientApp(null)).toEqual({ source: "api", client_app: "other" });
    expect(classifyClientApp(undefined)).toEqual({
      source: "api",
      client_app: "other",
    });
  });

  it("matches case-insensitively", () => {
    expect(classifyClientApp("CURSOR/0.42")).toEqual({
      source: "api",
      client_app: "cursor",
    });
    expect(classifyClientApp("CLAUDE-CODE/1.0")).toEqual({
      source: "api",
      client_app: "claude-code",
    });
  });
});
