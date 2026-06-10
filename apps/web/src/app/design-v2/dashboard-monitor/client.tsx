"use client";

/* AR-261 /dashboard/monitor portfolios overview.

   List of tracked portfolios. Expand a card to see the postcodes
   in it + recent material signal changes (the rows /v1/portfolios
   /:id/changes returns when something crossed the threshold).
   Same product-header vocabulary as /dashboard/signals + /scores:
   MonitorIcon, mono caps PRODUCT eyebrow, serif title, tagline.

   MVP fixtures: 3 portfolios with realistic-shaped postcodes +
   recent material changes. SAMPLE DATA strip is up-front so the
   workbench doesn't pass as live. Live /v1/portfolios integration
   is a follow-up ticket. */

import { useEffect, useState } from "react";
import { AppShell } from "../_shared/app-shell";
import { MonitorIcon } from "../_shared/product-icons";
import "./client.css";

interface LivePortfolio {
  id: string;
  name: string;
  area_count: number;
  created_at: string;
  updated_at: string;
  areas: Array<{ id: string; area: string; label: string | null }>;
}

const ENGINE_VERSION = "2.0.2";

export default function MonitorClient() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

const PAGE_SIZE = 20;

function Body() {
  const [live, setLive] = useState<LivePortfolio[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Debounce the search box so we don't fire a request per keystroke
     when the user is typing a name. */
  useEffect(() => {
    const handle = setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- debounce
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  /* Reset to page 1 when the search changes. Avoids showing page 3
     of a different filter. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on query
    setPage(1);
  }, [debouncedQuery]);

  /* Page + search fetch. */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- loading start
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (debouncedQuery) params.set("q", debouncedQuery);
        const res = await fetch(`/api/me/portfolios?${params.toString()}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setLive([]);
          setTotal(0);
          return;
        }
        const json = (await res.json()) as {
          portfolios: LivePortfolio[];
          total: number;
        };
        setLive(json.portfolios ?? []);
        setTotal(json.total ?? 0);
      } catch {
        setLive([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery]);

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  return (
    <div className="oga-mon">
      <header className="oga-mon__product">
        <span className="oga-mon__product-mark" aria-hidden>
          <MonitorIcon width={56} height={56} />
        </span>
        <div className="oga-mon__product-text">
          <span className="oga-mon__product-eyebrow">Product</span>
          <h2 className="oga-mon__product-title">Monitor</h2>
          <p className="oga-mon__product-tagline">
            Watch a book of postcodes over time. The engine re-runs against
            stored signal periods; rows that cross your threshold come back
            as material changes. Wire those changes to a webhook in your
            stack and let your code react.
          </p>
        </div>
      </header>

      <LivePortfoliosSection
        portfolios={live ?? []}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        query={query}
        loading={loading}
        expanded={expanded}
        onToggle={toggle}
        onQueryChange={setQuery}
        onPageChange={setPage}
      />

      <div className="oga-mon__split">
        <CodeBlock />
        <SchemaPanel />
      </div>
    </div>
  );
}

function LoadingStrip() {
  return (
    <div className="oga-mon__loading" aria-hidden>
      <span className="oga-mon__skeleton" />
      <span className="oga-mon__skeleton" />
      <span className="oga-mon__skeleton" />
    </div>
  );
}

function LivePortfoliosSection({
  portfolios,
  total,
  page,
  pageSize,
  totalPages,
  query,
  loading,
  expanded,
  onToggle,
  onQueryChange,
  onPageChange,
}: {
  portfolios: LivePortfolio[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  loading: boolean;
  expanded: string | null;
  onToggle: (id: string) => void;
  onQueryChange: (q: string) => void;
  onPageChange: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <section className="oga-mon__live">
      <header className="oga-mon__toolbar">
        <div className="oga-mon__search">
          <span aria-hidden className="oga-mon__search-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search portfolios by name"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="oga-mon__search-input"
            aria-label="Search portfolios"
          />
        </div>
        <span className="oga-mon__count">
          {loading
            ? "Loading…"
            : total === 0
            ? query
              ? `No portfolios match "${query}"`
              : "No portfolios"
            : `Showing ${from}-${to} of ${total.toLocaleString()}`}
        </span>
      </header>

      {loading && portfolios.length === 0 ? (
        <LoadingStrip />
      ) : portfolios.length === 0 && query ? (
        <p className="oga-mon__no-match">
          Nothing matched. Try a different search term, or check the spelling.
        </p>
      ) : portfolios.length === 0 ? (
        <div className="oga-mon__empty">
          <p className="oga-mon__empty-title">No portfolios yet.</p>
          <p className="oga-mon__empty-body">
            Create one with{" "}
            <code>POST /v1/portfolios</code> from your code. Add areas to it
            with <code>POST /v1/portfolios/:id/areas</code>, then check for
            material change with{" "}
            <code>GET /v1/portfolios/:id/changes</code>.
          </p>
          <a
            href="/docs/api-reference"
            className="oga-mon__empty-link"
          >
            See the portfolio endpoints in the API reference →
          </a>
        </div>
      ) : (
        <ul className="oga-mon__list-compact">
          {portfolios.map((pf) => {
            const isOpen = expanded === pf.id;
            return (
              <li
                key={pf.id}
                className={
                  isOpen
                    ? "oga-mon-row oga-mon-row--open"
                    : "oga-mon-row"
                }
              >
                <button
                  type="button"
                  onClick={() => onToggle(pf.id)}
                  className="oga-mon-row__head"
                  aria-expanded={isOpen}
                >
                  <span className="oga-mon-row__avatar" aria-hidden>
                    {pf.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="oga-mon-row__name">{pf.name}</span>
                  <code className="oga-mon-row__id">{pf.id}</code>
                  <span className="oga-mon-row__areacount">
                    {pf.area_count} postcode{pf.area_count === 1 ? "" : "s"}
                  </span>
                  <span className="oga-mon-row__date">
                    Created {new Date(pf.created_at).toLocaleDateString()}
                  </span>
                  <span aria-hidden className="oga-mon-row__chev">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

            {isOpen ? (
              <div className="oga-mon-card__body">
                <section className="oga-mon-card__areas">
                  <h4 className="oga-mon-card__section-title">
                    Tracked areas
                  </h4>
                  {pf.areas.length === 0 ? (
                    <p className="oga-mon-card__empty">
                      This portfolio has no areas yet. Add some with{" "}
                      <code>POST /v1/portfolios/{pf.id}/areas</code>.
                    </p>
                  ) : (
                    <ul className="oga-mon-areas">
                      {pf.areas.map((a) => (
                        <li key={a.id} className="oga-mon-area">
                          <code className="oga-mon-area__pcode">{a.area}</code>
                          <span className="oga-mon-area__label">
                            {a.label ?? ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="oga-mon-card__changes">
                  <h4 className="oga-mon-card__section-title">
                    Recent material changes
                  </h4>
                  <p className="oga-mon-card__empty">
                    Check for changes via{" "}
                    <code>GET /v1/portfolios/{pf.id}/changes</code>. The
                    dashboard view of recent changes lands in a follow-up.
                  </p>
                </section>
              </div>
            ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="oga-mon__paginator">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="oga-mon__page-btn"
          >
            ← Previous
          </button>
          <span className="oga-mon__page-counter">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="oga-mon__page-btn"
          >
            Next →
          </button>
        </div>
      ) : null}
    </section>
  );
}


function CodeBlock() {
  const curl = `# Create a portfolio
curl https://api.onegoodarea.com/v1/portfolios \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '{ "name": "Your portfolio name", "areas": ["M1 1AE", "EC1A 1BB"] }'

# Check for material change since the last period
curl https://api.onegoodarea.com/v1/portfolios/$PORTFOLIO_ID/changes \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -G \\
  --data-urlencode "threshold_pct=5"`;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="oga-mon-code">
      <div className="oga-mon-code__head">
        <span className="oga-mon-code__path">
          POST /v1/portfolios · GET /v1/portfolios/<strong>:id</strong>/changes
        </span>
        <button
          type="button"
          onClick={copy}
          className="oga-mon-code__copy"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="oga-mon-code__pre">
        <code>{curl}</code>
      </pre>
      <p className="oga-mon-code__hint">
        Engine v{ENGINE_VERSION} stamped on every change row. Wire the
        response to a webhook with <code>POST /v1/webhooks</code> to push
        changes into your stack as they cross the threshold.
      </p>
    </div>
  );
}

function SchemaPanel() {
  const rows: Array<{ field: string; type: string; desc: string }> = [
    { field: "Portfolio",       type: "",                  desc: "" },
    { field: "  .id",           type: "string",            desc: "Stable portfolio id." },
    { field: "  .name",         type: "string",            desc: "Display name." },
    { field: "  .area_count",   type: "number?",           desc: "Tracked areas in this portfolio." },
    { field: "  .created_at",   type: "string?",           desc: "ISO timestamp." },
    { field: "SignalChange",    type: "",                  desc: "" },
    { field: "  .signal_key",   type: "string",            desc: "Signal that moved." },
    { field: "  .area",         type: "string",            desc: "Tracked area string." },
    { field: "  .geo_code",     type: "string",            desc: "Resolved LSOA." },
    { field: "  .period_from",  type: "string",            desc: "Baseline period." },
    { field: "  .period_to",    type: "string",            desc: "Comparison period." },
    { field: "  .pct_change",   type: "number | null",     desc: "Movement as a percentage." },
    { field: "  .direction",    type: "up | down | flat",  desc: "Sign of the move." },
    { field: "  .material",     type: "boolean",           desc: "True when |pct| >= threshold." },
  ];

  return (
    <div className="oga-mon-schema">
      <header className="oga-mon-schema__head">
        <span className="oga-mon-schema__eyebrow">Monitor schema</span>
        <p className="oga-mon-schema__hint">
          The two payload shapes the Monitor product returns: portfolio
          summaries from <code>/v1/portfolios</code> and material change
          rows from <code>/changes</code>.
        </p>
      </header>
      <ul className="oga-mon-schema__rows">
        {rows.map((r) => (
          <li key={r.field}>
            <code className="oga-mon-schema__field">{r.field}</code>
            <code className="oga-mon-schema__type">{r.type}</code>
            <span className="oga-mon-schema__desc">{r.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
