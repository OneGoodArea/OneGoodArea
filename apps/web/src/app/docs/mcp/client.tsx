"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";
import { DEMO_URL } from "../../design-v2/_shared/book-demo";
import { ClaudeLogo, CursorLogo } from "../../design-v2/_shared/editor-icons";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../../design-v2/_shared/product-icons";
import { ApiReferenceIcon, McpServerIcon } from "../../design-v2/_shared/docs-icons";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "./mcp.css";

/* /docs/mcp - the MCP server page, rebuilt bespoke in the product-page language
   (Plan 064). Centred hero like /methodology and /docs/api-reference, alternating
   light / cream / dark shells, and a distinct signature per section: a chat plate
   with a real tool call in the hero, the two-step install with monochrome config
   plates, the eleven tools grouped by product, the "real engine output" trust
   points, and the local-dev config. Plain full-sentence copy: no "composite",
   "the moat", "query plane", internal op names, k-NN / distance internals, or
   field names. Install blocks (package, npx args, OOGA_API_KEY / OOGA_API_BASE)
   are kept verbatim and MUST stay accurate to mcp/src/* or integration breaks. */

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
    tagline: "A single number for an area, for the decision you are making.",
    Icon: ScoresIcon,
    tools: [
      {
        name: "score_postcode",
        args: "area, preset",
        blurb: "Score a UK postcode or place for one of four presets. You get a 0 to 100 score, the seven categories behind it with a plain reason and a confidence for each, a short summary, recommendations, and the sources.",
        example: "Score SW1A 1AA for moving.",
      },
      {
        name: "compare_postcodes",
        args: "areas, preset",
        blurb: "Score up to eight areas side by side for the same preset, sorted best first. If one area cannot be scored, the rest still come back.",
        example: "Compare M1 1AE, SW4 0LG, and EH1 1BB for business.",
      },
    ],
  },
  {
    label: "Signals",
    tagline: "Every public signal for an area, in one consistent shape.",
    Icon: SignalsIcon,
    tools: [
      {
        name: "get_area_signals",
        args: "area",
        blurb: "Every signal for an area across all seven categories, each with its value, where it sits nationally, its confidence and the reason for it, its source, and when it was measured.",
        example: "Get all signals for M1 1AE.",
      },
      {
        name: "get_signals_by_category",
        args: "area, category",
        blurb: "The same, narrowed to a single category when you only need one kind of data.",
        example: "Show me the crime signals for SW1A 1AA.",
      },
    ],
  },
  {
    label: "Intelligence",
    tagline: "Ask in plain English, and check the answer.",
    Icon: IntelligenceIcon,
    tools: [
      {
        name: "find_areas",
        args: "question",
        blurb: "Ask a question in plain English. It is turned into a precise query, the database answers it, and you get the answer with the query behind it, so every result can be checked and run again.",
        example: "Areas under £250k where prices are rising, in England.",
      },
      {
        name: "find_peers",
        args: "area, k",
        blurb: "The areas most similar to a given one, ranked by how closely they match across the signals they share.",
        example: "Find 10 areas similar to M1 1AE.",
      },
    ],
  },
  {
    label: "Monitor",
    tagline: "Watch a list of areas and catch the moves that matter.",
    Icon: MonitorIcon,
    tools: [
      {
        name: "watch_portfolio",
        args: "name, areas",
        blurb: "Start watching a list of areas in one step. Returns the new portfolio and the areas it is tracking.",
        example: "Watch 'North Manchester' with M1 1AE, M4 5DR, M8 8QR.",
      },
      {
        name: "get_portfolio_changes",
        args: "portfolio, threshold",
        blurb: "Check a watched portfolio for meaningful change between two months. Returns which areas moved, in which direction, and by how much. Checking never fires your webhooks.",
        example: "What has changed in my North Manchester portfolio?",
      },
    ],
  },
  {
    label: "Brief",
    tagline: "One ready-to-read brief per area, shaped for who is reading it.",
    Icon: McpServerIcon,
    tools: [
      {
        name: "area_brief",
        args: "area, audience",
        blurb: "One brief for an area, shaped for a lender, insurer, retailer or investor: the verdict, the factors that matter to that audience, the signals behind them, recommendations, and sources. Every number is real engine output.",
        example: "Give me a lender brief on SW1A 1AA.",
        marquee: true,
      },
    ],
  },
  {
    label: "Reference",
    tagline: "Quick lookups that never touch your quota.",
    Icon: ApiReferenceIcon,
    tools: [
      {
        name: "methodology_for",
        args: "category",
        blurb: "How any scoring category is worked out: its source, how it is scored, and how much it counts for each preset. Useful for procurement and model-risk review.",
        example: "How does OneGoodArea score schools?",
      },
      {
        name: "engine_version",
        args: "none",
        blurb: "The engine version in production, its release date, and what changed. The same version is stamped on every score and signal you get back.",
        example: "What engine version is in production?",
      },
    ],
  },
];

