"use client";

import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { XIcon, LinkedInIcon, EmailIcon } from "../_shared/social-icons";
import "./about.css";

/* About OneGoodArea — Brand v3 rewrite (AR-204 PR Q).
   Replaces the 670 LOC legacy Fraunces + .aiq + inline-style page.

   Locked IA (5 sections, no founder block, no roadmap):
     Hero (cream)
     § 01  Why we exist            (cream-quiet)
     § 02  What we believe         (DARK, 6 principle cards w/ ADR refs)
     § 03  How it got built        (cream, origin + small-team framing + real stats strip)
     § 04  Talk to us              (DARK CTA, 3 contact channels)

   Voice: company (we / our). No founder spotlight.
   Hard rules: zero inline styles, no aiq_, no em dashes, no fake links,
   no invented numbers (all stats traceable to ADRs / memory / engine state). */

/* Per-principle micro-illustrations.
   Brand v3 dot-and-hairline vocabulary — same family as the homepage
   product icons (SignalsIcon 5x5 / ScoresIcon converge / MonitorIcon
   wave / IntelligenceIcon query-graph). Pure dots + hairlines, no
   text inside the SVG. viewBox 32x32, rendered at 64px in the card.
   currentColor everywhere so they invert on dark surfaces. */

const VIZ_BASE = {
  className: "oga-about-believe__card-svg",
  viewBox: "0 0 32 32",
  fill: "none",
  "aria-hidden": true as const,
};

/* 1. Deterministic at the source — many inputs converge to ONE solid
   dot (the engine output); a small disconnected cluster up top
   stands for AI (not in the line). */
function VizDeterministic() {
  const center = { x: 16, y: 19 };
  const inputs = [
    { x: 4,  y: 24 },
    { x: 8,  y: 28 },
    { x: 16, y: 30 },
    { x: 24, y: 28 },
    { x: 28, y: 24 },
  ];
  const ai = [
    { x: 10, y: 5 },
    { x: 16, y: 4 },
    { x: 22, y: 5 },
  ];
  return (
    <svg {...VIZ_BASE}>
      {/* hairlines from inputs to engine */}
      <g stroke="currentColor" strokeOpacity="0.32" strokeWidth="0.7">
        {inputs.map((p, i) => (
          <line key={i} x1={p.x} y1={p.y} x2={center.x} y2={center.y} />
        ))}
      </g>
      <g fill="currentColor">
        {inputs.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" />
        ))}
        {/* AI cluster — disconnected, ambient */}
        <g opacity="0.36">
          {ai.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.0" />
          ))}
        </g>
        {/* Engine result — enlarged, with a halo ring */}
        <circle cx={center.x} cy={center.y} r="2.4" />
      </g>
      <circle cx={center.x} cy={center.y} r="3.8" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.6" />
    </svg>
  );
}

/* 2. Methodology is public — a structured 4x5 grid of dots with a
   horizontal "ruled" hairline at midpoint, top row at full opacity
   (the header anchor). Reads as an ordered, published page. */
function VizMethodology() {
  const cols = [6, 13, 20, 27];
  const rows = [5, 11, 17, 23, 29];
  return (
    <svg {...VIZ_BASE}>
      {/* page rule hairline */}
      <line x1="2" y1="14" x2="30" y2="14" stroke="currentColor" strokeOpacity="0.28" strokeWidth="0.6" />
      <g fill="currentColor">
        {rows.map((y, rIdx) =>
          cols.map((x, cIdx) => (
            <circle
              key={`${rIdx}-${cIdx}`}
              cx={x}
              cy={y}
              r={rIdx === 0 ? 1.4 : 1.0}
              opacity={rIdx === 0 ? 1 : 0.45}
            />
          )),
        )}
      </g>
    </svg>
  );
}

/* 3. Plan-replayable AI — 6 dots arranged in a closed loop. The
   closing edge IS the replay; one entry dot enlarged. No text. */
function VizPlanReplay() {
  const cx = 16, cy = 16, r = 10;
  const nodes = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return (
    <svg {...VIZ_BASE}>
      <g stroke="currentColor" strokeOpacity="0.42" strokeWidth="0.7" fill="none">
        {nodes.map((p, i) => {
          const next = nodes[(i + 1) % nodes.length];
          return <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} />;
        })}
      </g>
      <g fill="currentColor">
        {nodes.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 2.0 : 1.3} />
        ))}
      </g>
      {/* halo on the entry node */}
      <circle cx={nodes[0].x} cy={nodes[0].y} r="3.2" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.55" />
    </svg>
  );
}

