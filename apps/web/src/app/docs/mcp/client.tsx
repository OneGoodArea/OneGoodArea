"use client";

import React from "react";
import Link from "next/link";
import { Styles } from "../../design-v2/_shared/styles";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";

/* OneGoodArea MCP docs page — public install + usage instructions for the
   `@onegoodarea/mcp-server` npm package. AR-144 Session 5. */

export default function McpDocsClient() {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <Body />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section style={{
      position: "relative",
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: -220, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 560,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 980, margin: "0 auto",
        padding: "100px 40px 56px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.24em", textTransform: "uppercase",
          color: "var(--text-2)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 26,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--signal)",
            animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
          }} />
          MCP Server · v0.2.0
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 62px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 20px", maxWidth: "22ch",
        }}>
          OneGoodArea inside{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>Claude Desktop</span>
          .
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: 0, maxWidth: "62ch",
        }}>
          Score UK postcodes, compare areas, and query methodology inline in your AI workflow. Works in any MCP-compatible client: Claude Desktop, Cursor, Windsurf, and others.
        </p>
        <div style={{
          marginTop: 28, display: "flex", gap: 22, flexWrap: "wrap",
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <span>✓ 4 tools</span>
          <span>✓ Bearer auth</span>
          <span>✓ stdio transport</span>
          <span>✓ npm package</span>
        </div>
      </div>
    </section>
  );
}

function Body() {
  return (
    <section style={{
      background: "var(--bg)",
      padding: "64px 0 120px",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 980, margin: "0 auto", padding: "0 40px",
        display: "flex", flexDirection: "column", gap: 64,
      }}>
        <Section id="install" eyebrow="01 · Install" title="Add to Claude Desktop or Cursor">
          <P>
            The MCP server is distributed as an npm package. Your MCP client (Claude Desktop, Cursor, etc) spawns it as a subprocess and talks to it over stdio.
          </P>
          <P>
            <strong>Step 1.</strong> Get an API key from your{" "}
            <Link href="/dashboard" style={{ color: "var(--ink)", borderBottom: "1px solid var(--signal)" }}>dashboard</Link>
            . API keys start with <Code>aiq_</Code>. Free Sandbox includes 35 calls/month — enough to evaluate.
          </P>
          <P>
            <strong>Step 2.</strong> Add the MCP server to your client config.
          </P>

          <H3>Claude Desktop</H3>
          <P>
            Edit <Code>~/Library/Application Support/Claude/claude_desktop_config.json</Code> (macOS) or{" "}
            <Code>%APPDATA%\Claude\claude_desktop_config.json</Code> (Windows). Add the <Code>onegoodarea</Code> server:
          </P>
          <Pre>{`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": {
        "OOGA_API_KEY": "aiq_..."
      }
    }
  }
}`}</Pre>
          <P>Restart Claude Desktop. The 4 tools appear when you start a conversation about UK locations.</P>

          <H3>Cursor</H3>
          <P>
            Add to <Code>.cursor/mcp.json</Code> in your project (or global Cursor MCP config):
          </P>
          <Pre>{`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": { "OOGA_API_KEY": "aiq_..." }
    }
  }
}`}</Pre>
        </Section>

        <Section id="tools" eyebrow="02 · Tools" title="Four tools, one engine">
          <ToolCard
            name="score_postcode"
            args="postcode, intent"
            blurb="Score a single UK postcode (or place name) for a given decision intent. Returns 0-100 score, five weighted dimensions with confidence and reasoning, plain-English summary, recommendations, and data sources."
            example="What's the OneGoodArea origination score for SW1A 1AA?"
          />
          <ToolCard
            name="compare_postcodes"
            args="postcodes[], intent"
            blurb="Score 2-8 postcodes side-by-side for the same intent. Returns sorted comparison table with per-postcode summaries. Partial failures are inline rather than aborting the whole call."
            example="Compare M1 1AE, SW4 0LG, and EH1 1BB for site selection."
          />
          <ToolCard
            name="methodology_for"
            args="dimension"
            blurb="Get the methodology for any of 18 known scoring dimensions (e.g. 'Safety & Crime', 'Rental Yield'). Returns data source, summary of how it scores, and per-intent weights. Useful for procurement / model-risk reviewers."
            example="How does OneGoodArea score Cost of Living?"
          />
          <ToolCard
            name="engine_version"
            args="(no args)"
            blurb="Return the current OneGoodArea engine version, release date, and changelog. Useful for procurement documentation and confirming you're pinned to the right release."
            example="What version of the OneGoodArea engine is in production?"
          />
        </Section>

        <Section id="pricing" eyebrow="03 · Pricing" title="Included free on Growth and Enterprise">
          <P>The MCP server itself is free to install. API calls go through your OneGoodArea plan.</P>
          <PriceTable />
          <P>
            On Sandbox, Starter, Build, and Scale, MCP access is a £29 / month add-on. You can buy or cancel it from your{" "}
            <Link href="/dashboard" style={{ color: "var(--ink)", borderBottom: "1px solid var(--signal)" }}>dashboard</Link>.
            On Growth and Enterprise, MCP is included at no extra cost.
          </P>
        </Section>

        <Section id="dev" eyebrow="04 · Develop" title="Run locally against npm run dev">
          <P>
            For local development against your own Next.js server (e.g. testing changes to the engine), point the MCP server at <Code>localhost:3000</Code>:
          </P>
          <Pre>{`{
  "mcpServers": {
    "onegoodarea-dev": {
      "command": "npx",
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": {
        "OOGA_API_KEY": "aiq_dev",
        "OOGA_API_BASE": "http://localhost:3000"
      }
    }
  }
}`}</Pre>
          <P>
            Source code at <Code>github.com/OneGoodArea/OneGoodArea/tree/main/mcp</Code>. Issues + feature requests welcome.
          </P>
        </Section>
      </div>
    </section>
  );
}

