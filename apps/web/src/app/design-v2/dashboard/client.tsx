"use client";

/* AR-256 [AR-217-B5] /dashboard Home rebalanced.

   AR-254 shipped a single hero card with the API key + curl + a
   one-line MCP mention. AR-256 rebalances that to match the product
   positioning where API and MCP are equal halves of the product.
   Two equal cards at the top: one for REST API integration, one
   for MCP integration. Each carries its own tab switcher (languages
   for the API card, editors for the MCP card) so a fresh customer
   sees both surfaces with realistic snippets, not a one-liner.

   QuickLinksCard (which pointed at /products/* marketing surfaces)
   is replaced by a DocsCard pointing at the actual docs routes
   (/docs, /docs/api-reference, /docs/mcp). A signed-in customer
   doesn't need the marketing tour, they need integration docs.

   AR-255 latest-call strip is preserved and lifted to a top-level
   strip above the hero row so it frames the whole page, not just
   the API card. */

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { AppShell } from "../_shared/app-shell";
import VerifyBanner from "../_shared/dashboard/verify-banner";
import { ApiReferenceIcon, McpServerIcon } from "../_shared/docs-icons";
import { CursorLogo, ClaudeLogo } from "../_shared/editor-icons";
import "./dashboard.css";

/* ============================================================
   Types
   ============================================================ */

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
  latestCall: LatestCall | null;
  plan: string;
  planName: string;
  used: number;
  limit: number;
  mcp: McpStatus;
}

/* ============================================================
   Entry
   ============================================================ */

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
  const hasEverCalled = latestCall !== null;
  const intro = hasEverCalled
    ? "Your two integration surfaces. Copy what you need."
    : "Two ways to use OneGoodArea: call the REST API from your code, or connect MCP to your editor. Both work today.";

  return (
    <div className="oga-home">
      {!emailVerified && email ? <VerifyBanner email={email} /> : null}

      <header className="oga-home__intro">
        <p>{intro}</p>
      </header>

      {latestCall ? <LatestCallStrip call={latestCall} /> : null}

      <div className="oga-home__hero-row">
        <ApiCard primaryKey={primaryKey} />
        <McpCard mcp={mcp} />
      </div>

      <div className="oga-home__row">
        <UsageCard planName={planName} used={used} limit={limit} />
        <DocsCard />
      </div>
    </div>
  );
}

/* ============================================================
   Latest-call strip (AR-255, lifted here from inside the hero)
   ============================================================ */

function LatestCallStrip({ call }: { call: LatestCall }) {
  return (
    <div className="oga-home-latest" role="status">
      <span className="oga-home-latest__dot" aria-hidden />
      <span className="oga-home-latest__label">Latest call</span>
      <span className="oga-home-latest__detail">
        <code>{call.area}</code>
        <span aria-hidden>·</span>
        <code>preset={call.preset}</code>
        <span aria-hidden>·</span>
        <span>score {Math.round(call.score)}</span>
        <span aria-hidden>·</span>
        <span className="oga-home-latest__when">
          {formatAgo(call.created_at)}
        </span>
      </span>
    </div>
  );
}

