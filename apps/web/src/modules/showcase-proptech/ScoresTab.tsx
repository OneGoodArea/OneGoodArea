"use client";

import { useEffect, useState } from "react";
import { INTENTS } from "@onegoodarea/contracts";
import type { Preset, ScoreResult } from "@/lib/showcase/types";
import { PRESET_LABELS } from "./constants";
import { remember } from "./cache";

interface ScoresTabProps {
  postcode: string;
  initialResult: ScoreResult | null;
}

export function ScoresTab({ postcode, initialResult }: ScoresTabProps) {
  const [preset, setPreset] = useState<Preset>(initialResult?.preset ?? "business");
  const [result, setResult] = useState<ScoreResult | null>(initialResult ?? null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postcode) return;
    let cancelled = false;
    async function fetchScore() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/showcase/score", window.location.origin);
        url.searchParams.set("area", postcode);
        url.searchParams.set("preset", preset);
        const res = await fetch(url.toString());
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) setError(body?.error ?? `HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as ScoreResult;
        if (!cancelled) {
          setResult(await remember(data));
          setExplainOpen(false);
        }
      } catch {
        if (!cancelled) setError("Failed to load scores.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchScore();
    return () => {
      cancelled = true;
    };
  }, [postcode, preset]);

  return (
    <div className="prx-scores">
      <div className="prx-scores__presets" role="tablist" aria-label="Scoring preset">
        {INTENTS.map((intent) => (
          <button
            key={intent}
            type="button"
            role="tab"
            aria-selected={preset === intent}
            onClick={() => setPreset(intent)}
            className={`prx-chip${preset === intent ? " prx-chip--active" : ""}`}
          >
            {PRESET_LABELS[intent] ?? intent}
          </button>
        ))}
      </div>

      {loading && (
        <p className="prx-scores__loading">
          <span className="prx-spinner" aria-hidden />
          Loading scores…
        </p>
      )}
      {error && <p className="prx-scores__error">{error}</p>}

      {!loading && !error && !result && !postcode && (
        <p className="prx-scores__hint">Enter a postcode to see scoring.</p>
      )}

      {!loading && !error && result && (
        <>
          <div className="prx-scores__overall">
            <div
              className="prx-scores__ring"
              style={{ "--prx-ring": result.score } as React.CSSProperties}
              aria-hidden
            >
              <span className="prx-scores__ring-num">{result.score}</span>
              <span className="prx-scores__ring-max">/100</span>
            </div>
            <div className="prx-scores__overall-copy">
              <span className="prx-scores__overall-label">Area score</span>
              <span className="prx-scores__overall-meta">
                {PRESET_LABELS[result.preset] ?? result.preset} weighting ·{" "}
                {result.confidence}% confidence
              </span>
            </div>
          </div>

          <ul className="prx-scores__dims">
            {result.dimensions.map((d) => (
              <li key={d.id} className="prx-scores__dim">
                <div className="prx-scores__dim-head">
                  <span className="prx-scores__dim-name">{d.name}</span>
                  <span className="prx-scores__dim-score">{d.value}</span>
                </div>
                <div className="prx-scores__dim-bar" aria-hidden>
                  <span
                    className="prx-scores__dim-fill"
                    style={{ width: `${(d.value / d.maxValue) * 100}%` }}
                  />
                </div>
                <div className="prx-scores__dim-meta">
                  <span>weight {d.weight}%</span>
                  <span>confidence {d.confidence}%</span>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="prx-scores__explain-toggle"
            onClick={() => setExplainOpen((open) => !open)}
            aria-expanded={explainOpen}
          >
            {explainOpen ? "Hide" : "Why this score?"}
          </button>
          {explainOpen && (
            <p className="prx-scores__explain">
              Each dimension is a country-scoped percentile. The score is the
              weighted mean of those percentiles, normalised to 100. Weights come
              from the selected preset, or a custom weighting if you bring one.
              Confidence reflects how recent and complete the underlying sources
              were at capture.
            </p>
          )}
        </>
      )}
    </div>
  );
}
