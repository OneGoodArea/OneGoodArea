"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { ScoreResult, Score, Preset } from "@/lib/showcase/types";
import { INTENTS, INTENT_WORKFLOW, type Intent } from "@onegoodarea/contracts";
import { WeightInput } from "./weight-input";
import type { ApiError } from "@/lib/showcase/api";

interface ShowcaseScoringProps {
  postcode?: string;
  initialResult?: ScoreResult;
  apiError?: ApiError | null;
  intentLabels?: Partial<Record<Intent, string>>;
}

type ClientError = Pick<ApiError, "status" | "message" | "body">;

function computeOverall(
  dimensions: Array<{ id: string; value: number; weight: number }>,
  customWeights: Map<string, number>,
): number {
  const totalWeight = dimensions.reduce((s, d) => s + (customWeights.get(d.id) ?? d.weight), 0) || 1;
  return Math.round(dimensions.reduce((s, d) => s + d.value * (customWeights.get(d.id) ?? d.weight), 0) / totalWeight);
}

export function ShowcaseScoring({ postcode, initialResult, apiError, intentLabels }: ShowcaseScoringProps) {
  const [preset, setPreset] = useState<Preset>(initialResult?.preset ?? "business");
  const [result, setResult] = useState<ScoreResult | null>(initialResult ?? null);
  const [customWeights, setCustomWeights] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<ClientError | null>(null);

  useEffect(() => {
    if (!postcode) return;
    const area = postcode;
    let cancelled = false;
    async function fetchScores() {
      setLoading(true);
      setError(null);
      setClientError(null);
      try {
        const url = new URL("/api/showcase/score", window.location.origin);
        url.searchParams.set("area", area);
        if (preset) url.searchParams.set("preset", preset);
        const res = await fetch(url.toString());
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
          const message = (body?.error as string | undefined) ?? res.statusText;
          if (!cancelled) setClientError({ status: res.status, message, body });
          return;
        }
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

  const activeError = clientError ?? apiError;

  const switchPreset = useCallback((p: Preset) => {
    setPreset(p);
  }, []);

  const updateWeight = useCallback((dimId: string, weight: number) => {
    const clamped = Math.min(100, Math.max(0, weight));
    setCustomWeights((prev) => {
      const next = new Map(prev);
      const dim = result?.dimensions.find((d) => d.id === dimId);
      const defaultWeight = dim?.weight ?? 0;
      if (clamped === defaultWeight) {
        next.delete(dimId);
      } else {
        next.set(dimId, clamped);
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

  const totalWeight = useMemo(() => {
    if (!result) return 0;
    return result.dimensions.reduce((s, d) => s + (customWeights.get(d.id) ?? d.weight), 0);
  }, [result, customWeights]);

  const activePreset = result?.preset ?? preset;

  function renderApiError(err: ApiError | ClientError) {
    if (err.status === 404) {
      const terminated = err.body?.terminated as
        | { year_terminated: number; month_terminated: number }
        | undefined;
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-[#E3000F]">Postcode not found</p>
          {terminated ? (
            <p className="text-xs text-red-600/80 mt-1">
              This postcode was terminated in {terminated.month_terminated}/{terminated.year_terminated}.
              It is no longer a valid UK postcode.
            </p>
          ) : (
            <p className="text-xs text-red-600/80 mt-1">
              No area data found for this postcode. Check the spelling or try a different postcode.
            </p>
          )}
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-[#E3000F]">API error</p>
        <p className="text-xs text-red-600/80 mt-1">{err.message}</p>
      </div>
    );
  }

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
                ? "bg-[#003087] text-white"
                : "bg-slate-100 text-slate-600 hover:text-[#003087]"
            }`}
          >
            {intentLabels?.[intent] ?? INTENT_WORKFLOW[intent]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading scores…</p>}
      {error && <p className="text-sm text-[#E3000F]">{error}</p>}

      {activeError ? (
        renderApiError(activeError)
      ) : result ? (
        <>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700">Overall score</span>
            <span className="text-3xl font-bold text-[#003087]">{overall}</span>
          </div>

          <div className="flex items-center justify-between mb-6 pb-2">
            <span className="text-sm text-slate-500">Total weight</span>
            <span className="text-sm font-mono text-slate-600">{totalWeight}%</span>
          </div>

          <div className="space-y-4 mb-4">
            {result.dimensions.map((d) => (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700">{d.name}</span>
                  <span className="text-xs font-mono text-slate-500">Score {d.value}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 mb-3">
                  <div
                    className="h-2 rounded-full bg-[#003087]"
                    style={{ width: `${(d.value / d.maxValue) * 100}%` }}
                  />
                </div>
                <WeightInput
                  label={d.name}
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:text-[#003087] transition-colors"
            >
              Reset to preset defaults
            </button>
            {customWeights.size > 0 && (
              <span className="text-xs text-slate-400">{customWeights.size} weight(s) overridden</span>
            )}
          </div>
        </>
      ) : (
        !postcode && (
          <p className="text-sm text-slate-500">Enter a postcode to see scoring weights.</p>
        )
      )}
    </div>
  );
}