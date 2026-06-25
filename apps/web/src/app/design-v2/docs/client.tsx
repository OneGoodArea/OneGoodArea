"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../_shared/product-icons";
import {
  METHODOLOGY_VERSION,
  getCurrentMethodology,
} from "@/lib/methodology-versions";
import "./docs.css";

/* /docs — Brand v3 (Plotted) — AR-204.

   Index page for the documentation surface. Replaces the previous
   single-endpoint /v1/report guide (1,260 LOC Fraunces, inline-
   styled, `aiq_` prefix, "7 sources" block).

   Per the delta doc + Pedro's locked D3 (option c): this page is
   the four-product TOC; per-surface sub-pages (/docs/signals,
   /docs/scores, /docs/monitor, /docs/intelligence, /docs/levers,
   /docs/webhooks, /docs/auth) ship later as follow-up PRs and are
   linked here as disabled "Coming soon" tiles per the wiring rule.

   Every fact below was verified against ADRs 0001-0035 + the
   apps/api Fastify routes (see workflow recon 2026-05-31).
   No source names enumerated here — that detail lives on
   /methodology only (AR-204 §5, NO EXCEPTIONS). */

const current = getCurrentMethodology();

export default function DocsClient() {
  return (
    <div className="oga-root oga-docs">
      <Nav />
      <Hero />
      <SectionProducts />
      <SectionLevers />
      <SectionReference />
      <SectionQuickstart />
      <SectionExamples />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero — engine state + dual-mode framing
   ============================================================ */

function Hero() {
  return (
    <section className="oga-section-hero oga-docs-hero">
      <div className="oga-docs__container">
        <div className="oga-docs-hero__grid">
          <div>
            <div className="oga-docs-hero__eyebrow">
              <span aria-hidden className="oga-docs-hero__dot" />
              <span>Docs · Engine v{METHODOLOGY_VERSION}</span>
            </div>
            <h1 className="oga-docs-hero__h1">
              Build on UK area intelligence.
            </h1>
            <p className="oga-docs-hero__lead">
              Four composable products on one signal-first data layer. Reach the API
              directly from your stack, or use the dashboard to configure how the
              API behaves per organisation. This index points to every reference
              we publish today; per-surface guides are landing one by one.
            </p>
            <div className="oga-docs-hero__ctas">
              <Link href="/sign-up" className="oga-btn oga-btn-primary">
                Get an API key
                <span aria-hidden>→</span>
              </Link>
              <Link href="/methodology" className="oga-btn oga-btn-secondary">
                Read the methodology
              </Link>
            </div>
          </div>

          <aside className="oga-docs-hero__sidecard" aria-label="Current engine state">
            <div className="oga-docs-hero__sidecard-eyebrow">
              <span aria-hidden className="oga-docs-hero__dot" />
              <span>Engine state</span>
            </div>
            <p className="oga-docs-hero__sidecard-version">v{METHODOLOGY_VERSION}</p>
            <p className="oga-docs-hero__sidecard-released">
              Released {current.released_at}
            </p>
            <div className="oga-docs-hero__sidecard-rows">
              <div className="oga-docs-hero__sidecard-row">
                <span className="oga-docs-hero__sidecard-row-k">Path prefix</span>
                <span className="oga-docs-hero__sidecard-row-v">/v1/...</span>
              </div>
              <div className="oga-docs-hero__sidecard-row">
                <span className="oga-docs-hero__sidecard-row-k">Auth</span>
                <span className="oga-docs-hero__sidecard-row-v">oga_ bearer</span>
              </div>
              <div className="oga-docs-hero__sidecard-row">
                <span className="oga-docs-hero__sidecard-row-k">Content</span>
                <span className="oga-docs-hero__sidecard-row-v">application/json</span>
              </div>
              <div className="oga-docs-hero__sidecard-row">
                <span className="oga-docs-hero__sidecard-row-k">Version header</span>
                <span className="oga-docs-hero__sidecard-row-v">X-Engine-Version</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 01 — The 4 products (DARK)
   ============================================================ */

type Product = {
  num: string;
  name: "Signals" | "Scores" | "Monitor" | "Intelligence";
  Icon: typeof SignalsIcon;
  body: string;
  caps: string[];
  endpoint: { verb: string; path: string };
};

const PRODUCTS: Product[] = [
  {
    num: "01",
    name: "Signals",
    Icon: SignalsIcon,
    body:
      "The deterministic, addressable UK area-data layer. Every signal is a typed primitive with value, normalised value, national-within-country percentile, source period, and per-signal confidence. LSOA grain, monthly cadence on the dynamic series.",
    caps: [
      "Typed Signal primitive (Zod-validated in packages/contracts)",
      "Honest provenance via meta.fetch_mode (live, store, hybrid)",
      "Append-only monthly time-series, immutable per observed_period",
      "Derived signals are first-class store rows (YoY, momentum, slope, peer-relative z)",
    ],
    endpoint: { verb: "GET", path: "/v1/area" },
  },
  {
    num: "02",
    name: "Scores",
    Icon: ScoresIcon,
    body:
      "Deterministic composite scoring. Pick one of four presets (moving, business, investing, research), each with its own five dimensions. Override the weights per request, or save a preset against your org. No AI in the scoring path; the engine version is stamped on every response.",
    caps: [
      "Four presets, each with a different five-dimension set",
      "Custom per-request weights or saved preset_id (per org)",
      "Per-dimension confidence plus aggregate confidence",
      "engine_version on the body and X-Engine-Version response header",
    ],
    endpoint: { verb: "POST", path: "/v1/score" },
  },
  {
    num: "03",
    name: "Monitor",
    Icon: MonitorIcon,
    body:
      "Portfolios plus change detection. Save a book of areas (postcodes or LSOAs), bulk-enrich through the scoring engine, and detect material moves across the time-series. Signed webhook alerts (HMAC-SHA256) when something material shifts.",
    caps: [
      "Portfolios as named collections of areas (CRUD, dedup)",
      "On-demand period-vs-period change detection",
      "Sample-size gated (default min 8 transactions on price moves)",
      "Webhook event: signal.changed (signed delivery, HMAC verifiable)",
    ],
    endpoint: { verb: "POST", path: "/v1/portfolios" },
  },
  {
    num: "04",
    name: "Intelligence",
    Icon: IntelligenceIcon,
    body:
      "A typed query plus insight plane over the moat. Six plan ops (rank_areas, get_area, score_area, find_peers, find_insights, find_forecast) reachable as a Zod-strict programmatic plan, or as natural language that the planner translates into the same plan.",
    caps: [
      "POST /v1/query with {plan} (programmatic) or {question} (NL)",
      "k-NN peers with materialised ~840k-row peer graph",
      "Anomaly screening via pre-materialised peer-relative z-scores",
      "Linear-regression forecast — not a learned model, not ARIMA, not Prophet",
    ],
    endpoint: { verb: "POST", path: "/v1/query" },
  },
];

function SectionProducts() {
  return (
    <section
      className="oga-section-dark"
      data-oga-surface="dark"
      aria-labelledby="docs-products-title"
    >
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">01</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>The 4 products</span>
          </div>
          <h2 id="docs-products-title" className="oga-docs__h2">
            One signal-first data layer. Four composable products.
          </h2>
          <p className="oga-docs__lead">
            Each product sits on shared infrastructure and can be consumed in
            isolation or composed. Per-surface guides land as separate pages over
            the coming weeks.
          </p>
        </div>

        <div className="oga-docs-products__grid">
          {PRODUCTS.map((p) => {
            const Icon = p.Icon;
            return (
              <article key={p.name} className="oga-docs-product">
                <header className="oga-docs-product__head">
                  <div className="oga-docs-product__icon">
                    <Icon width={48} height={48} />
                  </div>
                  <div className="oga-docs-product__title-block">
                    <span className="oga-docs-product__num">§ {p.num}</span>
                    <h3 className="oga-docs-product__title">{p.name}</h3>
                  </div>
                </header>
                <p className="oga-docs-product__body">{p.body}</p>
                <ul className="oga-docs-product__caps">
                  {p.caps.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <div className="oga-docs-product__foot">
                  <span className="oga-docs-product__endpoint" aria-label={`Primary endpoint: ${p.endpoint.verb} ${p.endpoint.path}`}>
                    <span className="oga-docs-product__endpoint-verb">
                      {p.endpoint.verb}
                    </span>
                    {p.endpoint.path}
                  </span>
                  <button
                    type="button"
                    className="oga-docs-product__cta-disabled"
                    disabled
                    aria-disabled
                    aria-label={`${p.name} docs coming soon`}
                  >
                    Docs
                    <span className="oga-docs-product__cta-soon">Soon</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 02 — Levers control plane (cream)
   ============================================================ */

type Lever = {
  num: string;
  title: string;
  body: string;
  rbac: "Owner" | "Admin+" | "Any member";
};

const LEVERS: Lever[] = [
  {
    num: "01",
    title: "Orgs and members",
    body:
      "Every account gets a personal org on signup. Add teammates, list members, remove them. Three-tier RBAC: member, admin, owner.",
    rbac: "Admin+",
  },
  {
    num: "02",
    title: "Custom signal bundles",
    body:
      "Named whitelists of signal keys. Pass ?bundle=<id> on /v1/area, /v1/areas, or /v1/query and only those signals come back. LLM-planned queries are governed by the same gate.",
    rbac: "Admin+",
  },
  {
    num: "03",
    title: "Custom scoring presets",
    body:
      "Save a {base_preset, weights} recipe under your org and call /v1/score with preset_id. Mutually exclusive with preset and weights on the same request.",
    rbac: "Admin+",
  },
  {
    num: "04",
    title: "Methodology pinning",
    body:
      "Lock the engine version your org consumes. Sets the X-Engine-Version response header on /v1/area, /v1/areas, /v1/score, /v1/query, /v1/peers, and portfolio enrich and changes.",
    rbac: "Owner",
  },
  {
    num: "05",
    title: "Peer cohorts",
    body:
      "Named lists of LSOA codes (up to 10,000 per cohort) that constrain the candidate set on /v1/peers. Areas like THIS one, but only inside your universe.",
    rbac: "Admin+",
  },
  {
    num: "06",
    title: "Full RBAC",
    body:
      "Three roles. Admin drives day-to-day Levers config. Owner-only retained for methodology pinning, granting owner, and removing owner-role members.",
    rbac: "Any member",
  },
  {
    num: "07",
    title: "White-label",
    body:
      "display_name and brand_url on the org, surfaced on /v1/me so downstream consumers can render your brand instead of OneGoodArea’s.",
    rbac: "Admin+",
  },
  {
    num: "08",
    title: "Per-key IP allowlist",
    body:
      "allowed_ip_cidrs on each API key. Mismatch returns 403 ip_not_allowed, distinct from a 401 invalid-key. IPv4 CIDR matching with hand-rolled integer-mask helper.",
    rbac: "Owner",
  },
];

function SectionLevers() {
  return (
    <section
      className="oga-section-hero"
      aria-labelledby="docs-levers-title"
    >
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">02</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Levers</span>
          </div>
          <h2 id="docs-levers-title" className="oga-docs__h2">
            Multi-tenant control plane. Opt-in, additive.
          </h2>
          <p className="oga-docs__lead">
            Eight capabilities for configuring OneGoodArea per organisation. With
            no bundle, preset_id, pin, cohort or allowlist set, every product
            endpoint behaves byte-identically to the pre-Levers baseline.
          </p>
        </div>

        <div className="oga-docs-levers__grid">
          {LEVERS.map((l) => (
            <article key={l.title} className="oga-docs-lever">
              <span className="oga-docs-lever__num">§ {l.num}</span>
              <h3 className="oga-docs-lever__title">{l.title}</h3>
              <p className="oga-docs-lever__body">{l.body}</p>
              <div className="oga-docs-lever__foot">
                <span className="oga-docs-lever__rbac">{l.rbac}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="oga-docs-levers__cta-row">
          <button
            type="button"
            className="oga-btn oga-btn-secondary"
            disabled
            aria-disabled
          >
            Levers guide
            <span className="oga-docs-product__cta-soon">Soon</span>
          </button>
          <Link href="/methodology#per-org-methodology" className="oga-btn oga-btn-ghost">
            Methodology pinning rationale
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 03 — Reference + spec (white)
   ============================================================ */

type RefTile = {
  num: string;
  title: string;
  body: string;
  status: "live" | "soon" | "regen";
  href: string | null;
  cta: string;
};

const REFERENCES: RefTile[] = [
  {
    num: "01",
    title: "Interactive API reference",
    body:
      "The structured endpoint catalogue across all six surfaces. Honest placeholder today; the OpenAPI spec is being regenerated from the Fastify route schemas.",
    status: "regen",
    href: "/docs/api-reference",
    cta: "Open reference",
  },
  {
    num: "02",
    title: "MCP server",
    body:
      "Add OneGoodArea to Claude Desktop, Cursor, or any MCP-compatible client. Four tools, stdio transport, npm-distributed.",
    status: "live",
    href: "/docs/mcp",
    cta: "Install guide",
  },
  {
    num: "03",
    title: "Methodology",
    body:
      "How we compute signals, scores, peers, insights, and forecasts. The 7-source disclosure, normalisation rules, time-series cadence, every audit artefact.",
    status: "live",
    href: "/methodology",
    cta: "Read methodology",
  },
  {
    num: "04",
    title: "Changelog",
    body:
      "Buyer-facing release log. What capability landed when, tagged feature, improvement or fix.",
    status: "live",
    href: "/changelog",
    cta: "View changelog",
  },
  {
    num: "05",
    title: "OpenAPI snapshot",
    body:
      "The current /openapi.json file. Structurally being rebuilt against the live Fastify schemas; use the API reference page for the regenerated version when it lands.",
    status: "regen",
    href: "/openapi.json",
    cta: "Download .json",
  },
  {
    num: "06",
    title: "Webhooks reference",
    body:
      "Stripe-style signed deliveries, HMAC-SHA256, the event catalogue, retry semantics, signing-secret rotation. Page coming soon.",
    status: "soon",
    href: null,
    cta: "Webhooks docs",
  },
];

function statusLabel(s: RefTile["status"]) {
  if (s === "live") return "Live";
  if (s === "regen") return "Regenerating";
  return "Soon";
}

function statusClass(s: RefTile["status"]) {
  if (s === "live") return "oga-docs-ref-tile__status--live";
  if (s === "regen") return "oga-docs-ref-tile__status--regen";
  return "oga-docs-ref-tile__status--soon";
}

function SectionReference() {
  return (
    <section
      className="oga-section-quiet"
      aria-labelledby="docs-ref-title"
    >
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">03</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Reference</span>
          </div>
          <h2 id="docs-ref-title" className="oga-docs__h2">
            Everything we publish today.
          </h2>
          <p className="oga-docs__lead">
            What is shipped, what is regenerating, what is on the way. We mark
            each tile honestly so you can integrate against the surfaces that
            exist and plan around the ones that will.
          </p>
        </div>

        <div className="oga-docs-ref__grid">
          {REFERENCES.map((r) => {
            const inner = (
              <>
                <header className="oga-docs-ref-tile__head">
                  <span className="oga-docs-ref-tile__num">§ {r.num}</span>
                  <span
                    className={`oga-docs-ref-tile__status ${statusClass(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </header>
                <h3 className="oga-docs-ref-tile__title">{r.title}</h3>
                <p className="oga-docs-ref-tile__body">{r.body}</p>
                <span className="oga-docs-ref-tile__foot">
                  {r.cta}
                  <span aria-hidden>→</span>
                </span>
              </>
            );

            if (r.status === "soon" || !r.href) {
              return (
                <div
                  key={r.title}
                  className="oga-docs-ref-tile oga-docs-ref-tile--disabled"
                  aria-disabled
                >
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={r.title}
                href={r.href}
                className="oga-docs-ref-tile oga-docs-ref-tile--link"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 04 — Quickstart (DARK)
   ============================================================ */

const QS_STEPS: { num: string; title: string; body: string }[] = [
  {
    num: "01",
    title: "Get a key",
    body:
      "Sign up. A personal org and an API key are created for you. The key is prefixed oga_ and shown once at creation time.",
  },
  {
    num: "02",
    title: "Send a request",
    body:
      "Bearer auth, JSON over HTTPS, all routes under /v1/. The simplest read is GET /v1/area with a postcode query parameter.",
  },
  {
    num: "03",
    title: "Read the response",
    body:
      "Every payload carries an engine_version, source provenance, and a meta.fetch_mode (live, store, hybrid) so you always know how a signal was served.",
  },
];

const QS_CURL = `curl https://api.onegoodarea.com/v1/area?postcode=SW1A%201AA \\
  -H "Authorization: Bearer oga_your_api_key"`;

function SectionQuickstart() {
  return (
    <section
      className="oga-section-dark"
      data-oga-surface="dark"
      aria-labelledby="docs-qs-title"
    >
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">04</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Quickstart</span>
          </div>
          <h2 id="docs-qs-title" className="oga-docs__h2">
            Three steps from zero to your first signal read.
          </h2>
          <p className="oga-docs__lead">
            The fastest way to feel the API: one read against /v1/area to see a
            full area profile with normalised values and provenance.
          </p>
        </div>

        <div className="oga-docs-qs__steps">
          {QS_STEPS.map((s) => (
            <div key={s.num} className="oga-docs-qs-step">
              <span className="oga-docs-qs-step__num">Step {s.num}</span>
              <h3 className="oga-docs-qs-step__title">{s.title}</h3>
              <p className="oga-docs-qs-step__body">{s.body}</p>
            </div>
          ))}
        </div>

        <CodePanel lang="bash" path="GET /v1/area" snippet={QS_CURL} />
      </div>
    </section>
  );
}

/* Shared code panel — canonical .oga-code-panel structure with corner
   ticks, header strip, and one-line-per-row body for parity with the
   methodology page. */

function CodePanel({ lang, path, snippet }: { lang: string; path: string; snippet: string }) {
  const lines = snippet.split("\n");
  return (
    <div className="oga-code-panel" aria-label={`${lang} example`}>
      <span className="oga-code-panel__tick oga-code-panel__tick--tl" aria-hidden />
      <span className="oga-code-panel__tick oga-code-panel__tick--tr" aria-hidden />
      <span className="oga-code-panel__tick oga-code-panel__tick--bl" aria-hidden />
      <span className="oga-code-panel__tick oga-code-panel__tick--br" aria-hidden />
      <div className="oga-code-panel__header">
        <span className="oga-code-panel__path">{path}</span>
        <span className="oga-code-panel__meta">{lang}</span>
      </div>
      <div className="oga-code-panel__body">
        {lines.map((line, i) => (
          <div key={i} className="oga-code-panel__line">
            <span className="oga-code-panel__num">{String(i + 1).padStart(2, "0")}</span>
            <span className="oga-code-panel__text">{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   § 05 — Code examples (cream)
   ============================================================ */

type LangKey = "curl" | "node" | "python" | "go";

const EXAMPLES: Record<LangKey, { label: string; lang: string; snippet: string; note: string }> = {
  curl: {
    label: "cURL",
    lang: "bash",
    snippet: `curl https://api.onegoodarea.com/v1/area?postcode=SW1A%201AA \\
  -H "Authorization: Bearer oga_your_api_key" \\
  -H "Accept: application/json"`,
    note: "Plain HTTP rejected. HTTPS only. JSON over the wire.",
  },
  node: {
    label: "Node",
    lang: "typescript",
    snippet: `const response = await fetch(
  "https://api.onegoodarea.com/v1/area?postcode=SW1A%201AA",
  {
    headers: {
      "Authorization": "Bearer oga_your_api_key",
      "Accept": "application/json",
    },
  }
);

const profile = await response.json();
const engineVersion = response.headers.get("X-Engine-Version");
console.log(profile.meta.fetch_mode); // 'live' | 'store' | 'hybrid'`,
    note: "Any runtime with fetch. The X-Engine-Version header reflects your org pin if set.",
  },
  python: {
    label: "Python",
    lang: "python",
    snippet: `import httpx

response = httpx.get(
    "https://api.onegoodarea.com/v1/area",
    params={"postcode": "SW1A 1AA"},
    headers={"Authorization": "Bearer oga_your_api_key"},
)
profile = response.json()
print(profile["meta"]["fetch_mode"])`,
    note: "httpx or requests. Same shapes regardless of client.",
  },
  go: {
    label: "Go",
    lang: "go",
    snippet: `req, _ := http.NewRequest(
    "GET",
    "https://api.onegoodarea.com/v1/area?postcode=SW1A%201AA",
    nil,
)
req.Header.Set("Authorization", "Bearer oga_your_api_key")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var profile map[string]any
json.NewDecoder(resp.Body).Decode(&profile)`,
    note: "Standard library is enough. Decode into your own typed struct for ergonomics.",
  },
};

const LANG_ORDER: LangKey[] = ["curl", "node", "python", "go"];

function SectionExamples() {
  const [lang, setLang] = useState<LangKey>("curl");
  const active = useMemo(() => EXAMPLES[lang], [lang]);

  return (
    <section
      className="oga-section-hero"
      aria-labelledby="docs-ex-title"
    >
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">05</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Code examples</span>
          </div>
          <h2 id="docs-ex-title" className="oga-docs__h2">
            One endpoint, four languages.
          </h2>
          <p className="oga-docs__lead">
            Every example reads the same area profile. Swap the postcode, swap
            the surface, swap the language — the shape is the same. No SDK is
            required, no client library is shipped today.
          </p>
        </div>

        <div className="oga-docs-ex__tabs" role="tablist" aria-label="Language selector">
          {LANG_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={lang === k}
              onClick={() => setLang(k)}
              className={`oga-docs-ex__tab ${lang === k ? "oga-docs-ex__tab--active" : ""}`}
            >
              {EXAMPLES[k].label}
            </button>
          ))}
        </div>

        <div className="oga-docs-ex__lang-meta">
          <span className="oga-docs-ex__lang-name">{active.label}</span>
          <span className="oga-docs-ex__lang-note">{active.note}</span>
        </div>

        <CodePanel lang={active.lang} path="GET /v1/area" snippet={active.snippet} />
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

function FinalCta() {
  return (
    <section
      className="oga-section-dark oga-docs-cta"
      data-oga-surface="dark"
      aria-labelledby="docs-cta-title"
    >
      <div className="oga-docs__container--narrow">
        <h2 id="docs-cta-title" className="oga-docs-cta__h2">
          Build on the data layer underneath UK property workflows.
        </h2>
        <p className="oga-docs-cta__lead">
          Generate a key, integrate against the API, and configure how it behaves
          per organisation through the dashboard. Per-surface guides are coming;
          everything live is linked above.
        </p>
        <div className="oga-docs-cta__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