function formatAgo(iso: string): string {
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
   Generic tabs primitive (used by API + MCP cards)
   ============================================================
   Editorial mono caps tabs with an ink underline on active. Owns
   its own state via the parent's useState. No keyboard hotkeys
   beyond default button focus, the tab count is small (3) so
   ARIA tablist patterns would be overkill for this surface. */

interface TabDef<Id extends string> {
  id: Id;
  label: string;
  /** Optional leading glyph (editor logo for MCP tabs). */
  icon?: ReactElement;
  /** Optional color hint for the tab label + underline. Used by API
      language tabs to color-code curl / JS / Python the same way
      .oga-verb--get / --post / --patch are colored on the API
      reference page. Free-form so this stays a primitive concern. */
  color?: string;
}

function Tabs<Id extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: ReadonlyArray<TabDef<Id>>;
  active: Id;
  onChange: (id: Id) => void;
  ariaLabel: string;
}) {
  return (
    <div className="oga-home-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const style = tab.color
          ? ({ "--tab-color": tab.color } as React.CSSProperties)
          : undefined;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={
              isActive
                ? "oga-home-tabs__tab oga-home-tabs__tab--active"
                : "oga-home-tabs__tab"
            }
            data-colored={tab.color ? "true" : undefined}
            style={style}
          >
            {tab.icon ? (
              <span aria-hidden className="oga-home-tabs__tab-icon">
                {tab.icon}
              </span>
            ) : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   API card: key + language tabs + code sample
   ============================================================ */

type ApiLang = "curl" | "javascript" | "python";

/* AR-256: language colors borrow the same dark-surface verb palette
   used by .oga-verb--get / --post / --patch on the API reference
   page (#7AC295 green, #F0B270 amber, #E8D27A yellow). Same
   vocabulary, applied to language tabs instead of HTTP verbs. */
const API_TABS: ReadonlyArray<TabDef<ApiLang>> = [
  { id: "curl",       label: "curl",       color: "#F0B270" },
  { id: "javascript", label: "JavaScript", color: "#E8D27A" },
  { id: "python",     label: "Python",     color: "#7AC295" },
];

function ApiCard({ primaryKey }: { primaryKey: PrimaryApiKey | null }) {
  const [lang, setLang] = useState<ApiLang>("curl");
  const [copied, setCopied] = useState(false);

  const keyPreview = primaryKey?.key_prefix
    ? `${primaryKey.key_prefix}••••••••`
    : null;

  const samples: Record<ApiLang, string> = {
    curl: `curl https://api.onegoodarea.com/v1/score \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -G \\
  --data-urlencode "postcode=SW1A 1AA" \\
  --data-urlencode "preset=research"`,

    javascript: `const params = new URLSearchParams({
  postcode: "SW1A 1AA",
  preset: "research",
});

const res = await fetch(
  \`https://api.onegoodarea.com/v1/score?\${params}\`,
  { headers: { Authorization: \`Bearer \${process.env.OGA_API_KEY}\` } },
);
const data = await res.json();`,

    python: `import os, requests

r = requests.get(
    "https://api.onegoodarea.com/v1/score",
    headers={"Authorization": f"Bearer {os.environ['OGA_API_KEY']}"},
    params={"postcode": "SW1A 1AA", "preset": "research"},
)
data = r.json()`,
  };

  function copySample() {
    navigator.clipboard?.writeText(samples[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="oga-home-card oga-home-card--code">
      <header className="oga-home-card__head">
        <span className="oga-home-card__eyebrow oga-home-card__eyebrow--icon">
          <span aria-hidden className="oga-home-card__eyebrow-glyph">
            <ApiReferenceIcon />
          </span>
          REST API
        </span>
        <Link href="/docs/api-reference" className="oga-home-card__link">
          Full reference →
        </Link>
      </header>

      <div className="oga-home-card__keyrow">
        <span className="oga-home-card__keylabel">Your primary key</span>
        {keyPreview ? (
          <>
            <code className="oga-home-card__keyvalue">{keyPreview}</code>
            <Link href="/api-usage" className="oga-home-card__keylink">
              Manage →
            </Link>
          </>
        ) : (
          <>
            <span className="oga-home-card__keyempty">No key yet.</span>
            <Link href="/api-usage" className="oga-home-card__keylink">
              Create →
            </Link>
          </>
        )}
      </div>

      <div className="oga-home-codeblock">
        <Tabs
          tabs={API_TABS}
          active={lang}
          onChange={setLang}
          ariaLabel="Code language"
        />
        <div className="oga-home-codeblock__head">
          <span className="oga-home-codeblock__path">
            GET /v1/score
          </span>
          <button
            type="button"
            onClick={copySample}
            className="oga-home-codeblock__copy"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className="oga-home-codeblock__pre">
          <code>{samples[lang]}</code>
        </pre>
      </div>
    </section>
  );
}

/* ============================================================
   MCP card: server URL + editor tabs + JSON config snippet
   ============================================================
   The mcpServers JSON shape below is the cross-editor canonical
   format. Per-editor variations (where the JSON lives, whether it
   wraps inside a parent object) are described in /docs/mcp so the
   canonical truth lives there, not duplicated on the dashboard. */

type McpEditor = "cursor" | "claude-code" | "claude-desktop";

/* AR-256: editor tabs carry the editor's logo as a leading glyph.
   Cursor uses its own mark; Claude Code + Claude Desktop both
   share the Claude mark since they're both Anthropic Claude
   surfaces. */
const MCP_TABS: ReadonlyArray<TabDef<McpEditor>> = [
  { id: "cursor",         label: "Cursor",         icon: <CursorLogo width={12} height={12} /> },
  { id: "claude-code",    label: "Claude Code",    icon: <ClaudeLogo width={12} height={12} /> },
  { id: "claude-desktop", label: "Claude Desktop", icon: <ClaudeLogo width={12} height={12} /> },
];

/* Per-editor: where the user pastes the JSON. The actual `mcpServers`
   shape is identical, only the surrounding container differs. */
const MCP_HINT: Record<McpEditor, string> = {
  cursor: "Add to ~/.cursor/mcp.json",
  "claude-code": "Add to .mcp.json in your project root",
  "claude-desktop": "Add to claude_desktop_config.json",
};

function McpCard({ mcp }: { mcp: McpStatus }) {
  const [editor, setEditor] = useState<McpEditor>("cursor");
  const [copied, setCopied] = useState(false);
  const mcpUrl = mcp.access ? "https://mcp.onegoodarea.com/v1" : null;

  const snippet = `{
  "mcpServers": {
    "onegoodarea": {
      "url": "https://mcp.onegoodarea.com/v1",
      "headers": {
        "Authorization": "Bearer YOUR_OGA_API_KEY"
      }
    }
  }
}`;

  function copySnippet() {
    navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="oga-home-card oga-home-card--code">
      <header className="oga-home-card__head">
        <span className="oga-home-card__eyebrow oga-home-card__eyebrow--icon">
          <span aria-hidden className="oga-home-card__eyebrow-glyph">
            <McpServerIcon />
          </span>
          MCP
        </span>
        <Link href="/docs/mcp" className="oga-home-card__link">
          Setup guide →
        </Link>
      </header>

      <div className="oga-home-card__keyrow">
        <span className="oga-home-card__keylabel">Server URL</span>
        {mcpUrl ? (
          <>
            <code className="oga-home-card__keyvalue">{mcpUrl}</code>
            <span className="oga-home-card__keystatus">Enabled</span>
          </>
        ) : (
          <>
            <span className="oga-home-card__keyempty">
              Not enabled on your plan.
            </span>
            <Link
              href="/dashboard/billing"
              className="oga-home-card__keylink"
            >
              Add MCP →
            </Link>
          </>
        )}
      </div>

      <div className="oga-home-codeblock">
        <Tabs
          tabs={MCP_TABS}
          active={editor}
          onChange={setEditor}
          ariaLabel="Editor"
        />
        <div className="oga-home-codeblock__head">
          <span className="oga-home-codeblock__path">{MCP_HINT[editor]}</span>
          <button
            type="button"
            onClick={copySnippet}
            className="oga-home-codeblock__copy"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className="oga-home-codeblock__pre">
          <code>{snippet}</code>
        </pre>
      </div>
    </section>
  );
}

/* ============================================================
   Usage card (unchanged from AR-254)
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
        <span className="oga-home-card__stat-value">
          {used.toLocaleString()}
        </span>
        <span className="oga-home-card__stat-of">
          / {limit.toLocaleString()} this month
        </span>
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
   Docs card (replaces the AR-254 QuickLinksCard which pointed at
   /products/* marketing surfaces a signed-in customer doesn't need).
   ============================================================ */

function DocsCard() {
  const entries = [
    {
      href: "/docs",
      label: "Quickstart",
      desc: "From sign-up to first call. The shortest path through the API.",
    },
    {
      href: "/docs/api-reference",
      label: "Full API reference",
      desc: "Every endpoint, every parameter, every response field.",
    },
    {
      href: "/docs/mcp",
      label: "MCP setup guide",
      desc: "Cursor, Claude Code, Claude Desktop, and the protocol details.",
    },
  ];

  return (
    <section className="oga-home-card">
      <header className="oga-home-card__head">
        <span className="oga-home-card__eyebrow">Docs</span>
      </header>

      <ul className="oga-home-docs">
        {entries.map((e) => (
          <li key={e.href}>
            <Link href={e.href} className="oga-home-docs__item">
              <span className="oga-home-docs__name">{e.label}</span>
              <span className="oga-home-docs__desc">{e.desc}</span>
              <span aria-hidden className="oga-home-docs__chev">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