/* ─────── Primitives ─────── */

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-2)",
        display: "inline-flex", alignItems: "center", gap: 9,
        marginBottom: 16,
      }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)" }} />
        {eyebrow}
      </div>
      <h2 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: 1.08,
        letterSpacing: "-0.016em", color: "var(--ink-deep)",
        margin: "0 0 28px", maxWidth: "30ch",
      }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: "70ch" }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--sans)", fontSize: 16, lineHeight: 1.65,
      color: "var(--text-2)", letterSpacing: "-0.005em", margin: 0,
    }}>{children}</p>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 400,
      fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.012em",
      color: "var(--ink-deep)", margin: "10px 0 0",
    }}>{children}</h3>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
      background: "var(--bg-off)", border: "1px solid var(--border)",
      padding: "2px 7px", borderRadius: 3,
      color: "var(--ink-deep)",
    }}>{children}</code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre style={{
      fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.65,
      color: "rgba(246,249,244,0.92)",
      background: "var(--bg-ink)",
      padding: "20px 24px",
      borderRadius: 6,
      overflow: "auto",
      margin: 0,
    }}>{children}</pre>
  );
}

function ToolCard({ name, args, blurb, example }: { name: string; args: string; blurb: string; example: string }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderLeft: "3px solid var(--signal)",
      borderRadius: 4,
      padding: "18px 22px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <code style={{
          fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600,
          color: "var(--ink-deep)",
        }}>{name}</code>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)",
          letterSpacing: "0.04em",
        }}>({args})</span>
      </div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.55,
        color: "var(--text-2)", margin: 0,
      }}>{blurb}</p>
      <div style={{
        fontFamily: "var(--sans)", fontStyle: "italic", fontSize: 13.5,
        color: "var(--text-3)", marginTop: 4,
        borderTop: "1px dashed var(--border)", paddingTop: 10,
      }}>
        Try: &quot;{example}&quot;
      </div>
    </div>
  );
}

function PriceTable() {
  const rows: { tier: string; mcp: string }[] = [
    { tier: "Sandbox · £0", mcp: "Add £29/mo" },
    { tier: "Starter · £49 / mo", mcp: "Add £29/mo" },
    { tier: "Build · £149 / mo", mcp: "Add £29/mo" },
    { tier: "Scale · £499 / mo", mcp: "Add £29/mo" },
    { tier: "Growth · £1,499 / mo", mcp: "Included free" },
    { tier: "Enterprise · from £4,999 / mo", mcp: "Included free" },
  ];
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {rows.map((r, i) => (
        <div key={r.tier} style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          padding: "14px 22px",
          alignItems: "center",
          borderBottom: i < rows.length - 1 ? "1px solid var(--border-dim)" : "none",
        }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
            color: "var(--ink-deep)", letterSpacing: "0.04em",
          }}>{r.tier}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: r.mcp.startsWith("Included") ? "var(--ink)" : "var(--text-3)",
          }}>{r.mcp}</span>
        </div>
      ))}
    </div>
  );
}