/* 4. Sample-size honest — 6 vertical columns of stacked dots. A
   horizontal threshold hairline divides the field. Columns peaking
   below the threshold are dimmed (gated out); columns peaking above
   are full opacity (the honest signal that passes). */
function VizSampleSize() {
  const cols = [
    { x: 4,  heights: [28, 24] },                              // 2 dots — below
    { x: 9,  heights: [28, 24, 20, 16] },                      // 4 dots — at line
    { x: 14, heights: [28, 24] },                              // 2 dots — below
    { x: 19, heights: [28, 24, 20, 16, 12] },                  // 5 dots — well above
    { x: 24, heights: [28, 24, 20] },                          // 3 dots — below
    { x: 29, heights: [28, 24, 20, 16] },                      // 4 dots — at line
  ];
  const threshold = 16;
  return (
    <svg {...VIZ_BASE}>
      {/* threshold rule */}
      <line x1="2" y1={threshold} x2="30" y2={threshold} stroke="currentColor" strokeOpacity="0.42" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
      {cols.map((c, ci) => {
        const top = Math.min(...c.heights);
        const passes = top <= threshold;
        return (
          <g key={ci} fill="currentColor" opacity={passes ? 1 : 0.35}>
            {c.heights.map((y, di) => (
              <circle key={di} cx={c.x} cy={y} r={passes && di === c.heights.length - 1 ? 1.5 : 1.1} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* 5. Pinnable per organisation — horizontal axis of 5 version dots.
   Center dot enlarged + halo (the pinned version). A hairline drops
   from it to a small anchor mark below (the org). */
function VizPinnable() {
  const axisY = 14;
  const versions = [4, 10, 16, 22, 28];
  return (
    <svg {...VIZ_BASE}>
      {/* axis line */}
      <line x1="2" y1={axisY} x2="30" y2={axisY} stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.6" />
      <g fill="currentColor">
        {versions.map((x, i) => {
          const pinned = i === 2;
          return (
            <circle
              key={i}
              cx={x}
              cy={axisY}
              r={pinned ? 2.2 : 1.2}
              opacity={i === 4 ? 0.45 : pinned ? 1 : 0.6}
            />
          );
        })}
      </g>
      {/* halo on pinned version */}
      <circle cx="16" cy={axisY} r="3.6" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.55" />
      {/* pin drop to anchor */}
      <line x1="16" y1="18" x2="16" y2="24" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.7" />
      <line x1="12" y1="26" x2="20" y2="26" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.7" />
      <circle cx="16" cy="26" r="1.0" fill="currentColor" />
    </svg>
  );
}

/* 6. Country-scoped percentiles — 3 separated dot clusters, no
   hairlines between them. The visual gap IS the principle (no
   cross-border comparison). One enlarged dot per cluster = the
   country reference. */
function VizCountryScoped() {
  const clusters = [
    /* England */
    [
      { x: 4,  y: 12, r: 1.0 },
      { x: 7,  y: 10, r: 1.0 },
      { x: 9,  y: 13, r: 1.0 },
      { x: 7,  y: 16, r: 1.7 },
      { x: 4,  y: 18, r: 1.0 },
    ],
    /* Scotland */
    [
      { x: 14, y: 10, r: 1.0 },
      { x: 18, y: 11, r: 1.0 },
      { x: 17, y: 14, r: 1.0 },
      { x: 15, y: 16, r: 1.7 },
      { x: 19, y: 18, r: 1.0 },
    ],
    /* Wales */
    [
      { x: 24, y: 11, r: 1.0 },
      { x: 27, y: 13, r: 1.0 },
      { x: 23, y: 14, r: 1.0 },
      { x: 26, y: 17, r: 1.7 },
      { x: 28, y: 19, r: 1.0 },
    ],
  ];
  return (
    <svg {...VIZ_BASE}>
      <g fill="currentColor">
        {clusters.flatMap((cluster, ci) =>
          cluster.map((p, pi) => (
            <circle key={`${ci}-${pi}`} cx={p.x} cy={p.y} r={p.r} />
          )),
        )}
      </g>
      {/* faint baseline hairline under each cluster — anchors them
          to their own ground without connecting cross-cluster */}
      <g stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.55">
        <line x1="3"  y1="23" x2="10" y2="23" />
        <line x1="13" y1="23" x2="20" y2="23" />
        <line x1="22" y1="23" x2="29" y2="23" />
      </g>
    </svg>
  );
}

const PRINCIPLES = [
  {
    title: "Deterministic at the source",
    body: "The engine sets the number, not the AI. Every score, signal, and percentile is computed by a versioned SQL + rules pipeline you can replay byte-for-byte. AI sits on top as a planner and a query plane, never as the source of truth.",
    Viz: VizDeterministic,
  },
  {
    title: "Methodology is public",
    body: "Every dimension, every weight, every aggregation step is documented on /methodology. The architectural decision record is open on GitHub. If a number lands in your report, the trail is citable.",
    Viz: VizMethodology,
  },
  {
    title: "Plan-replayable AI",
    body: "Natural-language queries emit a typed plan (Zod-strict JSON) before any SQL runs. The same plan replays without an LLM call. The AI is auditable because it is not the executor.",
    Viz: VizPlanReplay,
  },
  {
    title: "Sample-size honest",
    body: "When the underlying data is thin, confidence drops and the response says why. Price moves on two transactions never trigger a webhook. We would rather say less than say something wrong.",
    Viz: VizSampleSize,
  },
  {
    title: "Pinnable per organisation",
    body: "Methodology version locks per-org. Your contract cycle survives engine upgrades. Two calls in the same window return the same numbers across deploys.",
    Viz: VizPinnable,
  },
  {
    title: "Country-scoped percentiles",
    body: "England compared against England, Scotland against Scotland, Wales against Wales. No cross-border lies. Three official deprivation methodologies, three percentile spaces, by design.",
    Viz: VizCountryScoped,
  },
];

const STATS = [
  { value: "v2.0.2",  label: "Engine version stamped on every response" },
  { value: "4",       label: "Products live (Signals, Scores, Monitor, Intelligence)" },
  { value: "5",       label: "ICPs served (PropTech, insurance, lenders, CRE, public sector)" },
  { value: "35+",     label: "Architectural decision records published" },
];

const CONTACT_CHANNELS = [
  {
    label: "Email",
    value: "operation@onegoodarea.co.uk",
    href: "mailto:operation@onegoodarea.co.uk",
    note: "We read everything that lands here.",
    Icon: EmailIcon,
  },
  {
    label: "X",
    value: "@onegoodarea",
    href: "https://x.com/onegoodarea",
    note: "Engineering and product updates as we ship.",
    Icon: XIcon,
  },
  {
    label: "LinkedIn",
    value: "company/onegoodarea",
    href: "https://www.linkedin.com/company/onegoodarea",
    note: "Longer-form notes and hiring when we open roles.",
    Icon: LinkedInIcon,
  },
];

export default function AboutClient() {
  return (
    <div className="oga-root oga-about">
      <Nav />
      {/* HERO ---------------------------------------------------- */}
      <section className="oga-about-hero" data-oga-surface="light">
        <div className="oga-about-hero__inner">
          <div className="oga-about-hero__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>About OneGoodArea</span>
          </div>

          <h1 className="oga-about-hero__title">
            We&rsquo;re building the data and intelligence layer underneath UK property workflows.
          </h1>

          <p className="oga-about-hero__lead">
            Deterministic signals, configurable scoring, portfolio monitoring,
            and a typed AI query plane over monthly area time-series. One API,
            one methodology, version-pinned per organisation.
          </p>

          <div className="oga-about-hero__cta">
            <Link href="/methodology" className="oga-btn oga-btn-primary">
              Read the methodology
              <span aria-hidden>→</span>
            </Link>
            <a href="mailto:operation@onegoodarea.co.uk" className="oga-btn oga-btn-secondary">
              Talk to us
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* § 01 — WHY WE EXIST ------------------------------------- */}
      <section className="oga-section-quiet oga-about-why" data-oga-surface="light">
        <div className="oga-about-why__inner">
          <div className="oga-about-why__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-mono">01</span>
            <span>Why we exist</span>
          </div>

          <h2 className="oga-about-why__title">
            UK property workflows still stitch area data from seven portals.
          </h2>

          <div className="oga-about-why__prose">
            <p>
              An underwriter wants crime, deprivation, education, and price
              context for a postcode. They open four tabs, copy numbers into a
              spreadsheet, and hope the dates line up. A site selection team
              wants to rank 40,000 catchments against their own criteria. They
              cannot, because no single API answers a compound query against
              the ONS spine with country-correct percentiles.
            </p>
            <p>
              We built the layer underneath. The same official sources every
              compliance team already trusts, but stitched into one API with
              the dating, attribution, and percentile scoping done correctly
              by construction. Methodology version stamped on every response.
              Sample-size gates on every change-detection job. Open ADR trail
              behind every architectural choice.
            </p>
            <p>
              It exists so the underwriter, the planner, the site selection
              lead, and the analyst all pull from the same numbers, with the
              same methodology, on the same engine version. Decision-grade by
              construction. Auditable on first request.
            </p>
          </div>
        </div>
      </section>

      {/* § 02 — WHAT WE BELIEVE (DARK) --------------------------- */}
      <section className="oga-section-dark oga-about-believe" data-oga-surface="dark">
        <div className="oga-about-believe__inner">
          <div className="oga-about-believe__head">
            <div className="oga-about-believe__eyebrow oga-eyebrow oga-eyebrow--inverse">
              <span className="oga-eyebrow-mono">02</span>
              <span>What we believe</span>
            </div>
            <h2 className="oga-about-believe__title">
              Six principles, all traceable to an architectural decision record.
            </h2>
            <p className="oga-about-believe__lead">
              These aren&rsquo;t marketing words. Each one is enforced in code,
              documented in /methodology, and citable in your audit footnote.
            </p>
          </div>

          <ol className="oga-about-believe__grid">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="oga-about-believe__card">
                <div className="oga-about-believe__card-viz">
                  <p.Viz />
                </div>
                <div className="oga-about-believe__card-meta">
                  <span className="oga-about-believe__card-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="oga-about-believe__card-title">{p.title}</h3>
                <p className="oga-about-believe__card-body">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* § 03 — HOW IT GOT BUILT --------------------------------- */}
      <section className="oga-about-built" data-oga-surface="light">
        <div className="oga-about-built__inner">
          <div className="oga-about-built__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-mono">03</span>
            <span>How it got built</span>
          </div>

          <h2 className="oga-about-built__title">
            Engine first, surfaces second, AI last.
          </h2>

          <div className="oga-about-built__prose">
            <p>
              OneGoodArea is built lean by a small team. The first phase was
              the engine: the ONS postcode spine, the three national
              deprivation methodologies, the price and crime time-series, the
              confidence rubric, the version stamp. The four products you see
              today (Signals, Scores, Monitor, Intelligence) all sit on that
              same core. Same numbers, four shapes.
            </p>
            <p>
              AI joined the stack only after the engine was deterministic and
              the methodology was published. The planner emits a typed plan
              first; the SQL runs second; the LLM never touches the numbers.
              That ordering is the architecture, not a slogan. It is the
              reason a public sector analyst can replay an AI query a year
              later, without an LLM call, and get the same rows.
            </p>
          </div>

          <ul className="oga-about-built__stats">
            {STATS.map((s) => (
              <li key={s.label} className="oga-about-built__stat">
                <div className="oga-about-built__stat-value">{s.value}</div>
                <div className="oga-about-built__stat-label">{s.label}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* § 04 — TALK TO US (DARK CTA) ---------------------------- */}
      <section className="oga-section-dark oga-about-contact" data-oga-surface="dark">
        <div className="oga-about-contact__inner">
          <div className="oga-about-contact__eyebrow oga-eyebrow oga-eyebrow--inverse">
            <span className="oga-eyebrow-mono">04</span>
            <span>Talk to us</span>
          </div>

          <h2 className="oga-about-contact__title">
            Procurement question? Methodology question? Building on top of us?
          </h2>

          <p className="oga-about-contact__lead">
            Whichever it is, the fastest channel is the one below you already use.
          </p>

          <ul className="oga-about-contact__grid">
            {CONTACT_CHANNELS.map((c) => {
              const external = c.href.startsWith("http");
              return (
                <li key={c.label} className="oga-about-contact__card">
                  <div className="oga-about-contact__card-icon" aria-hidden>
                    <c.Icon />
                  </div>
                  <div className="oga-about-contact__card-label">{c.label}</div>
                  <a
                    className="oga-about-contact__card-value"
                    href={c.href}
                    {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                  >
                    {c.value}
                    <span className="oga-about-contact__card-arrow" aria-hidden>
                      {external ? "↗" : "→"}
                    </span>
                  </a>
                  <p className="oga-about-contact__card-note">{c.note}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
