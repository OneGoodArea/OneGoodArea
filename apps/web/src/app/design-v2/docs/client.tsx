"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { DEMO_URL } from "../_shared/book-demo";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../_shared/product-icons";
import {
  CurlLogo,
  JavaScriptLogo,
  TypeScriptLogo,
  PythonLogo,
  GoLogo,
  PhpLogo,
  RubyLogo,
  JavaLogo,
  CSharpLogo,
} from "../_shared/lang-icons";
import {
  ApiReferenceIcon,
  McpServerIcon,
  MethodologyIcon,
  ChangelogIcon,
} from "../_shared/docs-icons";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "./docs.css";

/* /docs - developer front door. The centrepiece is a live console that cycles
   through a real call and response for each of the four products, so the first
   thing you see is the API actually working. Everything below is the index:
   quickstart, the four products, and the rest of the reference. Copy stays in
   plain full sentences (no clever fragments); endpoint and engine detail live
   in the mockups only. Every fact traces to the live Fastify routes. */

export default function DocsClient() {
  return (
    <div className="oga-root oga-docs">
      <Nav />
      <Hero />
      <Quickstart />
      <Products />
      <Reference />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------- Hero: headline + the live console + a small index ---------- */
function Hero() {
  return (
    <section className="oga-section-hero oga-docs-hero">
      <div className="oga-docs__container oga-docs-hero__inner">
        <span className="oga-docs-hero__eyebrow">
          <span>Documentation</span>
          <span className="oga-docs-hero__eyebrow-sep" aria-hidden />
          <span>Engine v{METHODOLOGY_VERSION}</span>
        </span>
        <h1 className="oga-docs-hero__h1">Everything you need to build on UK area data.</h1>
        <p className="oga-docs-hero__lead">
          Get an API key, make your first request, and read exactly what comes
          back. From here you can reach every endpoint, all four products and the
          MCP server.
        </p>
        <div className="oga-docs-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs/api-reference" className="oga-btn oga-btn-secondary">
            API reference
          </Link>
        </div>

        <Console />

        <nav className="oga-docs-hero__index" aria-label="On this page">
          <a href="#quickstart"><span className="oga-docs-hero__index-num">01</span> Quickstart</a>
          <a href="#products"><span className="oga-docs-hero__index-num">02</span> Products</a>
          <a href="#reference"><span className="oga-docs-hero__index-num">03</span> Reference</a>
        </nav>
      </div>
    </section>
  );
}

/* ---------- The live console (cycles through the four products) ---------- */
type ConRow = { k: string; v: string; tag?: string; tone?: "flag" | "muted" };
type ConFrame = {
  product: string;
  Icon: typeof SignalsIcon;
  method: "GET" | "POST";
  target: string;
  body?: string;
  score?: { num: string; sub: string };
  rows: ConRow[];
  note: string;
};

const CON_FRAMES: ConFrame[] = [
  {
    product: "Signals",
    Icon: SignalsIcon,
    method: "GET",
    target: "/v1/area?postcode=M1 1AE",
    rows: [
      { k: "crime", v: "92nd percentile", tag: "police.uk" },
      { k: "deprivation", v: "decile 1 of 10", tag: "IMD 2025" },
      { k: "schools", v: "4 rated good", tag: "Ofsted" },
    ],
    note: "Every value links back to the source it came from.",
  },
  {
    product: "Scores",
    Icon: ScoresIcon,
    method: "POST",
    target: "/v1/score",
    body: `{ "postcode": "EC1A 1BB", "profile": "moving" }`,
    score: { num: "86", sub: "out of 100 · moving profile" },
    rows: [
      { k: "safety", v: "91" },
      { k: "transport", v: "88" },
      { k: "schools", v: "84" },
    ],
    note: "The score is deterministic, so the same inputs always return the same number.",
  },
  {
    product: "Monitor",
    Icon: MonitorIcon,
    method: "POST",
    target: "/v1/portfolios/prt_2f9/changes",
    rows: [
      { k: "M1 1AE · crime", v: "78 → 84 pct", tag: "material", tone: "flag" },
      { k: "LS1 4AP", v: "held back", tag: "too few sales", tone: "muted" },
    ],
    note: "Only meaningful moves reach you, sent through a signed webhook.",
  },
  {
    product: "Intelligence",
    Icon: IntelligenceIcon,
    method: "POST",
    target: "/v1/query",
    body: `{ "q": "Fastest-growing areas near Leeds?" }`,
    rows: [
      { k: "1 · Manchester", v: "+18.4%" },
      { k: "2 · Birmingham", v: "+14.6%" },
      { k: "3 · Leeds", v: "+12.9%" },
    ],
    note: "You get the answer and the plan behind it, so you can see how it was worked out.",
  },
];

function Console() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;
    const id = setTimeout(
      () => setActive((a) => (a + 1) % CON_FRAMES.length),
      5200,
    );
    return () => clearTimeout(id);
  }, [active]);

  const f = CON_FRAMES[active];
  const ActiveIcon = f.Icon;

  return (
    <div className="oga-docs-con">
      <div className="oga-docs-con__win">
        <div className="oga-docs-con__bar">
          <span className="oga-docs-con__dots" aria-hidden>
            <i /><i /><i />
          </span>
          <span className="oga-docs-con__who">
            <ActiveIcon width={14} height={14} aria-hidden />
            {f.product}
          </span>
          <span className="oga-docs-con__ver">engine v{METHODOLOGY_VERSION}</span>
        </div>

        <div className="oga-docs-con__body" key={active}>
          <div className="oga-docs-con__frame">
            <div className="oga-docs-con__cmd">
              <span className="oga-docs-con__prompt" aria-hidden>›</span>
              <span className={`oga-docs-con__method oga-docs-con__method--${f.method.toLowerCase()}`}>{f.method}</span>
              <span className="oga-docs-con__target">{f.target}</span>
              <span className="oga-docs-con__caret" aria-hidden />
            </div>
            {f.body && <div className="oga-docs-con__cmd-body">{f.body}</div>}

            <div className="oga-docs-con__sep" aria-hidden />

            {f.score && (
              <div className="oga-docs-con__score">
                <span className="oga-docs-con__score-num">{f.score.num}</span>
                <span className="oga-docs-con__score-sub">{f.score.sub}</span>
              </div>
            )}

            <ul className="oga-docs-con__rows">
              {f.rows.map((r) => (
                <li key={r.k} className="oga-docs-con__row">
                  <span className="oga-docs-con__k">{r.k}</span>
                  <span className="oga-docs-con__v">{r.v}</span>
                  {r.tag && (
                    <span className={`oga-docs-con__tag ${r.tone ? `oga-docs-con__tag--${r.tone}` : ""}`}>{r.tag}</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="oga-docs-con__note">
              <span className="oga-docs-con__check" aria-hidden>✓</span>
              {f.note}
            </div>
          </div>
        </div>

        <span className="oga-docs-con__timer" key={`timer-${active}`} aria-hidden />
      </div>

      <div className="oga-docs-con__tabs" role="tablist" aria-label="Product">
        {CON_FRAMES.map((frame, i) => {
          const Icon = frame.Icon;
          return (
            <button
              key={frame.product}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`oga-docs-con__tab ${i === active ? "oga-docs-con__tab--on" : ""}`}
            >
              <Icon width={14} height={14} aria-hidden />
              {frame.product}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 01 Quickstart (dark): steps + code ---------- */
const QS_STEPS: { num: string; title: string; body: string }[] = [
  {
    num: "01",
    title: "Get a key",
    body: "Sign up and we create an API key for you straight away. It starts with oga_ and is shown once, so keep it somewhere safe.",
  },
  {
    num: "02",
    title: "Make a call",
    body: "Send a request over HTTPS with your key in the header. The simplest one is a GET to /v1/area with a postcode.",
  },
  {
    num: "03",
    title: "Read the response",
    body: "Every value comes back with where it came from and when it was measured, so you always know what you are looking at.",
  },
];

type LangKey =
  | "curl"
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "php"
  | "ruby"
  | "java"
  | "csharp";

const EXAMPLES: Record<LangKey, { label: string; lang: string; snippet: string; note: string; Logo: typeof CurlLogo }> = {
  curl: {
    label: "cURL",
    lang: "bash",
    Logo: CurlLogo,
    snippet: `curl https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA \\
  -H "Authorization: Bearer oga_your_api_key"`,
    note: "HTTPS only. JSON in, JSON out.",
  },
  javascript: {
    label: "JavaScript",
    lang: "javascript",
    Logo: JavaScriptLogo,
    snippet: `const res = await fetch(
  "https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA",
  { headers: { Authorization: "Bearer oga_your_api_key" } }
);

const area = await res.json();`,
    note: "Any runtime with fetch. No SDK to install.",
  },
  typescript: {
    label: "TypeScript",
    lang: "typescript",
    Logo: TypeScriptLogo,
    snippet: `const res = await fetch(
  "https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA",
  { headers: { Authorization: "Bearer oga_your_api_key" } }
);

const area: unknown = await res.json();`,
    note: "The same fetch, fully typed.",
  },
  python: {
    label: "Python",
    lang: "python",
    Logo: PythonLogo,
    snippet: `import httpx

res = httpx.get(
    "https://onegoodarea.onrender.com/v1/area",
    params={"postcode": "SW1A 1AA"},
    headers={"Authorization": "Bearer oga_your_api_key"},
)
area = res.json()`,
    note: "httpx or requests, the response is the same.",
  },
  go: {
    label: "Go",
    lang: "go",
    Logo: GoLogo,
    snippet: `req, _ := http.NewRequest(
    "GET",
    "https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA",
    nil,
)
req.Header.Set("Authorization", "Bearer oga_your_api_key")

res, _ := http.DefaultClient.Do(req)
defer res.Body.Close()`,
    note: "The standard library is all you need.",
  },
  php: {
    label: "PHP",
    lang: "php",
    Logo: PhpLogo,
    snippet: `$ch = curl_init(
    "https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA"
);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer oga_your_api_key",
]);

$area = json_decode(curl_exec($ch), true);`,
    note: "Plain cURL, nothing to install.",
  },
  ruby: {
    label: "Ruby",
    lang: "ruby",
    Logo: RubyLogo,
    snippet: `require "net/http"
require "json"

uri = URI("https://onegoodarea.onrender.com/v1/area?postcode=SW1A 1AA")
req = Net::HTTP::Get.new(uri)
req["Authorization"] = "Bearer oga_your_api_key"

res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
area = JSON.parse(res.body)`,
    note: "Net::HTTP from the standard library.",
  },
  java: {
    label: "Java",
    lang: "java",
    Logo: JavaLogo,
    snippet: `HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create(
        "https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA"))
    .header("Authorization", "Bearer oga_your_api_key")
    .build();

HttpResponse<String> res = HttpClient.newHttpClient()
    .send(req, HttpResponse.BodyHandlers.ofString());`,
    note: "java.net.http, no dependencies.",
  },
  csharp: {
    label: "C#",
    lang: "csharp",
    Logo: CSharpLogo,
    snippet: `using var http = new HttpClient();
http.DefaultRequestHeaders.Add(
    "Authorization", "Bearer oga_your_api_key");

var area = await http.GetStringAsync(
    "https://onegoodarea.onrender.com/v1/area?postcode=SW1A%201AA");`,
    note: "HttpClient from the base class library.",
  },
};

const LANG_ORDER: LangKey[] = [
  "curl",
  "javascript",
  "typescript",
  "python",
  "go",
  "php",
  "ruby",
  "java",
  "csharp",
];

function Quickstart() {
  const [lang, setLang] = useState<LangKey>("curl");
  const active = EXAMPLES[lang];
  return (
    <section id="quickstart" className="oga-section-dark" data-oga-surface="dark" aria-labelledby="docs-qs-title">
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">01</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Quickstart</span>
          </div>
          <h2 id="docs-qs-title" className="oga-docs__h2">Get your first response in three steps.</h2>
          <p className="oga-docs__lead">Sign up for a key, send one request, and read what comes back. There is no SDK to install.</p>
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

        <div className="oga-docs-ex__tabs" role="tablist" aria-label="Language">
          {LANG_ORDER.map((k) => {
            const ex = EXAMPLES[k];
            const Logo = ex.Logo;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={lang === k}
                onClick={() => setLang(k)}
                className={`oga-docs-ex__tab ${lang === k ? "oga-docs-ex__tab--active" : ""}`}
              >
                <Logo className="oga-docs-ex__tab-logo" aria-hidden />
                {ex.label}
              </button>
            );
          })}
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
            <span className="oga-code-panel__text">{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 02 Products (light): a card per product ---------- */
const PRODUCTS: { name: string; Icon: typeof SignalsIcon; slug: string; verb: string; path: string; line: string }[] = [
  { name: "Signals", Icon: SignalsIcon, slug: "signals", verb: "GET", path: "/v1/area", line: "Pull crime, prices, schools and more for any UK postcode, all in one response." },
  { name: "Scores", Icon: ScoresIcon, slug: "scores", verb: "POST", path: "/v1/score", line: "Turn the data into a single 0 to 100 score, weighted the way your team works." },
  { name: "Monitor", Icon: MonitorIcon, slug: "monitor", verb: "POST", path: "/v1/portfolios", line: "Watch a list of areas and get an alert whenever something meaningful changes." },
  { name: "Intelligence", Icon: IntelligenceIcon, slug: "intelligence", verb: "POST", path: "/v1/query", line: "Ask a question in plain English, or send a typed query, and get an answer back." },
];

function Products() {
  return (
    <section id="products" className="oga-section-hero" aria-labelledby="docs-products-title">
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">02</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Products</span>
          </div>
          <h2 id="docs-products-title" className="oga-docs__h2">Four products, all on one API.</h2>
          <p className="oga-docs__lead">Use them on their own or together. Each one has its own page with the full detail.</p>
        </div>

        <div className="oga-docs-pcards">
          {PRODUCTS.map((p) => {
            const Icon = p.Icon;
            return (
              <Link key={p.name} href={`/products/${p.slug}`} className="oga-docs-pcard">
                <div className="oga-docs-pcard__top">
                  <span className="oga-docs-pcard__icon" aria-hidden><Icon width={30} height={30} /></span>
                  <span className="oga-docs-pcard__ep">
                    <span className="oga-docs-pcard__verb">{p.verb}</span>
                    {p.path}
                  </span>
                </div>
                <h3 className="oga-docs-pcard__name">{p.name}</h3>
                <p className="oga-docs-pcard__line">{p.line}</p>
                <span className="oga-docs-pcard__foot">
                  Read the docs
                  <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- 03 Reference (quiet): deduped links + Levers callout ---------- */
const REFERENCES: { title: string; body: string; href: string; cta: string; Icon: typeof MethodologyIcon }[] = [
  { title: "API reference", Icon: ApiReferenceIcon, body: "Every endpoint, generated from the live API so it never drifts. Try requests right in the browser.", href: "/docs/api-reference", cta: "Open the reference" },
  { title: "MCP server", Icon: McpServerIcon, body: "Add OneGoodArea to Claude, Cursor or any MCP client and call it from your own workflow.", href: "/docs/mcp", cta: "Read the guide" },
  { title: "Methodology", Icon: MethodologyIcon, body: "How every signal, score, peer and forecast is worked out, and the sources behind each one.", href: "/methodology", cta: "Read the methodology" },
  { title: "Changelog", Icon: ChangelogIcon, body: "What we have shipped, and when.", href: "/changelog", cta: "View the changelog" },
];

function Reference() {
  return (
    <section id="reference" className="oga-section-quiet" aria-labelledby="docs-ref-title">
      <div className="oga-docs__container">
        <div className="oga-docs__header">
          <div className="oga-docs__eyebrow">
            <span className="oga-docs__eyebrow-num">03</span>
            <span aria-hidden className="oga-docs__eyebrow-line" />
            <span>Reference</span>
          </div>
          <h2 id="docs-ref-title" className="oga-docs__h2">The full reference, when you need it.</h2>
        </div>

        <div className="oga-docs-ref__grid">
          {REFERENCES.map((r) => {
            const Icon = r.Icon;
            return (
              <Link key={r.title} href={r.href} className="oga-docs-ref-tile oga-docs-ref-tile--link">
                <span className="oga-docs-ref-tile__icon" aria-hidden><Icon width={26} height={26} /></span>
                <h3 className="oga-docs-ref-tile__title">{r.title}</h3>
                <p className="oga-docs-ref-tile__body">{r.body}</p>
                <span className="oga-docs-ref-tile__foot">
                  {r.cta}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="oga-docs-levers-note" id="levers">
          <div className="oga-docs-levers-note__text">
            <span className="oga-docs-levers-note__kicker">Levers</span>
            <h3 className="oga-docs-levers-note__title">Configure it for your whole team.</h3>
            <p className="oga-docs-levers-note__body">
              Custom signal bundles, saved scoring presets, version pinning, peer
              groups, white-labelling and per-key IP allowlists. Everything is
              opt-in from the dashboard, and nothing changes until you turn it on.
            </p>
          </div>
          <Link href="/docs/api-reference#levers" className="oga-btn oga-btn-secondary">
            See the Levers endpoints
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA (dark) ---------- */
function FinalCta() {
  return (
    <section className="oga-section-dark oga-docs-cta" data-oga-surface="dark" aria-labelledby="docs-cta-title">
      <div className="oga-docs__container--narrow">
        <h2 id="docs-cta-title" className="oga-docs-cta__h2">Start building.</h2>
        <p className="oga-docs-cta__lead">
          Get an API key, make your first call, and set it up for your team as you go.
        </p>
        <div className="oga-docs-cta__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
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
