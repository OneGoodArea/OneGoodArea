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

interface McpStatus {
  access: boolean;
  addonOwned: boolean;
  includedFreeViaPlan: boolean;
}

interface DashboardHomeClientProps {
  email: string;
  emailVerified: boolean;
  primaryKey: PrimaryApiKey | null;
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
  planName,
  used,
  limit,
  mcp,
}: DashboardHomeClientProps) {
  return (
    <div className="oga-home">
      {!emailVerified && email ? <VerifyBanner email={email} /> : null}

      <HeroCard primaryKey={primaryKey} mcp={mcp} />

      <div className="oga-home__row">
        <UsageCard planName={planName} used={used} limit={limit} />
        <QuickLinksCard />
      </div>
    </div>
  );
}

/* ============================================================
   Hero card API key + curl example + MCP URL
   ============================================================ */

function HeroCard({
  primaryKey,
  mcp,
}: {
  primaryKey: PrimaryApiKey | null;
  mcp: McpStatus;
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

  return (
    <section className="oga-home-hero">
      <header className="oga-home-hero__head">
        <span className="oga-home-hero__eyebrow">
          <span className="oga-home-hero__dot" aria-hidden />
          Start here
        </span>
        <h2 className="oga-home-hero__title">Make your first call.</h2>
        <p className="oga-home-hero__sub">
          The data + intelligence layer underneath UK property workflows. Drop
          the call below into your code. Preset, postcode, and key are the
          only things you change.
        </p>
      </header>

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