const GROUNDED: { name: string; body: string }[] = [
  {
    name: "Written by the engine, not the model",
    body: "Every summary and brief is composed on our side from real engine output, so the assistant reports the numbers rather than inventing them.",
  },
  {
    name: "Your key, your limits, your version",
    body: "Each tool call is a real API call under your own key. The same quota, rate limits and pinned engine version apply, exactly as they would anywhere else.",
  },
  {
    name: "Stamped and reproducible",
    body: "Every answer carries the engine version that produced it and, for natural-language queries, the exact query behind it, so you can trace and repeat it.",
  },
];

/* ============================================================
   Page
   ============================================================ */

export default function McpDocsClient() {
  return (
    <div className="oga-root oga-mcp-page">
      <Nav />
      <Hero />
      <SectionInstall />
      <SectionTools />
      <SectionGrounded />
      <SectionDev />
      <SectionPlans />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero - headline + the chat plate
   ============================================================ */

function Hero() {
  return (
    <section className="oga-mcp-hero">
      <div className="oga-mcp-hero__dots" aria-hidden />
      <div className="oga-mcp-hero__inner">
        <span className="oga-mcp-hero__eyebrow">
          <span>MCP server</span>
          <span className="oga-mcp-hero__eyebrow-dot" aria-hidden />
          <span>@oga-mcp/server</span>
        </span>
        <h1 className="oga-mcp-hero__title">Use OneGoodArea from inside Claude, Cursor, and any MCP client.</h1>
        <p className="oga-mcp-hero__lead">
          Score UK areas, ask about signals in plain English, watch portfolios for
          change, and generate ready-to-read briefs, all without leaving your AI
          client. Eleven tools, installed with one key and a config block.
        </p>
        <ul className="oga-mcp-hero__stats" aria-label="At a glance">
          <li>Eleven tools</li>
          <li>One API key</li>
          <li>Claude &amp; Cursor</li>
          <li>Free to install</li>
        </ul>
        <div className="oga-mcp-hero__ctas">
          <Link href="/dashboard" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="#install" className="oga-btn oga-btn-secondary">
            See the install
          </Link>
        </div>
      </div>

      <div className="oga-mcp-hero__stage" aria-hidden>
        <ChatPlate />
      </div>
    </section>
  );
}

/* The signature illustration: a real tool call inside a chat, and the grounded
   answer it hands back. Monochrome, with the connected dot as the one accent. */
function ChatPlate() {
  return (
    <article className="oga-mcp-chat">
      <div className="oga-mcp-chat__bar">
        <span className="oga-mcp-chat__client">Claude</span>
        <span className="oga-mcp-chat__conn">
          <span className="oga-mcp-chat__conn-dot" />
          onegoodarea connected
        </span>
      </div>
      <div className="oga-mcp-chat__body">
        <div className="oga-mcp-chat__turn">
          <span className="oga-mcp-chat__who">You</span>
          <p className="oga-mcp-chat__msg">Give me a lender brief on SW1A 1AA.</p>
        </div>

        <div className="oga-mcp-chat__call">
          <span className="oga-mcp-chat__call-glyph" aria-hidden>⚙</span>
          <span className="oga-mcp-chat__call-name">area_brief</span>
          <span className="oga-mcp-chat__call-args">area = SW1A 1AA · audience = lender</span>
        </div>

        <div className="oga-mcp-chat__turn">
          <span className="oga-mcp-chat__who oga-mcp-chat__who--oga">OneGoodArea</span>
          <p className="oga-mcp-chat__msg">Verdict: proceed with care.</p>
          <ul className="oga-mcp-chat__facts">
            <li><span>schools</span><em>8th percentile</em></li>
            <li><span>crime</span><em>low for the area</em></li>
            <li><span>property</span><em>high value, thin sales</em></li>
          </ul>
          <div className="oga-mcp-chat__stamp">engine v{METHODOLOGY_VERSION}</div>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   01 Install (quiet)
   ============================================================ */

function SectionInstall() {
  return (
    <section id="install" className="oga-mcp-sec oga-mcp-sec--quiet">
      <div className="oga-mcp-page__wrap">
        <McpHead num="01" kicker="Install" title="Two steps, and it is in your client.">
          One API key and one config edit. Your client spawns the server for you,
          and the tools appear in your next conversation. No install command, no
          separate service to run.
        </McpHead>

        <div className="oga-mcp-install">
          <ol className="oga-mcp-install__steps">
            <li className="oga-mcp-install__step">
              <span className="oga-mcp-install__step-num">01</span>
              <div>
                <div className="oga-mcp-install__step-name">Get an API key</div>
                <p className="oga-mcp-install__step-body">
                  Create a key in your <Link href="/dashboard" className="oga-mcp-page__link">dashboard</Link>.
                  Keys start with <code>oga_</code>.
                </p>
              </div>
            </li>
            <li className="oga-mcp-install__step">
              <span className="oga-mcp-install__step-num">02</span>
              <div>
                <div className="oga-mcp-install__step-name">Add the server to your client config</div>
                <p className="oga-mcp-install__step-body">
                  Drop the block into your client, restart it, and the eleven tools
                  are ready. Paste your key in place of <code>oga_…</code>.
                </p>
              </div>
            </li>
          </ol>

          <div className="oga-mcp-install__configs">
            <CodePlate
              client="Claude Desktop"
              Logo={ClaudeLogo}
              note="claude_desktop_config.json"
              code={`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@oga-mcp/server"],
      "env": {
        "OOGA_API_KEY": "oga_…"
      }
    }
  }
}`}
            />
            <CodePlate
              client="Cursor"
              Logo={CursorLogo}
              note=".cursor/mcp.json"
              code={`{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@oga-mcp/server"],
      "env": { "OOGA_API_KEY": "oga_…" }
    }
  }
}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CodePlate({
  client,
  Logo,
  note,
  code,
}: {
  client: string;
  Logo: ComponentType<SVGProps<SVGSVGElement>>;
  note: string;
  code: string;
}) {
  return (
    <article className="oga-mcp-plate" data-oga-surface="dark">
      <div className="oga-mcp-plate__bar">
        <span className="oga-mcp-plate__client">
          <span className="oga-mcp-plate__logo" aria-hidden><Logo /></span>
          {client}
        </span>
        <span className="oga-mcp-plate__note">{note}</span>
      </div>
      <pre className="oga-mcp-plate__code">{code}</pre>
    </article>
  );
}

/* ============================================================
   02 Tools (dark)
   ============================================================ */

function SectionTools() {
  return (
    <section id="tools" className="oga-mcp-sec oga-mcp-sec--dark" data-oga-surface="dark">
      <div className="oga-mcp-page__wrap">
        <McpHead num="02" kicker="Tools" title="Eleven tools, grouped by product." dark>
          The four products, one ready-made brief, and a couple of quick lookups.
          Each tool is a plain call your assistant can make on your behalf, and
          every answer comes straight from the engine.
        </McpHead>

        <div className="oga-mcp-tools">
          {TOOL_GROUPS.map((group) => {
            const Icon = group.Icon;
            return (
              <div key={group.label} className="oga-mcp-tools__group">
                <div className="oga-mcp-tools__group-head">
                  <span className="oga-mcp-tools__group-icon" aria-hidden><Icon width={22} height={22} /></span>
                  <div>
                    <h3 className="oga-mcp-tools__group-label">{group.label}</h3>
                    <p className="oga-mcp-tools__group-tagline">{group.tagline}</p>
                  </div>
                </div>
                <div className="oga-mcp-tools__grid">
                  {group.tools.map((t) => (
                    <article
                      key={t.name}
                      className={`oga-mcp-tools__card${t.marquee ? " oga-mcp-tools__card--marquee" : ""}`}
                    >
                      <div className="oga-mcp-tools__card-head">
                        <code className="oga-mcp-tools__card-name">{t.name}</code>
                        <span className="oga-mcp-tools__card-args">{t.args}</span>
                      </div>
                      <p className="oga-mcp-tools__card-body">{t.blurb}</p>
                      <div className="oga-mcp-tools__card-eg">
                        <span className="oga-mcp-tools__card-eg-label">Try</span>
                        &ldquo;{t.example}&rdquo;
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   03 Grounded (light)
   ============================================================ */

function SectionGrounded() {
  return (
    <section id="grounded" className="oga-mcp-sec oga-mcp-sec--light">
      <div className="oga-mcp-page__wrap">
        <McpHead num="03" kicker="Why you can trust it" title="Every answer is real engine output.">
          The server is a thin bridge to the same API everything else runs on. It
          does not make numbers up, and it does not change how the engine works. It
          just puts the engine within reach of your assistant.
        </McpHead>

        <div className="oga-mcp-grounded__grid">
          {GROUNDED.map((g, i) => (
            <article key={g.name} className="oga-mcp-grounded__card">
              <span className="oga-mcp-grounded__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="oga-mcp-grounded__name">{g.name}</h3>
              <p className="oga-mcp-grounded__body">{g.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   04 Local development (quiet)
   ============================================================ */

function SectionDev() {
  return (
    <section id="develop" className="oga-mcp-sec oga-mcp-sec--quiet">
      <div className="oga-mcp-page__wrap">
        <McpHead num="04" kicker="Local development" title="Point it at your own backend.">
          Testing against a local API instance? Set a base URL and the server will
          talk to it instead. Everything else stays the same.
        </McpHead>

        <div className="oga-mcp-dev">
          <article className="oga-mcp-plate" data-oga-surface="dark">
            <div className="oga-mcp-plate__bar">
              <span className="oga-mcp-plate__client">Dev config</span>
              <span className="oga-mcp-plate__note">mcp.json</span>
            </div>
            <pre className="oga-mcp-plate__code">{`{
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
}`}</pre>
          </article>

          <p className="oga-mcp-dev__support">
            Questions, requests or trouble getting set up? Email{" "}
            <a href="mailto:operation@onegoodarea.co.uk" className="oga-mcp-page__link">
              operation@onegoodarea.co.uk <span aria-hidden>→</span>
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   05 Plans (light)
   ============================================================ */

function SectionPlans() {
  return (
    <section id="plans" className="oga-mcp-sec oga-mcp-sec--light">
      <div className="oga-mcp-page__wrap">
        <McpHead num="05" kicker="Plans" title="The server is free.">
          There is no separate charge for the MCP server. Tool calls are ordinary
          API calls, so they draw on your account the same way any other
          integration does. Current tiers live on the pricing page.
        </McpHead>

        <div className="oga-mcp-plans">
          <Link href="/pricing" className="oga-btn oga-btn-secondary">
            See pricing <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA (dark)
   ============================================================ */

function FinalCta() {
  return (
    <section className="oga-mcp-sec oga-mcp-sec--dark oga-mcp-cta" data-oga-surface="dark">
      <div className="oga-mcp-page__wrap oga-mcp-cta__inner">
        <h2 className="oga-mcp-cta__title">Bring UK area data into your assistant.</h2>
        <p className="oga-mcp-cta__lead">
          Get a key, paste the config, restart your client. The eleven tools are
          waiting in your next conversation.
        </p>
        <div className="oga-mcp-cta__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href={DEMO_URL} className="oga-btn oga-btn-secondary">
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Shared section header
   ============================================================ */

function McpHead({
  num,
  kicker,
  title,
  children,
  dark = false,
}: {
  num: string;
  kicker: string;
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <header className={`oga-mcp-head${dark ? " oga-mcp-head--dark" : ""}`}>
      <div className="oga-mcp-head__eyebrow">
        <span className="oga-mcp-head__num">{num}</span>
        <span className="oga-mcp-head__line" aria-hidden />
        <span>{kicker}</span>
      </div>
      <h2 className="oga-mcp-head__title">{title}</h2>
      <p className="oga-mcp-head__lead">{children}</p>
    </header>
  );
}
