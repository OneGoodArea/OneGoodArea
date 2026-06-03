"use client";

import Link from "next/link";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";
import "./mcp.css";

/* /docs/mcp — Brand v3 (Plotted) — AR-204 PR C.

   Install + usage guide for @onegoodarea/mcp-server (mcp/src/*).
   Content stays accurate to the live MCP server:
   - OOGA_API_KEY env var name (mcp/src/server.ts:62)
   - aiq_ key prefix validated (mcp/src/server.ts:69)
   The aiq_→oga_ migration for MCP is a separate ticket; docs
   must match real code or user setup breaks.

   Pricing table killed per delta-doc decision D5 — replaced
   with a single roadmap card linking to /pricing. */

const TOOLS: { name: string; args: string; blurb: string; example: string }[] = [
  {
    name: "score_postcode",
    args: "postcode, intent",
    blurb: "Score one UK postcode or place name for a given decision intent. Returns a 0–100 score, five weighted dimensions with confidence and reasoning, plain-English summary, and data sources.",
    example: "What's the OneGoodArea origination score for SW1A 1AA?",
  },
  {
    name: "compare_postcodes",
    args: "postcodes[], intent",
    blurb: "Score 2–8 postcodes side-by-side for the same intent. Returns a sorted comparison table with per-postcode summaries. Partial failures are inline, not fatal.",
    example: "Compare M1 1AE, SW4 0LG, and EH1 1BB for site selection.",
  },
  {
    name: "methodology_for",
    args: "dimension",
    blurb: "Methodology for any of the scoring dimensions: data source, summary of the scoring function, per-intent weights. Useful for procurement and model-risk review.",
    example: "How does OneGoodArea score Cost of Living?",
  },
  {
    name: "engine_version",
    args: "(no args)",
    blurb: "Current OneGoodArea engine version, release date, and changelog excerpt. Useful for procurement documentation and confirming you're pinned to the right release.",
    example: "What version of the OneGoodArea engine is in production?",
  },
];

/* ============================================================
   Page
   ============================================================ */

