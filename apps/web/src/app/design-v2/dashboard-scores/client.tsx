"use client";

/* AR-262 /dashboard/scores rewrite.

   Pedro flagged during AR-260 review: a workbench duplicates what
   the customer's code already does via /v1/score. The dashboard
   should manage objects + show stats, not perform actions. This
   client replaces the workbench with:
   - 4 built-in scoring profiles as reference (moving, business,
     investing, research)
   - Their org's saved scoring presets (Levers feature) with empty
     state when there are none
   - Per-preset call count over the last 30 days from
     api.score.computed activity_events
   - Code example showing how to call /v1/score with preset_id

   Data fetched client-side from /api/me/scoring-presets and
   /api/me/score-usage (same Neon SQL the dashboard already runs
   against for orgs + activity). */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "../_shared/app-shell";
import { ScoresIcon } from "../_shared/product-icons";
import { SCORING_PROFILES, type ProfileSlug } from "@/lib/scoring-profiles";
import "./client.css";

interface SavedPreset {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  base_preset: ProfileSlug;
  weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface UsageBreakdown {
  window_days: number;
  total: number;
  by_preset: Array<{ preset: string; count: number }>;
}

export default function ScoresPresetsClient() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

function Body() {
  const [presets, setPresets] = useState<SavedPreset[] | null>(null);
  const [usage, setUsage] = useState<UsageBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pRes, uRes] = await Promise.all([
          fetch("/api/me/scoring-presets", { cache: "no-store" }),
          fetch("/api/me/score-usage", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const pJson = pRes.ok ? await pRes.json() : { presets: [] };
        const uJson = uRes.ok
          ? await uRes.json()
          : { window_days: 30, total: 0, by_preset: [] };
        setPresets((pJson.presets as SavedPreset[]) ?? []);
        setUsage(uJson as UsageBreakdown);
      } catch {
        setPresets([]);
        setUsage({ window_days: 30, total: 0, by_preset: [] });
      } finally {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- final load flag
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Map "moving" / "business" / "investing" / "research" → call count
     over the last 30 days from the score-usage endpoint. Saved-preset
     calls use preset_id values that don't map cleanly here; surface
     those as a single "Saved presets" total. */
  const countsByBase = useMemo(() => {
    const out: Record<string, number> = {};
    let savedTotal = 0;
    if (usage) {
      const baseSlugs = new Set<string>(
        SCORING_PROFILES.map((p) => p.slug as string),
      );
      for (const row of usage.by_preset) {
        if (baseSlugs.has(row.preset)) {
          out[row.preset] = (out[row.preset] ?? 0) + row.count;
        } else {
          savedTotal += row.count;
        }
      }
    }
    return { byBase: out, savedTotal };
  }, [usage]);

  return (
    <div className="oga-scoresp">
      <header className="oga-scoresp__product">
        <span className="oga-scoresp__product-mark" aria-hidden>
          <ScoresIcon width={56} height={56} />
        </span>
        <div className="oga-scoresp__product-text">
          <span className="oga-scoresp__product-eyebrow">Product</span>
          <h2 className="oga-scoresp__product-title">Scores</h2>
          <p className="oga-scoresp__product-tagline">
            Manage the scoring profiles your code calls against. Four
            built-in profiles are always available. Save your own as named
            presets at the org level and reference them by{" "}
            <code>preset_id</code> on every <code>/v1/score</code> call.
          </p>
        </div>
      </header>

      <UsageStrip
        usage={usage}
        countsByBase={countsByBase.byBase}
        savedTotal={countsByBase.savedTotal}
      />

      <BuiltInProfiles countsByBase={countsByBase.byBase} />

      <SavedPresets presets={presets} loading={loading} />

      <div className="oga-scoresp__split">
        <CodeBlock />
        <SchemaPanel />
      </div>
    </div>
  );
}

/* ============================================================
   Usage strip: total + per-preset breakdown
   ============================================================ */

function UsageStrip({
  usage,
  countsByBase,
  savedTotal,
}: {
  usage: UsageBreakdown | null;
  countsByBase: Record<string, number>;
  savedTotal: number;
}) {
  const total = usage?.total ?? 0;
  return (
    <section className="oga-scoresp-usage">
      <header className="oga-scoresp-usage__head">
        <span className="oga-scoresp-usage__eyebrow">
          Score calls · last {usage?.window_days ?? 30} days
        </span>
        <span className="oga-scoresp-usage__total">
          {total.toLocaleString()}
        </span>
      </header>
      <div className="oga-scoresp-usage__row">
        {SCORING_PROFILES.map((p) => {
          const c = countsByBase[p.slug] ?? 0;
          return (
            <div key={p.slug} className="oga-scoresp-usage__cell">
              <span className="oga-scoresp-usage__cell-label">{p.name}</span>
              <span className="oga-scoresp-usage__cell-value">
                {c.toLocaleString()}
              </span>
              <span className="oga-scoresp-usage__cell-slug">
                preset: {p.slug}
              </span>
            </div>
          );
        })}
        <div className="oga-scoresp-usage__cell oga-scoresp-usage__cell--saved">
          <span className="oga-scoresp-usage__cell-label">Saved presets</span>
          <span className="oga-scoresp-usage__cell-value">
            {savedTotal.toLocaleString()}
          </span>
          <span className="oga-scoresp-usage__cell-slug">
            calls via preset_id
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Built-in profiles (reference)
   ============================================================ */

function BuiltInProfiles({
  countsByBase,
}: {
  countsByBase: Record<string, number>;
}) {
  return (
    <section className="oga-scoresp-section">
      <header className="oga-scoresp-section__head">
        <h3 className="oga-scoresp-section__title">Built-in profiles</h3>
        <p className="oga-scoresp-section__hint">
          Four profiles ship with the engine, each with its own five-
          dimension set. Pass <code>preset</code> on /v1/score to use any
          of them as-is.
        </p>
      </header>
      <ul className="oga-scoresp-profiles">
        {SCORING_PROFILES.map((p) => {
          const Glyph = p.Glyph;
          const count = countsByBase[p.slug] ?? 0;
          return (
            <li key={p.slug} className="oga-scoresp-profile">
              <span className="oga-scoresp-profile__glyph" aria-hidden>
                <Glyph />
              </span>
              <div className="oga-scoresp-profile__body">
                <span className="oga-scoresp-profile__name">{p.name}</span>
                <span className="oga-scoresp-profile__use">{p.use}</span>
              </div>
              <div className="oga-scoresp-profile__meta">
                <code className="oga-scoresp-profile__slug">{p.slug}</code>
                <span className="oga-scoresp-profile__count">
                  {count.toLocaleString()} calls
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============================================================
   Saved presets (org-level Levers feature)
   ============================================================ */

function SavedPresets({
  presets,
  loading,
}: {
  presets: SavedPreset[] | null;
  loading: boolean;
}) {
  return (
    <section className="oga-scoresp-section">
      <header className="oga-scoresp-section__head">
        <h3 className="oga-scoresp-section__title">Your saved presets</h3>
        <p className="oga-scoresp-section__hint">
          Named recipes saved against your org. Each one wraps a built-in
          profile with its own weights. Reference one on a call by passing{" "}
          <code>preset_id</code> instead of <code>preset</code>.
        </p>
      </header>

      {loading ? (
        <div className="oga-scoresp-saved oga-scoresp-saved--loading" aria-hidden>
          <span className="oga-scoresp-skeleton oga-scoresp-skeleton--name" />
          <span className="oga-scoresp-skeleton oga-scoresp-skeleton--row" />
          <span className="oga-scoresp-skeleton oga-scoresp-skeleton--row" />
        </div>
      ) : presets && presets.length === 0 ? (
        <div className="oga-scoresp-saved oga-scoresp-saved--empty">
          <p className="oga-scoresp-saved__empty-title">
            No saved presets yet.
          </p>
          <p className="oga-scoresp-saved__empty-body">
            Save a recipe with{" "}
            <code>POST /v1/orgs/:id/presets</code> from your code, or wait
            for the upcoming Levers UI to land. Saved presets sit on top of
            the four built-in profiles and let you pin a custom weights
            recipe for repeat use.
          </p>
          <Link
            href="/docs/api-reference#presets"
            className="oga-scoresp-saved__empty-link"
          >
            Read the presets docs →
          </Link>
        </div>
      ) : (
        <ul className="oga-scoresp-saved__list">
          {(presets ?? []).map((preset) => (
            <li key={preset.id} className="oga-scoresp-saved-row">
              <div className="oga-scoresp-saved-row__head">
                <span className="oga-scoresp-saved-row__name">
                  {preset.name}
                </span>
                <code className="oga-scoresp-saved-row__slug">
                  preset_id: {preset.slug}
                </code>
              </div>
              <div className="oga-scoresp-saved-row__meta">
                <span>
                  base:{" "}
                  <code className="oga-scoresp-saved-row__base">
                    {preset.base_preset}
                  </code>
                </span>
                <span>
                  weights: <code>{summariseWeights(preset.weights)}</code>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function summariseWeights(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  if (entries.length === 0) return "{}";
  return entries.map(([k, v]) => `${k}=${v}`).join(", ");
}

/* ============================================================
   Code example + schema reference
   ============================================================ */

function CodeBlock() {
  const curl = `# Call /v1/score with one of the four built-in profiles
curl https://api.onegoodarea.com/v1/score \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '{ "area": "SW1A 1AA", "preset": "research" }'

# ... or call it with one of your org's saved presets
curl https://api.onegoodarea.com/v1/score \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '{ "area": "SW1A 1AA", "preset_id": "your-saved-slug" }'`;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="oga-scoresp-code">
      <div className="oga-scoresp-code__head">
        <span className="oga-scoresp-code__path">
          POST /v1/score · with <strong>preset</strong> or{" "}
          <strong>preset_id</strong>
        </span>
        <button
          type="button"
          onClick={copy}
          className="oga-scoresp-code__copy"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="oga-scoresp-code__pre">
        <code>{curl}</code>
      </pre>
      <p className="oga-scoresp-code__hint">
        <code>preset</code> and <code>preset_id</code> are mutually
        exclusive. Pass <code>weights</code> alongside <code>preset</code>{" "}
        to override per request without saving.
      </p>
    </div>
  );
}

function SchemaPanel() {
  const rows: Array<{ field: string; type: string; desc: string }> = [
    { field: "ScoringPreset",  type: "",                                       desc: "" },
    { field: "  .id",          type: "string",                                 desc: "Stable preset id." },
    { field: "  .org_id",      type: "string",                                 desc: "Owning org." },
    { field: "  .slug",        type: "string",                                 desc: "Reference slug used as preset_id." },
    { field: "  .name",        type: "string",                                 desc: "Display name." },
    { field: "  .base_preset", type: "moving | business | investing | research", desc: "Which dimension set." },
    { field: "  .weights",     type: "Record<dim_key, number>",                desc: "Per-dimension weights." },
    { field: "  .created_at",  type: "string",                                 desc: "ISO timestamp." },
    { field: "ScoreResult",    type: "",                                       desc: "Returned by /v1/score." },
    { field: "  .score",       type: "number 0-100",                           desc: "Composite." },
    { field: "  .dimensions",  type: "ScoreDimension[]",                       desc: "5 weighted components." },
    { field: "  .confidence",  type: "number 0-1",                             desc: "Aggregate confidence." },
    { field: "  .weights_source", type: "preset | custom",                     desc: "Whether overrides were used." },
    { field: "  .engine_version", type: "string",                              desc: "Methodology version." },
  ];

  return (
    <div className="oga-scoresp-schema">
      <header className="oga-scoresp-schema__head">
        <span className="oga-scoresp-schema__eyebrow">Scoring schema</span>
        <p className="oga-scoresp-schema__hint">
          The two shapes the Scores product cares about: presets you
          manage at the org level and the response your code consumes.
        </p>
      </header>
      <ul className="oga-scoresp-schema__rows">
        {rows.map((r) => (
          <li key={r.field}>
            <code className="oga-scoresp-schema__field">{r.field}</code>
            <code className="oga-scoresp-schema__type">{r.type}</code>
            <span className="oga-scoresp-schema__desc">{r.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
