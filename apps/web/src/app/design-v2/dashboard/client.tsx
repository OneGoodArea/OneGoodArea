"use client";

/* AR-254 [AR-217-B5] /dashboard Home new client.

   Wholesale replaces the previous reports-list + saved-areas +
   inline-API-keys client. The Home is now shaped around the four-
   product API + MCP positioning:

   1. Verify-email banner (only when users.email_verified=FALSE)
   2. Hero card: their primary API key + a real curl example +
      MCP add-on URL. This is the load-bearing "first API call"
      moment became important when we cut the postcode demo
      from /welcome in AR-251.
   3. Usage card: calls used vs plan quota, plan name, upgrade link
   4. Quick links card: the four /products/* surfaces + docs

   No state ladders, no client fetches everything lands in the
   first paint. The page.tsx server component does all the data
   work; this client is presentation + clipboard interactions only. */

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "../_shared/app-shell";
import VerifyBanner from "../_shared/dashboard/verify-banner";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../_shared/product-icons";
import "./dashboard.css";

interface PrimaryApiKey {
  key_prefix: string | null;
  name: string;
  last_used_at: string | null;
}

interface LatestCall {
  preset: string;
  area: string;
  score: number;
  created_at: string;
}

interface McpStatus {
  access: boolean;
  addonOwned: boolean;
  includedFreeViaPlan: boolean;
}

interface DashboardHomeClientProps {
  email: string;
  emailVerified: boolean;
  primaryKey: PrimaryApiKey | null;
  /** Most recent /v1/score-style row from reports, if any. Drives
      the AR-255 contextual hero copy + latest-call strip. */
  latestCall: LatestCall | null;
  plan: string;
  planName: string;
  used: number;
  limit: number;
  mcp: McpStatus;
}

export default function DashboardHomeClient(props: DashboardHomeClientProps) {
  return (
    <AppShell title="Home">
      <Body {...props} />
    </AppShell>
  );
}

function Body({
  email,
  emailVerified,
  primaryKey,
  latestCall,
  planName,
  used,
  limit,
  mcp,
}: DashboardHomeClientProps) {
  return (
    <div className="oga-home">
      {!emailVerified && email ? <VerifyBanner email={email} /> : null}

      <HeroCard
        primaryKey={primaryKey}
        mcp={mcp}
        used={used}
        latestCall={latestCall}
      />

      <div className="oga-home__row">
        <UsageCard planName={planName} used={used} limit={limit} />
        <QuickLinksCard />
      </div>
    </div>
  );
}

/* ============================================================
   AR-255: Latest call strip (renders inside hero, above the
   primary-key row, only when the user has made >= 1 call).
   Editorial single line, no card chrome, no buttons. The card
   row below is where you act; this row is just confirmation
   the API is alive and what it last produced.
   ============================================================ */

function LatestCallStrip({ call }: { call: LatestCall }) {
  return (
    <div className="oga-home-hero__latest" role="status">
      <span className="oga-home-hero__latest-dot" aria-hidden />
      <span className="oga-home-hero__latest-label">Latest call</span>
      <span className="oga-home-hero__latest-detail">
        <code>{call.area}</code>
        <span aria-hidden>·</span>
        <code>preset={call.preset}</code>
        <span aria-hidden>·</span>
        <span>score {Math.round(call.score)}</span>
        <span aria-hidden>·</span>
        <span className="oga-home-hero__latest-when">
          {formatAgo(call.created_at)}
        </span>
      </span>
    </div>
  );
}

function formatAgo(iso: string): string {
  /* Compact relative time. Local-only, no library. The dashboard
     re-renders on each visit so we don't need to keep this
     ticking; a static snapshot at render time is fine. */
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 5) return `${diffWk}w ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo}mo ago`;
}

/* ============================================================
   Hero card API key + curl example + MCP URL
   ============================================================ */

