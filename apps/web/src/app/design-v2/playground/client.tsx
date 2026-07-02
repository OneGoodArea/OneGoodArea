"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { JsonView } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { TurnstileWidget } from "./turnstile-widget";
import { ENDPOINT_DOCS, type EndpointDoc } from "./endpoint-docs";
import "./playground.css";

/* /playground client. PR4 fans out to all seven tabs:
     - Area: GET /v1/area (postcode)
     - Score: POST /v1/score (postcode + preset)
     - Peers: POST /v1/peers (target postcode + k)
     - Rank: GET /v1/areas (signal + limit + percentile_gte)
     - Insights: POST /v1/insights (peer-relative signal_key + country + k)
     - Forecast: POST /v1/forecast (target postcode + signal_key + horizon_months)
     - NL Query: POST /v1/query (natural-language question) */

/* Inlined at build time by Next.js. Undefined string in prod means we
   never configured Turnstile. the client skips the widget. */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/* Brand v3 skin for react-json-view-lite. Classes styled in
   playground.css so we override the library's default CSS without
   forking it. Keeps keys mono + fg, values color-coded by type. */
const ogaJsonStyle = {
  container: "oga-json",
  basicChildStyle: "oga-json__row",
  label: "oga-json__key",
  clickableLabel: "oga-json__key oga-json__key--clickable",
  nullValue: "oga-json__val oga-json__val--null",
  undefinedValue: "oga-json__val oga-json__val--null",
  numberValue: "oga-json__val oga-json__val--number",
  stringValue: "oga-json__val oga-json__val--string",
  booleanValue: "oga-json__val oga-json__val--bool",
  otherValue: "oga-json__val",
  punctuation: "oga-json__punc",
  collapseIcon: "oga-json__caret oga-json__caret--open",
  expandIcon: "oga-json__caret oga-json__caret--closed",
  collapsedContent: "oga-json__collapsed",
  noQuotesForStringValues: false,
  quotesForFieldNames: false,
  ariaLabelForTreeNodes: "JSON tree",
  ariaLabelForCollapsedTreeNodes: "Collapsed JSON tree",
};

type TabId =
  | "area"
  | "score"
  | "peers"
  | "rank"
  | "insights"
  | "forecast"
  | "nl"
  | "monitor";

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
  {
    id: "monitor",
    label: "Portfolios",
    endpoint: "PREVIEW /v1/portfolios",
    description:
      "Track a book of areas and get material-change alerts via webhooks when a monitored signal moves. Preview only: the write endpoints (create portfolio, add areas, subscribe to signal.changed) sign up for a sandbox key to unlock.",
  },
];

interface SessionSnapshot {
  calls_used: number;
  calls_remaining: number;
  nl_calls_used: number;
  nl_calls_remaining: number;
}

interface ProxyResponse {
  endpoint: string;
  upstream_status: number;
  latency_ms: number;
  truncated: boolean;
  response: unknown;
  session: SessionSnapshot;
}

/* Nudge shows once the session has been used enough to prove real
   interest but before rate caps stop the user. Tuned to fire at 5 .
   enough exploration to see the API works, still 25 calls of headroom. */
const NUDGE_AT = 5;

