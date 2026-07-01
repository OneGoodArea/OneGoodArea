"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import "./playground.css";

/* /playground client. PR1 (foundation): route + layout + tab bar + empty
   panels + persistent footer CTA. Zero fetching, zero cookie logic, zero
   query submission. Those land in PR2 (BFF + demo token) and PR3 (first
   endpoint wired end-to-end).

   Layout: hero + two-pane workbench + footer CTA + brand footer. The
   workbench is what will grow: left pane holds tab-specific forms, right
   pane holds the response viewer. Everything stubbed here uses live
   copy so the URL is shareable even before functionality lands. */

type TabId =
  | "area"
  | "score"
  | "peers"
  | "rank"
  | "insights"
  | "forecast"
  | "nl";

interface TabDef {
  id: TabId;
  label: string;
  endpoint: string;
  description: string;
  badge?: "AI";
}

const TABS: TabDef[] = [
  {
    id: "area",
    label: "Area",
    endpoint: "GET /v1/area",
    description:
      "Full signal profile for one UK postcode: crime, deprivation, schools, transport, property, amenities, environment.",
  },
  {
    id: "score",
    label: "Score",
    endpoint: "POST /v1/score",
    description:
      "Composite 0 to 100 score for one area under one preset (moving, business, investing, research), with per-dimension reasoning.",
  },
  {
    id: "peers",
    label: "Peers",
    endpoint: "POST /v1/peers",
    description:
      "k-nearest-neighbour peers for an area over normalized signals. Retailers use this to answer where else looks like my best store.",
  },
  {
    id: "rank",
    label: "Rank",
    endpoint: "GET /v1/areas",
    description:
      "Rank LSOAs by any signal within a scope (national or regional). Filter by percentile, value or LAD.",
  },
  {
    id: "insights",
    label: "Insights",
    endpoint: "POST /v1/insights",
    description:
      "Top outliers on a peer-relative z-score signal. Anomaly screening across the store.",
  },
  {
    id: "forecast",
    label: "Forecast",
    endpoint: "POST /v1/forecast",
    description:
      "Linear projection of one signal for one LSOA over the next N months, with confidence bounds.",
  },
  {
    id: "nl",
    label: "NL Query",
    endpoint: "POST /v1/query",
    description:
      "Ask in plain English. The AI planner translates to a structured plan and executes deterministically.",
    badge: "AI",
  },
];

export default function PlaygroundClient() {
  const [activeTab, setActiveTab] = useState<TabId>("area");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="oga-root">
      <Nav />

      <PlaygroundHero />

      <section className="oga-play-workbench oga-section">
        <div className="oga-play__container">
          <TabBar active={activeTab} onSelect={setActiveTab} />

          <div className="oga-play-workbench__grid">
            <QueryPanel tab={active} />
            <ResponsePanel />
          </div>

          <FairUseNote />
        </div>
      </section>

      <SignupCta />
      <Footer />
    </div>
  );
}

/* Hero: small. This is a demo tool, not a landing page. Sets expectation
   with two lines and a proof strip. */