export default function McpDocsClient() {
  return (
    <div className="oga-root oga-mcp">
      <Nav />

      <Hero />
      <SectionInstall />
      <SectionTools />
      <SectionDev />
      <SectionPlans />

      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero() {
  return (
    <section className="oga-mcp-hero oga-section-hero">
      <div className="oga-mcp__container--narrow">
        <div className="oga-mcp-hero__eyebrow">
          <span className="oga-mcp-hero__dot" aria-hidden />
          <span>MCP server</span>
          <span className="oga-mcp-hero__eyebrow-sep" aria-hidden />
          <span>npm · @onegoodarea/mcp-server</span>
        </div>

        <h1 className="oga-mcp-hero__title">
          OneGoodArea inside Claude Desktop, Cursor, and any MCP-compatible client.
        </h1>

        <p className="oga-mcp-hero__lead">
          Score UK postcodes, compare areas, and query methodology inline in your AI workflow. The
          server is distributed as an npm package and spawned by your MCP client over stdio.
        </p>

        <ul className="oga-mcp-hero__stats" aria-label="Server attributes">
          <li className="oga-mcp-hero__stat">4 tools</li>
          <li className="oga-mcp-hero__stat">Bearer auth</li>
          <li className="oga-mcp-hero__stat">stdio transport</li>
          <li className="oga-mcp-hero__stat">npm package</li>
        </ul>

        <div className="oga-mcp-hero__actions">
          <Link href="/dashboard" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────── § 01 — Install ─────── */

function SectionInstall() {
  return (
    <section id="install" className="oga-section-quiet">
      <div className="oga-mcp__container">
        <header className="oga-mcp__header">
          <div className="oga-mcp__eyebrow">
            <span className="oga-mcp__eyebrow-num">01</span>
            <span className="oga-mcp__eyebrow-line" aria-hidden />
            <span>Install</span>
          </div>
          <h2 className="oga-mcp__h2">Two steps to onegoodarea inside your client.</h2>
          <p className="oga-mcp__lead">
            One API key, one config edit. The client will spawn the server as a subprocess and the
            tools appear in your next conversation.
          </p>
        </header>

        <div className="oga-mcp-install__steps">
          <div className="oga-mcp-install__step">
            <div className="oga-mcp-install__step-num">Step 01</div>
            <div className="oga-mcp-install__step-body">
              <p>
                Get an API key from your <Link href="/dashboard">dashboard</Link>. Keys start with{" "}
                <code>aiq_</code>.
              </p>
            </div>
          </div>

          <div className="oga-mcp-install__step">
            <div className="oga-mcp-install__step-num">Step 02</div>
            <div className="oga-mcp-install__step-body">
              <p>Add the server to your MCP client config.</p>

              <div className="oga-mcp-install__client">Claude Desktop</div>
              <p>
                Edit <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> on
                macOS, or <code>%APPDATA%\Claude\claude_desktop_config.json</code> on Windows. Add the{" "}
                <code>onegoodarea</code> server:
              </p>
              <McpCodePanel
                tag="claude_desktop_config.json"
                code={`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": {
        "OOGA_API_KEY": "aiq_..."
      }
    }
  }
}`}
              />
              <p>Restart Claude Desktop. The four tools appear when you start a conversation about UK locations.</p>

              <div className="oga-mcp-install__client">Cursor</div>
              <p>
                Add to <code>.cursor/mcp.json</code> in your project (or the global Cursor MCP config):
              </p>
              <McpCodePanel
                tag=".cursor/mcp.json"
                code={`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": { "OOGA_API_KEY": "aiq_..." }
    }
  }
}`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function McpCodePanel({ tag, code }: { tag: string; code: string }) {
  return (
    <div className="oga-mcp-code">
      <div className="oga-mcp-code__head">
        <span className="oga-mcp-code__head-tag">JSON</span>
        <span>{tag}</span>
      </div>
      <pre className="oga-mcp-code__body">{code}</pre>
    </div>
  );
}

/* ─────── § 02 — Tools ─────── */

function SectionTools() {
  return (
    <section id="tools" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-mcp__container">
        <header className="oga-mcp__header">
          <div className="oga-mcp__eyebrow">
            <span className="oga-mcp__eyebrow-num">02</span>
            <span className="oga-mcp__eyebrow-line" aria-hidden />
            <span>Tools</span>
          </div>
          <h2 className="oga-mcp__h2">Four tools, one engine.</h2>
          <p className="oga-mcp__lead">
            Every tool calls the same v1 API under the hood. The MCP server is a thin protocol bridge.
            Auth, rate-limits, quota, methodology pinning, all enforced on the API side.
          </p>
        </header>

        <div className="oga-mcp-tools__grid">
          {TOOLS.map((t) => (
            <article key={t.name} className="oga-mcp-tools__card">
              <div className="oga-mcp-tools__card-head">
                <code className="oga-mcp-tools__card-name">{t.name}</code>
                <span className="oga-mcp-tools__card-args">({t.args})</span>
              </div>
              <p className="oga-mcp-tools__card-body">{t.blurb}</p>
              <div className="oga-mcp-tools__card-example">
                <span className="oga-mcp-tools__card-example-label">Try</span>
                &ldquo;{t.example}&rdquo;
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── § 03 — Local development ─────── */

function SectionDev() {
  return (
    <section id="develop" className="oga-section-quiet">
      <div className="oga-mcp__container">
        <header className="oga-mcp__header">
          <div className="oga-mcp__eyebrow">
            <span className="oga-mcp__eyebrow-num">03</span>
            <span className="oga-mcp__eyebrow-line" aria-hidden />
            <span>Local development</span>
          </div>
          <h2 className="oga-mcp__h2">Run against your own backend.</h2>
          <p className="oga-mcp__lead">
            For local testing against a development API instance, point the server at any base URL via{" "}
            <code>OOGA_API_BASE</code>. The server validates the key prefix but does not validate the
            host.
          </p>
        </header>

        <McpCodePanel
          tag="dev config"
          code={`{
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
}`}
        />

        <div className="oga-mcp-dev__source">
          Issues, feature requests, and support:{" "}
          <a href="mailto:operation@onegoodarea.co.uk">
            operation@onegoodarea.co.uk <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────── § 04 — Plans pointer ─────── */

function SectionPlans() {
  return (
    <section id="plans" className="oga-section-hero">
      <div className="oga-mcp__container">
        <header className="oga-mcp__header">
          <div className="oga-mcp__eyebrow">
            <span className="oga-mcp__eyebrow-num">04</span>
            <span className="oga-mcp__eyebrow-line" aria-hidden />
            <span>Plans</span>
          </div>
          <h2 className="oga-mcp__h2">Free to install. Calls go through your plan.</h2>
          <p className="oga-mcp__lead">
            The MCP server itself is open source and free. Every tool invocation makes a real call to
            the OneGoodArea API and counts against your plan&rsquo;s monthly quota — same as any other
            integration.
          </p>
        </header>

        <article className="oga-mcp-plans__card">
          <div className="oga-mcp-plans__label">
            Pricing in flight
          </div>
          <div className="oga-mcp-plans__body">
            <p>
              We&rsquo;re finalising the tier structure for v3. Once that lands, plan pages and any
              MCP-specific add-on will appear at <code>/pricing</code>. For now: get an API key, point
              your client at the server, and start.
            </p>
            <Link href="/pricing" className="oga-mcp-plans__cta">
              See plans <span aria-hidden>→</span>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-mcp__container--narrow oga-mcp-cta__inner">
        <h2 className="oga-mcp-cta__title">
          UK area intelligence as a Claude-native tool.
        </h2>
        <p className="oga-mcp-cta__lead">
          Get a key, paste a config block, restart your client. The four tools appear in your next
          conversation.
        </p>
        <div className="oga-mcp-cta__buttons">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