function HeroCard({
  primaryKey,
  mcp,
  used,
  latestCall,
}: {
  primaryKey: PrimaryApiKey | null;
  mcp: McpStatus;
  used: number;
  latestCall: LatestCall | null;
}) {
  const [copied, setCopied] = useState<"" | "key" | "curl" | "mcp">("");

  function copy(text: string, what: "key" | "curl" | "mcp") {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(""), 1600);
  }

  const keyPreview = primaryKey?.key_prefix
    ? `${primaryKey.key_prefix}••••••••`
    : null;

  const curlExample = `curl https://api.onegoodarea.com/v1/score \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -G \\
  --data-urlencode "postcode=SW1A 1AA" \\
  --data-urlencode "preset=research"`;

  const mcpUrl = mcp.access ? "https://mcp.onegoodarea.com/v1" : null;

  /* AR-255: hero copy gates on "have you EVER made a call", not
     "have you made one this month". The `used` count resets every
     month, but a user who made calls last month isn't a first-time
     user. Without this gate the hero says "Make your first call"
     while the latest-call strip below it shows a real previous call,
     which reads as broken. The presence of a latestCall is the
     truthful "you've used the API before" signal. */
  const hasEverCalled = latestCall !== null;
  const eyebrow = hasEverCalled ? "Quick reference" : "Start here";
  const title = hasEverCalled ? "Quick reference." : "Make your first call.";
  const sub = hasEverCalled
    ? "The call you came back to copy. Same shape your production code makes against /v1/score, same engine version, same confidence stamping on the response."
    : "The data + intelligence layer underneath UK property workflows. Drop the call below into your code. Preset, postcode, and key are the only things you change.";

  /* `used` still drives the in-month usage card. It's passed in
     because the hero's sub copy could reference it in the future
     ("X calls this month") but currently doesn't. Keep the prop
     so AR-235 + later activity-feed work doesn't need to thread it
     back in. */
  void used;

  return (
    <section className="oga-home-hero">
      <header className="oga-home-hero__head">
        <span className="oga-home-hero__eyebrow">
          <span className="oga-home-hero__dot" aria-hidden />
          {eyebrow}
        </span>
        <h2 className="oga-home-hero__title">{title}</h2>
        <p className="oga-home-hero__sub">{sub}</p>
      </header>

      {latestCall ? <LatestCallStrip call={latestCall} /> : null}

      {/* API key one-liner */}
      <div className="oga-home-hero__row">
        <div className="oga-home-hero__row-label">Your primary API key</div>
        <div className="oga-home-hero__row-value">
          {keyPreview ? (
            <>
              <code className="oga-home-hero__code">{keyPreview}</code>
              <Link href="/api-usage" className="oga-home-hero__link">
                Manage keys →
              </Link>
            </>
          ) : (
            <>
              <span className="oga-home-hero__nokey">
                You haven&apos;t created an API key yet.
              </span>
              <Link href="/api-usage" className="oga-home-hero__cta">
                Create your first key →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Curl example */}
      <div className="oga-home-hero__codeblock">
        <div className="oga-home-hero__codeblock-head">
          <span className="oga-home-hero__codeblock-lang">curl</span>
          <button
            type="button"
            onClick={() => copy(curlExample, "curl")}
            className="oga-home-hero__copy"
          >
            {copied === "curl" ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className="oga-home-hero__pre">
          <code>{curlExample}</code>
        </pre>
      </div>

      {/* MCP add-on row */}
      <div className="oga-home-hero__row">
        <div className="oga-home-hero__row-label">MCP for your editor</div>
        <div className="oga-home-hero__row-value">
          {mcpUrl ? (
            <>
              <code className="oga-home-hero__code">{mcpUrl}</code>
              <button
                type="button"
                onClick={() => copy(mcpUrl, "mcp")}
                className="oga-home-hero__copy oga-home-hero__copy--inline"
              >
                {copied === "mcp" ? "Copied ✓" : "Copy"}
              </button>
            </>
          ) : (
            <>
              <span className="oga-home-hero__nokey">
                MCP integration not yet enabled on your plan.
              </span>
              <Link href="/dashboard/billing" className="oga-home-hero__cta">
                Add MCP access →
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Usage card
   ============================================================ */

function UsageCard({
  planName,
  used,
  limit,
}: {
  planName: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = pct >= 80;

  return (
    <section className="oga-home-card">
      <header className="oga-home-card__head">
        <span className="oga-home-card__eyebrow">Usage</span>
        <span className="oga-home-card__plan">{planName}</span>
      </header>

      <div className="oga-home-card__stat">
        <span className="oga-home-card__stat-value">{used.toLocaleString()}</span>
        <span className="oga-home-card__stat-of">/ {limit.toLocaleString()} this month</span>
      </div>

      <div className="oga-home-card__bar">
        <div
          className="oga-home-card__bar-fill"
          style={{ width: `${pct}%` }}
          data-near-limit={nearLimit ? "true" : "false"}
        />
      </div>

      <div className="oga-home-card__footer">
        {nearLimit ? (
          <Link href="/dashboard/billing" className="oga-home-card__link">
            Upgrade plan →
          </Link>
        ) : (
          <Link href="/api-usage" className="oga-home-card__link">
            See full usage →
          </Link>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   Quick links card
   ============================================================ */

function QuickLinksCard() {
  const links = [
    {
      href: "/products/signals",
      label: "Signals",
      Icon: SignalsIcon,
      desc: "47 normalised UK property signals, one schema.",
    },
    {
      href: "/products/scores",
      label: "Scores",
      Icon: ScoresIcon,
      desc: "Area quality as a single 0–100 number.",
    },
    {
      href: "/products/monitor",
      label: "Monitor",
      Icon: MonitorIcon,
      desc: "Watch postcodes for material change.",
    },
    {
      href: "/products/intelligence",
      label: "Intelligence",
      Icon: IntelligenceIcon,
      desc: "Traceable natural-language queries.",
    },
  ];

  return (
    <section className="oga-home-card">
      <header className="oga-home-card__head">
        <span className="oga-home-card__eyebrow">Products</span>
        <Link href="/docs/api-reference" className="oga-home-card__link">
          API reference →
        </Link>
      </header>

      <ul className="oga-home-links">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="oga-home-links__item">
              <span className="oga-home-links__icon" aria-hidden>
                <link.Icon width={18} height={18} />
              </span>
              <span className="oga-home-links__body">
                <span className="oga-home-links__name">{link.label}</span>
                <span className="oga-home-links__desc">{link.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