function PlaygroundHero() {
  return (
    <section className="oga-play-hero oga-section-hero">
      <div className="oga-play__container">
        <div className="oga-play-hero__eyebrow">
          <span>Playground</span>
          <span className="oga-play-hero__eyebrow-sep" aria-hidden />
          <span>Live prod, no signup</span>
        </div>
        <h1 className="oga-play-hero__title">
          Try the API for real.
        </h1>
        <p className="oga-play-hero__lead">
          Every response below is a live call against production. Same signals your paid
          integration would see. Same latency. Same numbers. Sign up when you want to use
          this in your own code.
        </p>
        <ul className="oga-play-hero__proof">
          <li>
            <span className="oga-play-hero__proof-num">7</span>
            <span className="oga-play-hero__proof-label">public endpoints</span>
          </li>
          <li>
            <span className="oga-play-hero__proof-num">32k+</span>
            <span className="oga-play-hero__proof-label">England LSOAs indexed</span>
          </li>
          <li>
            <span className="oga-play-hero__proof-num">Live</span>
            <span className="oga-play-hero__proof-label">signals, not fixtures</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* Tab bar. Each tab picks the endpoint under test. NL Query carries an
   AI badge so users understand cost + rate-limit implications. */
function TabBar({
  active,
  onSelect,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <nav className="oga-play-tabs" aria-label="Endpoint tabs">
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            className={
              "oga-play-tab" + (isActive ? " oga-play-tab--active" : "")
            }
            aria-current={isActive}
            onClick={() => onSelect(t.id)}
          >
            <span className="oga-play-tab__label">{t.label}</span>
            {t.badge && (
              <span className="oga-play-tab__badge" aria-label={t.badge}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* Left pane. PR1 shows the endpoint contract as read-only reference.
   PR3 replaces the body with an actual form + Run button per tab. */
function QueryPanel({ tab }: { tab: TabDef }) {
  return (
    <section className="oga-play-panel oga-play-panel--query" aria-label="Query panel">
      <div className="oga-play-panel__head">
        <span className="oga-play-panel__label">Query</span>
        <code className="oga-play-panel__endpoint">{tab.endpoint}</code>
      </div>
      <p className="oga-play-panel__desc">{tab.description}</p>
      <div className="oga-play-panel__placeholder">
        <span className="oga-play-panel__placeholder-tag">PR3</span>
        <p>
          The form for this endpoint lands in the next PR. The layout, tab bar and response
          viewer ship in this one so the URL is real and shareable while the rest fills in.
        </p>
      </div>
    </section>
  );
}

/* Right pane: response viewer + latency + curl. PR1 renders a stub so
   we can see the pane weight and typography. PR3 wires the actual
   response into it. */
function ResponsePanel() {
  return (
    <section className="oga-play-panel oga-play-panel--response" aria-label="Response panel">
      <div className="oga-play-panel__head">
        <span className="oga-play-panel__label">Response</span>
        <span className="oga-play-panel__meta">Idle</span>
      </div>
      <div className="oga-play-panel__placeholder oga-play-panel__placeholder--tall">
        <p>Pick an endpoint above and run a query. The JSON response appears here.</p>
        <p className="oga-play-panel__placeholder-hint">
          Every response is real. Same data your paid integration receives.
        </p>
      </div>
    </section>
  );
}

/* Small honesty line. Playgrounds attract abuse; we tell users the rules
   up front rather than hiding them behind a 429. */
function FairUseNote() {
  return (
    <p className="oga-play-fair">
      Fair use: rate-limited per browser and per IP. AI Query calls are capped per session.
      For unlimited usage, get a free sandbox key.
    </p>
  );
}

/* Persistent CTA strip above the footer. Lists the actual signup wins
   in plain B2B copy. No bait about which model runs the planner. */
function SignupCta() {
  return (
    <section className="oga-play-signup" aria-label="Sign up">
      <div className="oga-play__container oga-play-signup__inner">
        <div className="oga-play-signup__copy">
          <h2 className="oga-play-signup__title">Ready to use this in your code?</h2>
          <p className="oga-play-signup__lead">
            Free sandbox key. No credit card. Everything the playground does, in your
            editor, MCP client, or wherever you build.
          </p>
          <ul className="oga-play-signup__bullets">
            <li>Unlimited queries. No session cap.</li>
            <li>Advanced AI planning for complex multi-step questions.</li>
            <li>Save and share query URLs.</li>
            <li>Use directly from your code and MCP.</li>
          </ul>
        </div>
        <div className="oga-play-signup__actions">
          <Link href="/get-started" className="oga-play-signup__cta">
            Get a sandbox key
          </Link>
          <Link href="/docs" className="oga-play-signup__secondary">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