export default function PlaygroundClient() {
  const [activeTab, setActiveTab] = useState<TabId>("area");
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const active = TABS.find((t) => t.id === activeTab)!;
  const tokenRequestedRef = useRef(false);

  /* Mint the demo cookie once we have what we need. With Turnstile
     configured, wait for the solved token; without it (local dev),
     mint immediately with an empty body. apps/api stub-passes. */
  useEffect(() => {
    if (tokenRequestedRef.current) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) return;
    tokenRequestedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/playground/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(turnstileToken ? { turnstile_token: turnstileToken } : {}),
          credentials: "same-origin",
        });
        if (!res.ok) {
          setTokenError(`token_${res.status}`);
          return;
        }
        setTokenReady(true);
      } catch {
        setTokenError("token_network");
      }
    })();
  }, [turnstileToken]);

  const runProxy = useCallback(
    async (method: "GET" | "POST", path: string, body?: unknown): Promise<ProxyResponse> => {
      const res = await fetch("/api/playground/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, path, body }),
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as
        | ProxyResponse
        | { error?: string; code?: string };
      if (!res.ok) {
        const err = json as { error?: string; code?: string };
        throw new PlaygroundError(err.code ?? `http_${res.status}`, err.error ?? "Proxy call failed");
      }
      const proxy = json as ProxyResponse;
      if (proxy.session) setSession(proxy.session);
      return proxy;
    },
    [],
  );

  return (
    <div className="oga-root oga-play-root">
      <Nav />

      {TURNSTILE_SITE_KEY && !tokenReady && !tokenError && (
        <section className="oga-play-turnstile-section" aria-label="Bot check">
          <div className="oga-play__container">
            <TurnstileWidget
              siteKey={TURNSTILE_SITE_KEY}
              onToken={setTurnstileToken}
              onError={(code) => setTokenError(code)}
            />
          </div>
        </section>
      )}

      <section className="oga-play-stage">
        <div className="oga-play-stage__container">
          <div className="oga-play-shell">
            <EndpointSidebar activeTab={activeTab} onSelect={setActiveTab} />

            <main className="oga-play-main">
              {session && session.calls_used >= NUDGE_AT && (
                <NudgeStrip callsUsed={session.calls_used} />
              )}

              <div className="oga-play-split">
                <aside className="oga-play-docs" aria-label="Endpoint documentation">
                  <EndpointDocsPane tab={active} />
                </aside>

                <section className="oga-play-runner" aria-label="Runner">
                  <TabRouter activeTab={activeTab} runProxy={runProxy} tokenReady={tokenReady} />
                </section>
              </div>

              <FairUseNote />
            </main>
          </div>
        </div>
      </section>

      <SignupCta />
      <Footer />
    </div>
  );
}

/* Grouped sidebar (AR-437 step 1). Signals / Scores / Intelligence.
   Reinforces the four-product story surfaced everywhere else on the
   marketing site. */
