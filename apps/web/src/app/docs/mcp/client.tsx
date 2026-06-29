"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";
import { ClaudeLogo, CursorLogo, McpLogo } from "../../design-v2/_shared/editor-icons";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../../design-v2/_shared/product-icons";
import { ApiReferenceIcon, McpServerIcon } from "../../design-v2/_shared/docs-icons";
import "./mcp.css";

/* /docs/mcp — Brand v3 (Plotted).

   Install + usage guide for @oga-mcp/server (mcp/src/*).
   Rewritten in AR-370 after epic AR-362 shipped: the rebuild
   landed, the tool catalog grew from 4 to 11, the key prefix
   migrated from aiq_ to oga_. Tool groups (Scores / Signals /
   Intelligence / Monitor / Brief / Reference) mirror the
   server's actual catalog. Content kept accurate to mcp/src/* —
   if a tool description here drifts from the real tool def,
   integration breaks. */

interface ToolEntry {
  name: string;
  args: string;
  blurb: string;
  example: string;
  marquee?: boolean;
}

interface ToolGroup {
  label: string;
  tagline: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tools: ToolEntry[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "Scores",
    tagline: "Composite scoring per area for one of four decision presets.",
    Icon: ScoresIcon,
    tools: [
      {
        name: "score_postcode",
        args: "area, preset",
        blurb: "Score a UK postcode or place name for a preset (moving, business, investing, research). Returns a 0–100 score, five weighted dimensions with engine-grounded reasoning and confidence, a server-composed summary, recommendations, and data sources.",
        example: "Score SW1A 1AA for moving.",
      },
      {
        name: "compare_postcodes",
        args: "areas[], preset",
        blurb: "Score 2–8 areas side-by-side for the same preset. Returns a sorted comparison table with per-area summaries. Partial failures surface inline rather than failing the call.",
        example: "Compare M1 1AE, SW4 0LG, and EH1 1BB for business.",
      },
    ],
  },
  {
    label: "Signals",
    tagline: "Raw addressable signals — the primitive underneath every other product.",
    Icon: SignalsIcon,
    tools: [
      {
        name: "get_area_signals",
        args: "area",
        blurb: "Full signals catalog for an area across all seven categories (crime, deprivation, property, schools, amenities, transport, environment). Each signal carries value + unit, percentile when store-backed, confidence with engine-grounded reason, source attribution, and observation period.",
        example: "Get all signals for M1 1AE.",
      },
      {
        name: "get_signals_by_category",
        args: "area, category",
        blurb: "Same signal shape as get_area_signals, narrowed to one category. Use when the LLM needs to focus on a single data domain.",
        example: "Show me the crime signals for SW1A 1AA.",
      },
    ],
  },
  {
    label: "Intelligence",
    tagline: "Natural-language query plane + peer discovery over the moat.",
    Icon: IntelligenceIcon,
    tools: [
      {
        name: "find_areas",
        args: "question",
        blurb: "Ask in natural language. A planner translates the question into a typed plan (one of seven ops: rank_areas, get_area, score_area, compare_areas, find_peers, find_insights, find_forecast); the database executes it. The response carries the emitted plan + results so every answer is reproducible.",
        example: "Areas under £250k median price and rising YoY in England.",
      },
      {
        name: "find_peers",
        args: "area, k?",
        blurb: "k-nearest-neighbour peers for a UK area by normalized signal values. Returns the target's geo_code + signals_used + a ranked peers list with distance (0 = identical, 1 = maximally distant) and n_dims_used.",
        example: "Find 10 areas similar to M1 1AE.",
      },
    ],
  },
  {
    label: "Monitor",
    tagline: "Portfolio tracking and material-change detection.",
    Icon: MonitorIcon,
    tools: [
      {
        name: "watch_portfolio",
        args: "name, areas[]",
        blurb: "Set up a Monitor portfolio in one step: creates the portfolio and adds the tracked areas. Returns the new portfolio_id and the area list. If the add step fails after the create, the response surfaces the partial state so the LLM can act.",
        example: "Watch portfolio 'North Manchester' with M1 1AE, M4 5DR, M8 8QR.",
      },
      {
        name: "get_portfolio_changes",
        args: "portfolio_id, threshold_pct?, baseline?, min_transactions?",
        blurb: "Check a portfolio for material signal changes between two time-series periods. Returns scope, counts, and a per-area table of material moves with direction, from/to values, delta, and percent change. Probe calls don't fire customer webhooks.",
        example: "What's changed in portfolio ptf_abc with a 5% threshold?",
      },
    ],
  },
  {
    label: "Brief (marquee)",
    tagline: "One audience-shaped advisory document per area. The wow-factor composite.",
    Icon: McpServerIcon,
    tools: [
      {
        name: "area_brief",
        args: "area, audience",
        blurb: "Audience ∈ {lender, insurer, retailer, investor}. Fans out to the full signals catalog + the audience's scoring preset (with explain mode), then renders an audience-specific markdown brief: overall verdict, audience-relevant dimensions, audience-relevant signals with provenance, recommendations, data sources. Every value is real engine output.",
        example: "Give me a lender brief on SW1A 1AA.",
        marquee: true,
      },
    ],
  },
  {
    label: "Reference",
    tagline: "Static lookups, no quota cost.",
    Icon: ApiReferenceIcon,
    tools: [
      {
        name: "methodology_for",
        args: "dimension",
        blurb: "Methodology for any scoring dimension: data source, scoring function summary, per-preset weights. Useful for procurement and model-risk review.",
        example: "How does OneGoodArea score Cost of Living?",
      },
      {
        name: "engine_version",
        args: "(no args)",
        blurb: "Current engine version, release date, and changelog excerpt. The live engine version is also stamped on every score_postcode and get_area_signals response.",
        example: "What engine version is in production?",
      },
    ],
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
          <span className="oga-mcp-hero__brand" aria-hidden>
            <McpLogo />
          </span>
          <span>MCP server</span>
          <span className="oga-mcp-hero__eyebrow-sep" aria-hidden />
          <span>npm · @oga-mcp/server</span>
        </div>

        <h1 className="oga-mcp-hero__title">
          OneGoodArea inside Claude Desktop, Cursor, and any MCP-compatible client.
        </h1>

        <p className="oga-mcp-hero__lead">
          Score UK areas, query signals in natural language, watch portfolios for material change,
          and generate audience-shaped briefs — all inline in your AI workflow. Eleven tools across
          six product surfaces. The server is distributed as an npm package and spawned by your MCP
          client over stdio.
        </p>

        <ul className="oga-mcp-hero__stats" aria-label="Server attributes">
          <li className="oga-mcp-hero__stat">11 tools</li>
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

/* ─────── 01 — Install ─────── */

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
                <code>oga_</code>.
              </p>
            </div>
          </div>

          <div className="oga-mcp-install__step">
            <div className="oga-mcp-install__step-num">Step 02</div>
            <div className="oga-mcp-install__step-body">
              <p>Add the server to your MCP client config.</p>

              <div className="oga-mcp-install__client">
                <span className="oga-mcp-install__client-logo" aria-hidden>
                  <ClaudeLogo />
                </span>
                Claude Desktop
              </div>
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
      "args": ["-y", "@oga-mcp/server"],
      "env": {
        "OOGA_API_KEY": "oga_..."
      }
    }
  }
}`}
              />
              <p>Restart Claude Desktop. The eleven tools appear when you start a conversation about UK locations.</p>

              <div className="oga-mcp-install__client">
                <span className="oga-mcp-install__client-logo" aria-hidden>
                  <CursorLogo />
                </span>
                Cursor
              </div>
              <p>
                Add to <code>.cursor/mcp.json</code> in your project (or the global Cursor MCP config):
              </p>
              <McpCodePanel
                tag=".cursor/mcp.json"
                code={`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@oga-mcp/server"],
      "env": { "OOGA_API_KEY": "oga_..." }
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

