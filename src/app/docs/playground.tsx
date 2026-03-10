"use client";

import { useState } from "react";
import { Play, Loader2, ChevronDown } from "lucide-react";

const SAMPLE_AREAS = [
  { postcode: "SW1A 1AA", label: "Westminster, London", type: "Urban" },
  { postcode: "E1 6AN", label: "Shoreditch, London", type: "Urban" },
  { postcode: "M1 1AD", label: "Manchester Centre", type: "Urban" },
  { postcode: "OX1 1DP", label: "Oxford", type: "Suburban" },
  { postcode: "BS1 1HT", label: "Bristol Centre", type: "Urban" },
  { postcode: "BA6 8AA", label: "Glastonbury", type: "Rural" },
];

const INTENTS = ["moving", "investing", "business", "research"] as const;

interface SubScore {
  label: string;
  score: number;
  weight: number;
  summary: string;
}

interface PlaygroundResult {
  area: string;
  areaiq_score: number;
  sub_scores: SubScore[];
  summary: string;
  data_sources: string[];
  area_type?: string;
}

function ScoreColor(score: number) {
  if (score >= 70) return "var(--neon-green)";
  if (score >= 45) return "var(--neon-amber)";
  return "var(--neon-red)";
}

export function ApiPlayground() {
  const [area, setArea] = useState(SAMPLE_AREAS[0].postcode);
  const [intent, setIntent] = useState<string>("moving");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawJson, setRawJson] = useState<string>("");

  async function runQuery() {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowRaw(false);

    try {
      const res = await fetch(`/api/widget?postcode=${encodeURIComponent(area)}&intent=${intent}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setResult({
        area: data.area || area,
        areaiq_score: data.score ?? 0,
        sub_scores: data.dimensions || [],
        summary: data.summary || "",
        data_sources: data.data_sources || [],
        area_type: data.area_type,
      });
      setRawJson(JSON.stringify(data, null, 2));
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
        <div className="flex items-center gap-2">
          <Play size={12} style={{ color: "var(--neon-green)" }} />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--neon-green)" }}>
            Try it live
          </span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          No API key required
        </span>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* Area selector */}
          <div className="flex-1">
            <label className="block text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
              Area
            </label>
            <div className="relative">
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full h-9 px-3 pr-8 text-[12px] font-mono border outline-none cursor-pointer appearance-none"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {SAMPLE_AREAS.map((a) => (
                  <option key={a.postcode} value={a.postcode}>
                    {a.postcode} — {a.label} ({a.type})
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>

          {/* Intent selector */}
          <div className="sm:w-[160px]">
            <label className="block text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
              Intent
            </label>
            <div className="relative">
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full h-9 px-3 pr-8 text-[12px] font-mono border outline-none cursor-pointer appearance-none"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {INTENTS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={runQuery}
            disabled={loading}
            className="h-9 px-6 flex items-center justify-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            style={{ background: "var(--neon-green)", color: "#000" }}
          >
            {loading ? (
              <><Loader2 size={12} className="animate-spin" /> Running...</>
            ) : (
              <><Play size={11} /> Run</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="px-5 py-4" style={{ background: "var(--bg)", minHeight: "120px" }}>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--neon-green)" }} />
              <span className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                Fetching live data from 5 sources...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="py-4">
            <div className="text-[11px] font-mono px-3 py-2 border" style={{ color: "var(--neon-red)", borderColor: "var(--neon-red-dim)", background: "var(--neon-red-dim)" }}>
              {error}
            </div>
          </div>
        )}

        {!loading && !error && !result && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              Select an area and click Run to see a live API response
            </span>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Score header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {result.area}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono uppercase" style={{ color: "var(--text-tertiary)" }}>
                    {intent}
                  </span>
                  {result.area_type && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5" style={{ color: "var(--text-tertiary)", background: "var(--bg-active)" }}>
                      {result.area_type}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[28px] font-mono font-bold" style={{ color: ScoreColor(result.areaiq_score) }}>
                  {result.areaiq_score}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  AreaIQ Score
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              {result.sub_scores.map((dim) => (
                <div key={dim.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{dim.label}</span>
                      <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>{dim.weight}%</span>
                    </div>
                    <span className="text-[12px] font-mono font-semibold" style={{ color: ScoreColor(dim.score) }}>
                      {dim.score}
                    </span>
                  </div>
                  <div className="h-1 w-full" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${dim.score}%`, background: ScoreColor(dim.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {result.summary && (
              <p className="text-[11px] leading-relaxed pt-2" style={{ color: "var(--text-tertiary)" }}>
                {result.summary}
              </p>
            )}

            {/* Data sources */}
            {result.data_sources.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Sources:</span>
                {result.data_sources.map((s) => (
                  <span key={s} className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--text-secondary)", background: "var(--bg-active)" }}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Raw JSON toggle */}
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <ChevronDown size={10} style={{ transform: showRaw ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                {showRaw ? "Hide" : "Show"} raw JSON response
              </button>
              {showRaw && (
                <pre
                  className="mt-2 text-[10px] font-mono p-3 overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {rawJson}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
