"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { ScoreResult, Score, Preset } from "@/lib/showcase/types";
import { INTENTS, INTENT_WORKFLOW } from "@onegoodarea/contracts";
import { WeightInput } from "./weight-input";

interface ShowcaseScoringProps {
  postcode?: string;
  initialResult?: ScoreResult;
}

function computeOverall(
  dimensions: Array<{ id: string; value: number; weight: number }>,
  customWeights: Map<string, number>,
): number {
  const totalWeight = dimensions.reduce((s, d) => s + (customWeights.get(d.id) ?? d.weight), 0) || 1;
  return Math.round(dimensions.reduce((s, d) => s + d.value * (customWeights.get(d.id) ?? d.weight), 0) / totalWeight);
}

export function ShowcaseScoring({ postcode, initialResult }: ShowcaseScoringProps) {
  const [preset, setPreset] = useState<Preset>(initialResult?.preset ?? "business");
  const [result, setResult] = useState<ScoreResult | null>(initialResult ?? null);
  const [customWeights, setCustomWeights] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postcode) return;
    const area = postcode;
    let cancelled = false;
    async function fetchScores() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/showcase/score", window.location.origin);
        url.searchParams.set("area", area);
        if (preset) url.searchParams.set("preset", preset);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if (!cancelled) {
          setResult(r);
          setCustomWeights(new Map());
        }
      } catch {
        if (!cancelled) setError("Failed to load scores.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchScores();
    return () => { cancelled = true; };
  }, [postcode, preset]);

  const switchPreset = useCallback((p: Preset) => {
    setPreset(p);
  }, []);

  const updateWeight = useCallback((dimId: string, weight: number) => {
    setCustomWeights((prev) => {
      const next = new Map(prev);
      const dim = result?.dimensions.find((d) => d.id === dimId);
      const defaultWeight = dim?.weight ?? 0;
      if (weight === defaultWeight) {
        next.delete(dimId);
      } else {
        next.set(dimId, weight);
      }
      return next;
    });
  }, [result]);

  const resetWeights = useCallback(() => {
    setCustomWeights(new Map());
  }, []);

  const overall = useMemo(() => {
    if (!result) return 0;
    return computeOverall(result.dimensions, customWeights);
  }, [result, customWeights]);

  const activePreset = result?.preset ?? preset;

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap" role="tablist" aria-label="Scoring preset">
        {INTENTS.map((intent) => (
          <button
            key={intent}
            role="tab"
            aria-selected={activePreset === intent}
            onClick={() => switchPreset(intent)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activePreset === intent
                ? "bg-blue-600 text-white"
                : "bg-[#1c1c22] text-[#8a8a96] hover:text-[#e4e4e8]"
            }`}
          >
            {INTENT_WORKFLOW[intent]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[#8a8a96]">Loading scores…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#e4e4e8]">Overall score</span>
            <span className="text-lg font-bold text-blue-400">{overall}</span>
          </div>

          <div className="space-y-3 mb-4">
            {result.dimensions.map((d) => (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#e4e4e8]">{d.name}</span>
                  <span className="text-xs font-mono text-[#3b82f6]">{d.value}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1c1c22] mb-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${(d.value / d.maxValue) * 100}%` }}
                  />
                </div>
                <WeightInput
                  label={d.name}
                  product={d.weight.toString()}
                  value={customWeights.get(d.id) ?? d.weight}
                  onChange={(v) => updateWeight(d.id, v)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetWeights}
              className="rounded border border-[#1c1c22] bg-[#0f0f12] px-3 py-1 text-xs text-[#8a8a96] hover:text-[#e4e4e8] transition-colors"
            >
              Reset to preset defaults
            </button>
            {customWeights.size > 0 && (
              <span className="text-xs text-[#8a8a96]">{customWeights.size} weight(s) overridden</span>
            )}
          </div>
        </>
      )}

      {!postcode && !result && (
        <p className="text-sm text-[#8a8a96]">Enter a postcode to see scoring weights.</p>
      )}
    </div>
  );
}