/* ─────── 02 — Tools ─────── */

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
          <h2 className="oga-mcp__h2">Eleven tools across six product surfaces.</h2>
          <p className="oga-mcp__lead">
            Every tool calls the same v1 API under the hood. The MCP server is a thin protocol bridge.
            Auth, rate-limits, quota, methodology pinning, all enforced on the API side. Every brief
            and summary the LLM sees is composed server-side from real engine state — no client-side
            text synthesis.
          </p>
        </header>

        {TOOL_GROUPS.map((group) => {
          const Icon = group.Icon;
          return (
          <div key={group.label} className="oga-mcp-tools__group">
            <div className="oga-mcp-tools__group-head">
              <span className="oga-mcp-tools__group-icon" aria-hidden>
                <Icon />
              </span>
              <div className="oga-mcp-tools__group-head-text">
                <h3 className="oga-mcp-tools__group-label">{group.label}</h3>
                <p className="oga-mcp-tools__group-tagline">{group.tagline}</p>
              </div>
            </div>
            <div className="oga-mcp-tools__grid">
              {group.tools.map((t) => (
                <article key={t.name} className={`oga-mcp-tools__card${t.marquee ? " oga-mcp-tools__card--marquee" : ""}`}>
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
          );
        })}
      </div>
    </section>
  );
}

/* ─────── 03 — Local development ─────── */

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
      "args": ["-y", "@oga-mcp/server"],
      "env": {
        "OOGA_API_KEY": "oga_dev",
        "OOGA_API_BASE": "http://localhost:4000"
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

/* ─────── 04 — Plans pointer ─────── */

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
          <h2 className="oga-mcp__h2">The MCP server is free.</h2>
          <p className="oga-mcp__lead">
            Open source, no per-call MCP fee. Tool invocations make real calls to the OneGoodArea API
            and consume your account quota the same way any other integration does. Current tiers and
            any MCP-specific terms live on the pricing page.
          </p>
        </header>

        <div className="oga-mcp-plans__pointer">
          <Link href="/pricing" className="oga-btn oga-btn-secondary">
            See pricing <span aria-hidden>→</span>
          </Link>
        </div>
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
          Get a key, paste a config block, restart your client. The eleven tools appear in your next
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