interface SidebarGroup {
  label: string;
  tabs: TabId[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  { label: "Signals", tabs: ["area", "rank"] },
  { label: "Scores", tabs: ["score"] },
  { label: "Intelligence", tabs: ["peers", "insights", "forecast", "nl"] },
  { label: "Monitor", tabs: ["monitor"] },
];

function EndpointSidebar({
  activeTab,
  onSelect,
}: {
  activeTab: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <nav className="oga-play-sidebar" aria-label="Endpoints">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.label} className="oga-play-sidebar__group">
          <div className="oga-play-sidebar__group-label">{group.label}</div>
          <ul className="oga-play-sidebar__list">
            {group.tabs.map((tabId) => {
              const t = TABS.find((tab) => tab.id === tabId)!;
              const isActive = t.id === activeTab;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={"oga-play-sidebar__item" + (isActive ? " oga-play-sidebar__item--active" : "")}
                    aria-current={isActive}
                    onClick={() => onSelect(t.id)}
                  >
                    <span className="oga-play-sidebar__method">{t.endpoint.split(" ")[0]}</span>
                    <span className="oga-play-sidebar__label">{t.label}</span>
                    {t.badge && <span className="oga-play-sidebar__badge">{t.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* Docs pane (AR-437 step 2). Renders per-endpoint documentation from
   endpoint-docs.ts. Method + path + title + description come from the
   shared TABS array; the ICP framing / params / response / errors /
   rate-limit come from ENDPOINT_DOCS. */
function EndpointDocsPane({ tab }: { tab: TabDef }) {
  const docs = ENDPOINT_DOCS[tab.id];
  const method = tab.endpoint.split(" ")[0];
  const path = tab.endpoint.split(" ").slice(1).join(" ");

  return (
    <div className="oga-play-docs__inner">
      <div className="oga-play-docs__eyebrow">
        <span className="oga-play-docs__method">{method}</span>
        <code className="oga-play-docs__path">{path}</code>
      </div>
      <h1 className="oga-play-docs__title">{tab.label}</h1>
      <p className="oga-play-docs__desc">{tab.description}</p>

      {docs ? <EndpointDocsBody docs={docs} /> : null}
    </div>
  );
}

function EndpointDocsBody({ docs }: { docs: EndpointDoc }) {
  return (
    <>
      <section className="oga-play-docs__section oga-play-docs__section--icp">
        <p>{docs.icp}</p>
      </section>

      {docs.params.length > 0 && (
        <section className="oga-play-docs__section">
          <h2 className="oga-play-docs__h">Parameters</h2>
          <div className="oga-play-docs__table">
            {docs.params.map((p) => (
              <div key={p.name} className="oga-play-docs__row">
                <div className="oga-play-docs__row-head">
                  <code className="oga-play-docs__name">{p.name}</code>
                  <span className="oga-play-docs__type">{p.type}</span>
                  {p.required ? (
                    <span className="oga-play-docs__req">required</span>
                  ) : (
                    <span className="oga-play-docs__opt">optional</span>
                  )}
                </div>
                <p className="oga-play-docs__row-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {docs.response.length > 0 && (
        <section className="oga-play-docs__section">
          <h2 className="oga-play-docs__h">Response</h2>
          <div className="oga-play-docs__table">
            {docs.response.map((r) => (
              <div key={r.key} className="oga-play-docs__row">
                <div className="oga-play-docs__row-head">
                  <code className="oga-play-docs__name">{r.key}</code>
                  <span className="oga-play-docs__type">{r.type}</span>
                </div>
                <p className="oga-play-docs__row-desc">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {docs.errors.length > 0 && (
        <section className="oga-play-docs__section">
          <h2 className="oga-play-docs__h">Errors</h2>
          <ul className="oga-play-docs__errors">
            {docs.errors.map((e) => (
              <li key={e.code}>
                <span className="oga-play-docs__err-code">{e.code}</span>
                <span>{e.when}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="oga-play-docs__section oga-play-docs__section--rate">
        <span className="oga-play-docs__rate-tag">Rate limit</span>
        <p>{docs.rateLimit}</p>
      </section>
    </>
  );
}

/* Monitor preview (AR-437 step 1). The four-product story includes
   Monitor (portfolios + change detection) but the write-side surface
   isn't safe to expose in an anonymous playground. creating a
   portfolio, adding areas, subscribing to signal.changed all require
   an org-scoped write path. Instead we show a static preview of what
   the /v1/portfolios/:id/changes response looks like so users see the
   shape of the Monitor moat without us having to build a mutating
   sandbox around it. */
const MONITOR_SAMPLE_RESPONSE = {
  portfolio_id: "pfo_demo_manchester_book",
  portfolio_name: "Manchester store book (sample)",
  baseline: "first",
  threshold_pct: 5,
  window: "2025-01 to 2026-06",
  changes: [
    {
      geo_code: "E01005207",
      area_label: "Manchester 021D",
      signal_key: "property.median_price",
      direction: "up",
      pct_change: 16.6,
      material: true,
      latest_value: 207000,
      baseline_value: 177500,
    },
    {
      geo_code: "E01005216",
      area_label: "Manchester 021C",
      signal_key: "crime.total_12m",
      direction: "down",
      pct_change: -8.1,
      material: true,
      latest_value: 412,
      baseline_value: 448,
    },
    {
      geo_code: "E01005208",
      area_label: "Manchester 021E",
      signal_key: "deprivation.imd_score",
      direction: "flat",
      pct_change: 0.4,
      material: false,
    },
  ],
  meta: {
    engine_version: "v2.0.2",
    generated_at: "2026-06-14T12:00:00Z",
  },
};

function MonitorPreview() {
  return (
    <div className="oga-play-monitor">
      <div className="oga-play-monitor__intro">
        <span className="oga-play-monitor__tag">Preview</span>
        <p>
          Monitor watches a book of postcodes and fires <code>signal.changed</code>{" "}
          webhooks when a tracked signal moves past your threshold. It&apos;s the
          product that turns the moat clock into ops. Below is a sample response
          the way it looks after a portfolio detection run.
        </p>
      </div>
      <div className="oga-play-panel oga-play-panel--response">
        <div className="oga-play-panel__head">
          <span className="oga-play-panel__label">Sample response</span>
          <span className="oga-play-panel__meta">POST /v1/portfolios/:id/changes</span>
        </div>
        <div className="oga-play-panel__json">
          <JsonView
            data={MONITOR_SAMPLE_RESPONSE}
            shouldExpandNode={(level) => level < 3}
            style={ogaJsonStyle}
          />
        </div>
        <div className="oga-play-monitor__cta">
          <p>Portfolios need an authenticated org. Sign up (free) to create one and hit these endpoints live.</p>
          <Link href="/get-started" className="oga-play-monitor__cta-btn">
            Sign up →
          </Link>
        </div>
      </div>
    </div>
  );
}

class PlaygroundError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function TabRouter({
  activeTab,
  runProxy,
  tokenReady,
}: {
  activeTab: TabId;
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const shared = { runProxy, tokenReady };
  switch (activeTab) {
    case "area":
      return <AreaWorkbench {...shared} />;
    case "score":
      return <ScoreWorkbench {...shared} />;
    case "peers":
      return <PeersWorkbench {...shared} />;
    case "rank":
      return <RankWorkbench {...shared} />;
    case "insights":
      return <InsightsWorkbench {...shared} />;
    case "forecast":
      return <ForecastWorkbench {...shared} />;
    case "nl":
      return <NlWorkbench {...shared} />;
    case "monitor":
      return <MonitorPreview />;
  }
}

/* Hero */
function PlaygroundHero({
  session,
  tokenReady,
  tokenError,
}: {
  session: SessionSnapshot | null;
  tokenReady: boolean;
  tokenError: string | null;
}) {
  return (
    <section className="oga-play-hero oga-section-hero">
      <div className="oga-play__container">
        <div className="oga-play-hero__eyebrow">
          <span>Playground</span>
          <span className="oga-play-hero__eyebrow-sep" aria-hidden />
          <span>Live prod, no signup</span>
        </div>
        <h1 className="oga-play-hero__title">Try the API for real.</h1>
        <p className="oga-play-hero__lead">
          Every response below is a live call against production. Same signals your paid
          integration would see. Same latency. Same numbers. Sign up when you want to use
          this in your own code.
        </p>
        <SessionChip session={session} tokenReady={tokenReady} tokenError={tokenError} />
      </div>
    </section>
  );
}

function SessionChip({
  session,
  tokenReady,
  tokenError,
}: {
  session: SessionSnapshot | null;
  tokenReady: boolean;
  tokenError: string | null;
}) {
  if (tokenError) {
    return (
      <p className="oga-play-hero__session oga-play-hero__session--err">
        Session could not start ({tokenError}). Refresh the page to retry.
      </p>
    );
  }
  if (session) {
    return (
      <p className="oga-play-hero__session">
        Session active. Calls used: <strong>{session.calls_used}</strong> of{" "}
        {session.calls_used + session.calls_remaining}. AI queries used:{" "}
        <strong>{session.nl_calls_used}</strong> of{" "}
        {session.nl_calls_used + session.nl_calls_remaining}.
      </p>
    );
  }
  if (tokenReady) {
    return (
      <p className="oga-play-hero__session oga-play-hero__session--ready">
        Ready. Pick an endpoint and run a query.
      </p>
    );
  }
  return (
    <p className="oga-play-hero__session oga-play-hero__session--warmup">
      Warming up demo session...
    </p>
  );
}

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
            className={"oga-play-tab" + (isActive ? " oga-play-tab--active" : "")}
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

/* ==============================================================
   Workbench state + hook
   ============================================================== */

type LoadState = {
  status: "idle" | "loading" | "ok" | "error";
  startedAt?: number;
  result?: ProxyResponse;
  error?: { code: string; message: string };
  /* The exact request we sent. powers the copy-as-curl button. */
  lastRequest?: { method: "GET" | "POST"; path: string; body?: unknown };
};

function useRunner(
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>,
) {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const run = useCallback(
    async (method: "GET" | "POST", path: string, body?: unknown) => {
      setState({ status: "loading", startedAt: performance.now(), lastRequest: { method, path, body } });
      try {
        const result = await runProxy(method, path, body);
        setState((s) => ({ status: "ok", result, lastRequest: s.lastRequest }));
      } catch (err) {
        const e = err as { code?: string; message?: string };
        setState((s) => ({
          status: "error",
          error: { code: e.code ?? "network", message: e.message ?? "Request failed." },
          lastRequest: s.lastRequest,
        }));
      }
    },
    [runProxy],
  );
  return { state, run };
}

/* ==============================================================
   Chip row (pre-warmed inputs)
   ============================================================== */

function Chips({
  label,
  chips,
  onPick,
}: {
  label: string;
  chips: string[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="oga-play-chips">
      <span className="oga-play-chips__label">{label}</span>
      <div className="oga-play-chips__list">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className="oga-play-chip"
            onClick={() => onPick(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

const POSTCODE_CHIPS = ["SW1A 1AA", "M1 1AE", "L1 8JQ", "OX1 3QU", "B1 1AA"];
const SIGNAL_CHIPS = [
  "crime.total_12m",
  "deprivation.imd_score",
  "property.median_price_paid",
  "schools.ofsted_pct_outstanding",
];
const PEER_Z_SIGNAL_CHIPS = [
  "crime.total_12m_peer_relative_z",
  "deprivation.imd_score_peer_relative_z",
];
const NL_QUESTION_CHIPS = [
  "best areas for families in London",
  "rank LAs by crime rate in England",
  "cheap postcodes near Manchester",
];

/* ==============================================================
   Area. GET /v1/area?postcode=...
   ============================================================== */

function AreaWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [postcode, setPostcode] = useState("SW1A 1AA");
  const submit = () => {
    const clean = postcode.trim();
    if (!clean) return;
    void run("GET", `/v1/area?postcode=${encodeURIComponent(clean)}`);
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Area query">
        <PanelHead label="Query" endpoint="GET /v1/area" />
        <p className="oga-play-panel__desc">{TABS[0].description}</p>
        <Chips label="Try" chips={POSTCODE_CHIPS} onPick={setPostcode} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField label="Postcode" id="area-pc" value={postcode} onChange={setPostcode} placeholder="SW1A 1AA" />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   Score. POST /v1/score { area, preset }
   ============================================================== */

const PRESETS = ["moving", "business", "investing", "research"] as const;

function ScoreWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [postcode, setPostcode] = useState("SW1A 1AA");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("business");
  const submit = () => {
    const clean = postcode.trim();
    if (!clean) return;
    void run("POST", "/v1/score", { area: clean, preset });
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Score query">
        <PanelHead label="Query" endpoint="POST /v1/score" />
        <p className="oga-play-panel__desc">{TABS[1].description}</p>
        <Chips label="Try" chips={POSTCODE_CHIPS} onPick={setPostcode} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField label="Area (postcode)" id="score-pc" value={postcode} onChange={setPostcode} />
          <SelectField
            label="Preset"
            id="score-preset"
            value={preset}
            options={PRESETS as unknown as string[]}
            onChange={(v) => setPreset(v as (typeof PRESETS)[number])}
          />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   Peers. POST /v1/peers { target: { postcode }, k }
   ============================================================== */

function PeersWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [postcode, setPostcode] = useState("SW1A 1AA");
  const [k, setK] = useState("10");
  const submit = () => {
    const clean = postcode.trim();
    if (!clean) return;
    const kNum = parseInt(k, 10);
    void run("POST", "/v1/peers", {
      target: { postcode: clean },
      k: Number.isFinite(kNum) && kNum > 0 ? kNum : 10,
    });
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Peers query">
        <PanelHead label="Query" endpoint="POST /v1/peers" />
        <p className="oga-play-panel__desc">{TABS[2].description}</p>
        <Chips label="Try" chips={POSTCODE_CHIPS} onPick={setPostcode} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField label="Target postcode" id="peers-pc" value={postcode} onChange={setPostcode} />
          <FormField label="k (number of peers)" id="peers-k" value={k} onChange={setK} inputMode="numeric" />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   Rank. GET /v1/areas?signal=&limit=&percentile_gte=
   ============================================================== */

function RankWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [signal, setSignal] = useState("crime.total_12m");
  const [limit, setLimit] = useState("10");
  const [percentileGte, setPercentileGte] = useState("");
  const submit = () => {
    const s = signal.trim();
    if (!s) return;
    const params = new URLSearchParams({ signal: s });
    const nLim = parseInt(limit, 10);
    if (Number.isFinite(nLim) && nLim > 0) params.set("limit", String(nLim));
    const nPct = parseFloat(percentileGte);
    if (Number.isFinite(nPct)) params.set("percentile_gte", String(nPct));
    void run("GET", `/v1/areas?${params.toString()}`);
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Rank query">
        <PanelHead label="Query" endpoint="GET /v1/areas" />
        <p className="oga-play-panel__desc">{TABS[3].description}</p>
        <Chips label="Signals" chips={SIGNAL_CHIPS} onPick={setSignal} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField label="Signal key" id="rank-signal" value={signal} onChange={setSignal} />
          <FormField label="Limit" id="rank-limit" value={limit} onChange={setLimit} inputMode="numeric" />
          <FormField
            label="Percentile floor (optional, 0-100)"
            id="rank-pct"
            value={percentileGte}
            onChange={setPercentileGte}
            inputMode="numeric"
            placeholder="e.g. 90"
          />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   Insights. POST /v1/insights { signal_key, country, k }
   ============================================================== */

function InsightsWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [signal, setSignal] = useState("crime.total_12m_peer_relative_z");
  const [country, setCountry] = useState("England");
  const [k, setK] = useState("20");
  const submit = () => {
    const s = signal.trim();
    if (!s) return;
    const kNum = parseInt(k, 10);
    void run("POST", "/v1/insights", {
      signal_key: s,
      country: country.trim() || undefined,
      k: Number.isFinite(kNum) && kNum > 0 ? kNum : 20,
    });
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Insights query">
        <PanelHead label="Query" endpoint="POST /v1/insights" />
        <p className="oga-play-panel__desc">{TABS[4].description}</p>
        <Chips label="Signals" chips={PEER_Z_SIGNAL_CHIPS} onPick={setSignal} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField
            label="Signal key (must end in _peer_relative_z)"
            id="ins-signal"
            value={signal}
            onChange={setSignal}
          />
          <FormField label="Country" id="ins-country" value={country} onChange={setCountry} />
          <FormField label="k (top outliers)" id="ins-k" value={k} onChange={setK} inputMode="numeric" />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   Forecast. POST /v1/forecast { target, signal_key, horizon_months }
   ============================================================== */

function ForecastWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [postcode, setPostcode] = useState("SW1A 1AA");
  const [signal, setSignal] = useState("crime.total_12m");
  const [horizon, setHorizon] = useState("6");
  const submit = () => {
    const clean = postcode.trim();
    const s = signal.trim();
    if (!clean || !s) return;
    const h = parseInt(horizon, 10);
    void run("POST", "/v1/forecast", {
      target: { postcode: clean },
      signal_key: s,
      horizon_months: Number.isFinite(h) && h > 0 ? h : 6,
    });
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Forecast query">
        <PanelHead label="Query" endpoint="POST /v1/forecast" />
        <p className="oga-play-panel__desc">{TABS[5].description}</p>
        <Chips label="Postcodes" chips={POSTCODE_CHIPS} onPick={setPostcode} />
        <Chips label="Signals" chips={SIGNAL_CHIPS} onPick={setSignal} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField label="Target postcode" id="fc-pc" value={postcode} onChange={setPostcode} />
          <FormField label="Signal key" id="fc-signal" value={signal} onChange={setSignal} />
          <FormField label="Horizon (months)" id="fc-h" value={horizon} onChange={setHorizon} inputMode="numeric" />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   NL Query. POST /v1/query { question }
   ============================================================== */

function NlWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const { state, run } = useRunner(runProxy);
  const [question, setQuestion] = useState("best areas for families in London");
  const submit = () => {
    const q = question.trim();
    if (!q) return;
    void run("POST", "/v1/query", { question: q });
  };
  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="NL query">
        <PanelHead label="Query" endpoint="POST /v1/query" badge="AI" />
        <p className="oga-play-panel__desc">{TABS[6].description}</p>
        <p className="oga-play-panel__nl-cap">
          AI queries cost more to run, so sessions are capped at 3. Sign up for unlimited.
        </p>
        <Chips label="Try" chips={NL_QUESTION_CHIPS} onPick={setQuestion} />
        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="oga-play-form__label" htmlFor="nl-q">
            Question
          </label>
          <textarea
            id="nl-q"
            className="oga-play-form__textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="Ask a question..."
          />
          <SubmitButton state={state} disabled={!tokenReady} />
        </form>
      </section>
      <ResponsePanelWired state={state} />
    </div>
  );
}

/* ==============================================================
   Response panel (shared)
   ============================================================== */

function ResponsePanelWired({ state }: { state: LoadState }) {
  const elapsed = useElapsedMs(state.status === "loading" ? state.startedAt : undefined);
  const meta =
    state.status === "loading"
      ? `${(elapsed / 1000).toFixed(1)}s`
      : state.status === "ok" && state.result
      ? `${state.result.upstream_status} • ${state.result.latency_ms} ms`
      : state.status === "error"
      ? "Error"
      : "Idle";

  return (
    <section className="oga-play-panel oga-play-panel--response" aria-label="Response panel">
      <div className="oga-play-panel__head">
        <span className="oga-play-panel__label">Response</span>
        <div className="oga-play-panel__head-right">
          {state.status === "ok" && state.lastRequest && (
            <CopyCurlButton request={state.lastRequest} />
          )}
          <span
            className={
              "oga-play-panel__meta" +
              (state.status === "error" ? " oga-play-panel__meta--err" : "") +
              (state.status === "ok" ? " oga-play-panel__meta--ok" : "") +
              (state.status === "loading" ? " oga-play-panel__meta--live" : "")
            }
          >
            {meta}
          </span>
        </div>
      </div>

      {state.status === "idle" && (
        <div className="oga-play-panel__placeholder oga-play-panel__placeholder--tall">
          <p>Pick an endpoint above and run a query. The JSON response appears here.</p>
          <p className="oga-play-panel__placeholder-hint">
            Every response is real. Same data your paid integration receives.
          </p>
        </div>
      )}
      {state.status === "loading" && (
        <div className="oga-play-panel__loading">
          <div className="oga-play-panel__skeleton" aria-hidden>
            <div className="oga-play-panel__skeleton-row oga-play-panel__skeleton-row--short" />
            <div className="oga-play-panel__skeleton-row" />
            <div className="oga-play-panel__skeleton-row oga-play-panel__skeleton-row--long" />
            <div className="oga-play-panel__skeleton-row" />
            <div className="oga-play-panel__skeleton-row oga-play-panel__skeleton-row--short" />
            <div className="oga-play-panel__skeleton-row oga-play-panel__skeleton-row--long" />
            <div className="oga-play-panel__skeleton-row" />
            <div className="oga-play-panel__skeleton-row oga-play-panel__skeleton-row--short" />
          </div>
          <p className="oga-play-panel__loading-hint" role="status" aria-live="polite">
            {loadingHint(elapsed)}
          </p>
        </div>
      )}
      {state.status === "error" && state.error && (
        <div className="oga-play-panel__error">
          <p className="oga-play-panel__error-code">{state.error.code}</p>
          <p>{state.error.message}</p>
        </div>
      )}
      {state.status === "ok" && state.result && (
        <div className="oga-play-panel__json">
          <JsonView
            data={state.result.response as object}
            shouldExpandNode={(level) => level < 3}
            style={ogaJsonStyle}
          />
        </div>
      )}
      {state.status === "ok" && state.result?.truncated && (
        <p className="oga-play-panel__truncated">
          Response truncated to fit the playground display. Sign up to see full payloads.
        </p>
      )}
      {state.status === "ok" && state.result && (
        <p className="oga-play-panel__take-live">
          This is what your code would receive.{" "}
          <Link href="/get-started" className="oga-play-panel__take-live-link">
            Take it live with a free sandbox key →
          </Link>
        </p>
      )}
    </section>
  );
}

/* ==============================================================
   Copy-as-curl
   ============================================================== */

function CopyCurlButton({
  request,
}: {
  request: { method: "GET" | "POST"; path: string; body?: unknown };
}) {
  const [copied, setCopied] = useState(false);
  const curl = useMemo(() => buildCurl(request), [request]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* no clipboard permission - silently no-op */
    }
  };
  return (
    <button
      type="button"
      className="oga-play-panel__curl"
      onClick={copy}
      title="Copy this call as a curl command with your API key placeholder"
    >
      {copied ? "Copied" : "Copy as curl"}
    </button>
  );
}

function buildCurl(request: { method: "GET" | "POST"; path: string; body?: unknown }): string {
  const base = "https://www.onegoodarea.com";
  const url = `${base}${request.path}`;
  const lines = [`curl -X ${request.method} '${url}' \\`, `  -H 'Authorization: Bearer YOUR_API_KEY'`];
  if (request.method === "POST" && request.body !== undefined) {
    const body = JSON.stringify(request.body);
    lines[lines.length - 1] += ` \\`;
    lines.push(`  -H 'Content-Type: application/json' \\`);
    lines.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
  }
  return lines.join("\n");
}

/* ==============================================================
   Signup nudge (shown once calls_used >= NUDGE_AT)
   ============================================================== */

/* Contextual nudge that escalates as the user consumes more of the
   session cap. Copy varies by call count so a curious first-timer and
   a power-user see the right level of urgency. */
function NudgeStrip({ callsUsed }: { callsUsed: number }) {
  let title;
  let lead;
  if (callsUsed >= 25) {
    title = `Almost at the session cap (${callsUsed} of 30).`;
    lead = "Grab a free sandbox key before the next Run hits the wall. No credit card.";
  } else if (callsUsed >= 15) {
    title = `${callsUsed} calls in. You&apos;ve seen the shape.`;
    lead = "A free sandbox key drops the 30-call session cap and lifts NL queries beyond 3.";
  } else {
    title = `${callsUsed} calls in. ${30 - callsUsed} left this session.`;
    lead = "Beyond that you&apos;ll need a free sandbox key. Same endpoints, no session cap, no credit card.";
  }
  return (
    <div className="oga-play-nudge" role="note">
      <div className="oga-play-nudge__copy">
        <p
          className="oga-play-nudge__title"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p
          className="oga-play-nudge__lead"
          dangerouslySetInnerHTML={{ __html: lead }}
        />
      </div>
      <Link href="/get-started" className="oga-play-nudge__cta">
        Get a sandbox key →
      </Link>
    </div>
  );
}

/* ==============================================================
   Form primitives + helpers
   ============================================================== */

function PanelHead({
  label,
  endpoint,
  badge,
}: {
  label: string;
  endpoint: string;
  badge?: "AI";
}) {
  return (
    <div className="oga-play-panel__head">
      <span className="oga-play-panel__label">{label}</span>
      <div className="oga-play-panel__head-right">
        <code className="oga-play-panel__endpoint">{endpoint}</code>
        {badge && (
          <span className="oga-play-tab__badge" aria-label={badge}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <>
      <label className="oga-play-form__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="oga-play-form__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
      />
    </>
  );
}

function SelectField({
  label,
  id,
  value,
  options,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <>
      <label className="oga-play-form__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="oga-play-form__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </>
  );
}

function SubmitButton({ state, disabled }: { state: LoadState; disabled: boolean }) {
  return (
    <button
      className="oga-play-form__submit"
      type="submit"
      disabled={disabled || state.status === "loading"}
    >
      {state.status === "loading" ? (
        <span className="oga-play-form__submit-loading">
          <span className="oga-play-spinner" aria-hidden />
          <span>Running</span>
        </span>
      ) : (
        "Run"
      )}
    </button>
  );
}

function useElapsedMs(startedAt: number | undefined): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (startedAt === undefined) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt === undefined ? 0 : Math.max(0, now - startedAt);
}

function loadingHint(elapsedMs: number): string {
  if (elapsedMs < 800) return "Calling the API...";
  if (elapsedMs < 2500) return "Computing signals for that query...";
  if (elapsedMs < 6000) return "Still working. First calls on cold inputs take longer.";
  return "Almost there. Complex queries can take up to 10s.";
}

function FairUseNote() {
  return (
    <p className="oga-play-fair">
      Fair use: 30 calls per browser session, 60 per IP per day. AI Query calls capped at
      3 per session. For unlimited usage, get a free sandbox key.
    </p>
  );
}

/* Bottom CTA reworked (AR-437 step 4 polish). Two clear paths:
   builders self-select left, buyers self-select right. Removes the
   one-loud-block feeling of the previous version and stops asking
   every visitor the same thing. */
function SignupCta() {
  return (
    <section className="oga-play-signup" aria-label="What next">
      <div className="oga-play__container oga-play-signup__inner">
        <div className="oga-play-signup__col">
          <span className="oga-play-signup__eyebrow">For builders</span>
          <h2 className="oga-play-signup__title">Take this to production.</h2>
          <p className="oga-play-signup__lead">
            Free sandbox key. No credit card. Every endpoint you just tried, in your
            editor, your CI, your MCP client.
          </p>
          <ul className="oga-play-signup__bullets">
            <li>No session caps.</li>
            <li>Full NL planning, not the 3-query preview.</li>
            <li>Save and share query URLs.</li>
            <li>Live in the OneGoodArea MCP server.</li>
          </ul>
          <div className="oga-play-signup__actions">
            <Link href="/get-started" className="oga-play-signup__cta">
              Get a sandbox key →
            </Link>
            <Link href="/docs" className="oga-play-signup__secondary">
              Read the docs
            </Link>
          </div>
        </div>
        <div className="oga-play-signup__col oga-play-signup__col--buyer">
          <span className="oga-play-signup__eyebrow">For your team</span>
          <h2 className="oga-play-signup__title">See how it fits.</h2>
          <p className="oga-play-signup__lead">
            You&apos;re not the one writing the code, but the shape of the answer
            still lands in your workflow. Pick your industry, see the moves teams
            already run on OneGoodArea.
          </p>
          <div className="oga-play-signup__icps">
            <Link href="/for/lenders" className="oga-play-signup__icp">Lenders</Link>
            <Link href="/for/insurance" className="oga-play-signup__icp">Insurance</Link>
            <Link href="/for/proptech" className="oga-play-signup__icp">PropTech</Link>
            <Link href="/for/cre" className="oga-play-signup__icp">CRE</Link>
            <Link href="/for/public-sector" className="oga-play-signup__icp">Public sector</Link>
          </div>
          <div className="oga-play-signup__actions">
            <Link href="/methodology" className="oga-play-signup__secondary">
              How the engine works →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
