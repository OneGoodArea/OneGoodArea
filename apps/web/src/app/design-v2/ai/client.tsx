"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { METHODOLOGY_VERSION } from "@onegoodarea/contracts";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { BookDemo } from "../_shared/book-demo";
import {
  ClaudeLogo,
  OpenAiLogo,
  PerplexityLogo,
  GeminiLogo,
  CopilotLogo,
  McpLogo,
} from "../_shared/editor-icons";
import "./ai.css";

/* /ai (AR-773) - the agent-readiness manifest. OneGoodArea sells into AI
   workflows, so this page states, in the open, that we are built to be read,
   queried, and cited by machines. It documents the public entry points
   (llms.txt, MCP server, OpenAPI, methodology), shows the tools an agent can
   call, and points at the pilot. Same bespoke bar as /methodology and
   /docs/*: SecHead, alternating light / quiet / dark shells, monochrome with a
   single green accent. The logo strip is a "readable by" statement, never an
   endorsement or a product integration. Plain full sentences, no em-dashes. */

type Assistant = { Logo: ComponentType<SVGProps<SVGSVGElement>>; name: string };

const READABLE_BY: Assistant[] = [
  { Logo: OpenAiLogo, name: "ChatGPT" },
  { Logo: ClaudeLogo, name: "Claude" },
  { Logo: PerplexityLogo, name: "Perplexity" },
  { Logo: GeminiLogo, name: "Gemini" },
  { Logo: CopilotLogo, name: "Copilot" },
];

type Surface = {
  path: string;
  title: string;
  body: string;
  href: string;
  external?: boolean;
};

const SURFACES: Surface[] = [
  {
    path: "/llms.txt",
    title: "llms.txt",
    body: "A curated map of the site for language models: what OneGoodArea is, the products, and where the canonical docs live.",
    href: "/llms.txt",
    external: true,
  },
  {
    path: "/docs/mcp",
    title: "MCP server",
    body: "Query UK areas from inside Claude, Cursor, and any MCP client. The agent calls the tool and gets structured data back.",
    href: "/docs/mcp",
  },
  {
    path: "/openapi.json",
    title: "OpenAPI spec",
    body: "The full REST API described in a machine-readable spec, so tools can generate clients and understand every endpoint.",
    href: "/openapi.json",
    external: true,
  },
  {
    path: "/methodology",
    title: "Methodology",
    body: "How every score is built, weighted, versioned, and sourced. The reference an assistant needs to explain a number.",
    href: "/methodology",
  },
];

type Tool = { name: string; body: string };

const TOOLS: Tool[] = [
  { name: "score_postcode", body: "Score any UK postcode for a chosen intent." },
  { name: "get_area_signals", body: "Pull the underlying signals for an area, each with its source." },
  { name: "compare_postcodes", body: "Compare two or more areas side by side." },
  { name: "find_areas", body: "Find areas that match a set of criteria." },
  { name: "watch_portfolio", body: "Watch a set of areas and track changes over time." },
  { name: "methodology_for", body: "Return the exact methodology behind a score." },
];

