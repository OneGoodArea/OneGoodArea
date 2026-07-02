"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { TurnstileWidget } from "./turnstile-widget";
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
   never configured Turnstile — the client skips the widget. */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TabId = "area" | "score" | "peers" | "rank" | "insights" | "forecast" | "nl";

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

/* Nudge shows once the session has been used enough to prove real
   interest but before rate caps stop the user. Tuned to fire at 5 —
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
     mint immediately with an empty body — apps/api stub-passes. */
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
    <div className="oga-root">
      <Nav />
      <PlaygroundHero session={session} tokenReady={tokenReady} tokenError={tokenError} />

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

      <section className="oga-play-workbench oga-section">
        <div className="oga-play__container">
          <TabBar active={activeTab} onSelect={setActiveTab} />

          {session && session.calls_used >= NUDGE_AT && (
            <NudgeStrip callsUsed={session.calls_used} />
          )}

          <TabRouter activeTab={activeTab} runProxy={runProxy} tokenReady={tokenReady} />

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
  /* The exact request we sent — powers the copy-as-curl button. */
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
   Area — GET /v1/area?postcode=...
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
   Score — POST /v1/score { area, preset }
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
   Peers — POST /v1/peers { target: { postcode }, k }
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
   Rank — GET /v1/areas?signal=&limit=&percentile_gte=
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
   Insights — POST /v1/insights { signal_key, country, k }
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
   Forecast — POST /v1/forecast { target, signal_key, horizon_months }
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
   NL Query — POST /v1/query { question }
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
        <pre className="oga-play-panel__json">{JSON.stringify(state.result.response, null, 2)}</pre>
      )}
      {state.status === "ok" && state.result?.truncated && (
        <p className="oga-play-panel__truncated">
          Response truncated to fit the playground display. Sign up to see full payloads.
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

function NudgeStrip({ callsUsed }: { callsUsed: number }) {
  return (
    <div className="oga-play-nudge" role="note">
      <p className="oga-play-nudge__title">
        You&apos;ve made {callsUsed} calls. Ready for unlimited?
      </p>
      <p className="oga-play-nudge__lead">
        Free sandbox key. No credit card. Same endpoints, no session cap.
      </p>
      <Link href="/get-started" className="oga-play-nudge__cta">
        Get a sandbox key
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
