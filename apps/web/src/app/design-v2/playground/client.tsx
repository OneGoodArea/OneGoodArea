"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import "./playground.css";

/* /playground client. PR3 wires the first endpoint (GET /v1/area) end
   to end: mint a signed cookie on mount, submit the query through the
   BFF proxy, render the JSON response + latency + counters. Other tabs
   (score, peers, rank, insights, forecast, NL) still show the PR4
   placeholder. */

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

export default function PlaygroundClient() {
  const [activeTab, setActiveTab] = useState<TabId>("area");
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const active = TABS.find((t) => t.id === activeTab)!;
  const tokenRequestedRef = useRef(false);

  /* Mint the demo cookie once on mount. This burns no rate-limit quota
     and gives the first Run a snappy path (no double round-trip). */
  useEffect(() => {
    if (tokenRequestedRef.current) return;
    tokenRequestedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/playground/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
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
  }, []);

  const runProxy = useCallback(
    async (method: "GET" | "POST", path: string, body?: unknown): Promise<ProxyResponse> => {
      const res = await fetch("/api/playground/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, path, body }),
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as ProxyResponse | { error?: string; code?: string };
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
    <div className="oga-root">
      <Nav />

      <PlaygroundHero session={session} tokenReady={tokenReady} tokenError={tokenError} />

      <section className="oga-play-workbench oga-section">
        <div className="oga-play__container">
          <TabBar active={activeTab} onSelect={setActiveTab} />

          {activeTab === "area" ? (
            <AreaWorkbench runProxy={runProxy} tokenReady={tokenReady} />
          ) : (
            <div className="oga-play-workbench__grid">
              <QueryPanel tab={active} />
              <ResponsePanel />
            </div>
          )}

          <FairUseNote />
        </div>
      </section>

      <SignupCta />
      <Footer />
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

/* Hero. Session chip shows counters once the first call lands. Until
   then we render the token-ready state so users see the plumbing is
   alive. */
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

/* Wired workbench for GET /v1/area. Postcode input + Run. Response +
   latency + upstream status rendered in the right pane. Errors surface
   inline rather than blowing up. */
function AreaWorkbench({
  runProxy,
  tokenReady,
}: {
  runProxy: (method: "GET" | "POST", path: string, body?: unknown) => Promise<ProxyResponse>;
  tokenReady: boolean;
}) {
  const [postcode, setPostcode] = useState("SW1A 1AA");
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ok" | "error";
    startedAt?: number;
    result?: ProxyResponse;
    error?: { code: string; message: string };
  }>({ status: "idle" });

  const submit = useCallback(async () => {
    const clean = postcode.trim();
    if (!clean) {
      setState({ status: "error", error: { code: "empty", message: "Enter a UK postcode." } });
      return;
    }
    setState({ status: "loading", startedAt: performance.now() });
    try {
      const path = `/v1/area?postcode=${encodeURIComponent(clean)}`;
      const result = await runProxy("GET", path);
      setState({ status: "ok", result });
    } catch (err) {
      if (err instanceof PlaygroundError) {
        setState({ status: "error", error: { code: err.code, message: err.message } });
      } else {
        setState({ status: "error", error: { code: "network", message: "Network error. Try again." } });
      }
    }
  }, [postcode, runProxy]);

  const disabled = !tokenReady || state.status === "loading";

  return (
    <div className="oga-play-workbench__grid">
      <section className="oga-play-panel oga-play-panel--query" aria-label="Area query">
        <div className="oga-play-panel__head">
          <span className="oga-play-panel__label">Query</span>
          <code className="oga-play-panel__endpoint">GET /v1/area</code>
        </div>
        <p className="oga-play-panel__desc">
          Full signal profile for one UK postcode: crime, deprivation, schools, transport,
          property, amenities, environment.
        </p>

        <form
          className="oga-play-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="oga-play-form__label" htmlFor="area-postcode">
            Postcode
          </label>
          <input
            id="area-postcode"
            className="oga-play-form__input"
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="SW1A 1AA"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="oga-play-form__submit" type="submit" disabled={disabled}>
            {state.status === "loading" ? (
              <span className="oga-play-form__submit-loading">
                <span className="oga-play-spinner" aria-hidden />
                <span>Running</span>
              </span>
            ) : (
              "Run"
            )}
          </button>
        </form>
      </section>

      <ResponsePanelWired state={state} />
    </div>
  );
}

/* Live elapsed-ms ticker. Updates 10x/sec so the timer feels alive
   without hammering the render loop. Only mounted while loading. */
function useElapsedMs(startedAt: number | undefined): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (startedAt === undefined) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt === undefined ? 0 : Math.max(0, now - startedAt);
}

/* Contextual status line. The API's typical warm latency is ~200-800ms
   for /v1/area, ~1-3s for a cold postcode. These thresholds map to what
   the user is actually waiting on — not to fake progress bars. */
function loadingHint(elapsedMs: number): string {
  if (elapsedMs < 800) return "Calling the API...";
  if (elapsedMs < 2500) return "Computing signals for that postcode...";
  if (elapsedMs < 6000) return "Still working. First calls on cold postcodes take longer.";
  return "Almost there. Complex postcodes can take up to 10s.";
}

function ResponsePanelWired({
  state,
}: {
  state: {
    status: "idle" | "loading" | "ok" | "error";
    startedAt?: number;
    result?: ProxyResponse;
    error?: { code: string; message: string };
  };
}) {
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
        <pre className="oga-play-panel__json">
          {JSON.stringify(state.result.response, null, 2)}
        </pre>
      )}
      {state.status === "ok" && state.result?.truncated && (
        <p className="oga-play-panel__truncated">
          Response truncated to fit the playground display. Sign up to see full payloads.
        </p>
      )}
    </section>
  );
}

/* Placeholder query panel for the tabs PR4 will fan out. */
function QueryPanel({ tab }: { tab: TabDef }) {
  return (
    <section className="oga-play-panel oga-play-panel--query" aria-label="Query panel">
      <div className="oga-play-panel__head">
        <span className="oga-play-panel__label">Query</span>
        <code className="oga-play-panel__endpoint">{tab.endpoint}</code>
      </div>
      <p className="oga-play-panel__desc">{tab.description}</p>
      <div className="oga-play-panel__placeholder">
        <span className="oga-play-panel__placeholder-tag">PR4</span>
        <p>
          Form for this endpoint lands in the next PR. The Area tab is live now.
        </p>
      </div>
    </section>
  );
}

function ResponsePanel() {
  return (
    <section className="oga-play-panel oga-play-panel--response" aria-label="Response panel">
      <div className="oga-play-panel__head">
        <span className="oga-play-panel__label">Response</span>
        <span className="oga-play-panel__meta">Idle</span>
      </div>
      <div className="oga-play-panel__placeholder oga-play-panel__placeholder--tall">
        <p>Pick the Area tab and run a real query. Other endpoints wire up in the next PR.</p>
      </div>
    </section>
  );
}

function FairUseNote() {
  return (
    <p className="oga-play-fair">
      Fair use: 30 calls per browser session, 60 per IP per day. AI Query calls capped at
      3 per session. For unlimited usage, get a free sandbox key.
    </p>
  );
}

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