export default function AiClient() {
  return (
    <main className="oga-ai oga-root">
      <Nav />
      <Hero />
      <Surfaces />
      <Capabilities />
      <Citation />
      <Cta />
      <Footer />
    </main>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="oga-ai-hero">
      <div className="oga-ai-hero__field" aria-hidden />
      <div className="oga-ai__wrap oga-ai-hero__inner">
        <div className="oga-ai-hero__eyebrow">
          <span className="oga-ai-hero__eyebrow-dot" aria-hidden />
          For AI agents
        </div>
        <h1 className="oga-ai-hero__title">Built to be read by AI.</h1>
        <p className="oga-ai-hero__lead">
          OneGoodArea is infrastructure for AI property workflows, so we are
          built to be read, queried, and cited by machines, not only by people.
          Every entry point below is public, documented, and stable.
        </p>

        <div className="oga-ai-hero__readable">
          <span className="oga-ai-hero__readable-label">Readable by</span>
          <ul className="oga-ai-hero__logos">
            {READABLE_BY.map(({ Logo, name }) => (
              <li key={name} className="oga-ai-hero__logo">
                <Logo />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- 01 Entry points ---------- */

function Surfaces() {
  return (
    <section className="oga-ai-sec oga-ai-sec--quiet">
      <div className="oga-ai__wrap">
        <SecHead
          num="01"
          kicker="Entry points"
          title="Everything an agent needs, in the open."
        >
          Four public, documented entry points. No login, no scraping, no
          guessing. Point a model at any of them and it can describe
          OneGoodArea correctly and link back to the source.
        </SecHead>

        <div className="oga-ai-surfaces">
          {SURFACES.map((s) => {
            const inner = (
              <>
                <span className="oga-ai-surface__path">{s.path}</span>
                <span className="oga-ai-surface__title">{s.title}</span>
                <span className="oga-ai-surface__body">{s.body}</span>
                <span className="oga-ai-surface__go" aria-hidden>
                  {s.external ? "Open" : "Read"} <span>&rarr;</span>
                </span>
              </>
            );
            return s.external ? (
              <a
                key={s.path}
                href={s.href}
                className="oga-ai-surface"
                target="_blank"
                rel="noreferrer noopener"
              >
                {inner}
              </a>
            ) : (
              <Link key={s.path} href={s.href} className="oga-ai-surface">
                {inner}
              </Link>
            );
          })}
        </div>

        <p className="oga-ai-surfaces__note">
          Also published: an llms-full.txt with the complete reference in one
          file, a discovery manifest at /.well-known/ai-plugin.json, a sitemap, a
          robots policy that explicitly welcomes AI crawlers, and schema.org
          structured data across the site.
        </p>
      </div>
    </section>
  );
}

/* ---------- 02 Capabilities (dark) ---------- */

function Capabilities() {
  return (
    <section className="oga-ai-sec oga-ai-sec--dark" data-oga-surface="dark">
      <div className="oga-ai__wrap">
        <SecHead
          num="02"
          kicker="Beyond reading"
          title="Not just readable. Callable."
          dark
        >
          OneGoodArea ships as a Model Context Protocol server, so an agent does
          not only read about the data, it runs the query and acts on the
          answer. A sample of the tools it gets:
        </SecHead>

        <div className="oga-ai-caps">
          <ul className="oga-ai-tools">
            {TOOLS.map((t) => (
              <li key={t.name} className="oga-ai-tool">
                <span className="oga-ai-tool__name">{t.name}</span>
                <span className="oga-ai-tool__body">{t.body}</span>
              </li>
            ))}
          </ul>

          <div className="oga-ai-call" aria-hidden>
            <div className="oga-ai-call__bar">
              <span className="oga-ai-call__bar-logo">
                <ClaudeLogo />
              </span>
              <span>Claude</span>
            </div>
            <div className="oga-ai-call__body">
              <div className="oga-ai-call__tool">
                <span className="oga-ai-call__tool-logo">
                  <McpLogo />
                </span>
                <span className="oga-ai-call__tool-name">onegoodarea</span>
                <span className="oga-ai-call__tool-fn">score_postcode</span>
              </div>
              <pre className="oga-ai-call__args">{`{ "area": "M1 1AE", "preset": "investing" }`}</pre>
              <pre className="oga-ai-call__result">{`{
  "score": 72,
  "confidence": "high",
  "engine_version": "${METHODOLOGY_VERSION}"
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Citation strip ---------- */

function Citation() {
  return (
    <section className="oga-ai-note">
      <div className="oga-ai__wrap oga-ai-note__inner">
        <span className="oga-ai-note__badge">
          <span className="oga-ai-note__dot" aria-hidden />
          Public and stable
        </span>
        <p className="oga-ai-note__line">
          Every response carries the engine version that produced it, currently{" "}
          <b>v{METHODOLOGY_VERSION}</b>. An answer an assistant gives today stays
          reproducible months from now, so it is safe to cite.
        </p>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */

function Cta() {
  return (
    <section className="oga-ai-cta oga-ai-sec--dark" data-oga-surface="dark">
      <div className="oga-ai__wrap oga-ai-cta__inner">
        <h2 className="oga-ai-cta__title">Building on UK area data?</h2>
        <p className="oga-ai-cta__lead">
          If you are putting area intelligence inside a product or an agent, the
          founding pilot is the fastest way in.
        </p>
        <div className="oga-ai-cta__actions">
          <BookDemo className="oga-btn oga-btn-primary">
            Apply for the pilot
            <span aria-hidden>&rarr;</span>
          </BookDemo>
          <Link href="/docs/mcp" className="oga-btn oga-btn-secondary">
            Read the MCP docs
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared section head (same shape as /methodology) ---------- */

function SecHead({
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
    <header className={`oga-ai-head${dark ? " oga-ai-head--dark" : ""}`}>
      <div className="oga-ai-head__eyebrow">
        <span className="oga-ai-head__num">{num}</span>
        <span className="oga-ai-head__line" aria-hidden />
        <span>{kicker}</span>
      </div>
      <h2 className="oga-ai-head__title">{title}</h2>
      <p className="oga-ai-head__lead">{children}</p>
    </header>
  );
}
