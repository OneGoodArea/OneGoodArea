"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Signal } from "@/lib/showcase/types";
import type { ApiError } from "@/lib/showcase/api";

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

const CATEGORY_LABELS: Record<string, string> = {
  crime: "Crime & Safety",
  deprivation: "Deprivation",
  property: "Property Market",
  schools: "Schools & Education",
  transport: "Transport & Connectivity",
  environment: "Environment & Flood Risk",
};

function groupByCategory(signals: Signal[]): Record<string, Signal[]> {
  const groups: Record<string, Signal[]> = {};
  for (const s of signals) {
    const cat = s.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  }
  return groups;
}

function formatValue(s: Signal): string {
  if (s.value === null || s.value === undefined) return "N/A";
  if (typeof s.value === "number") return s.value.toLocaleString();
  return String(s.value);
}

interface Props {
  initialSignals: Signal[];
  initialPostcode?: string;
  apiError?: ApiError | null;
}

export default function ShowcaseSignals({ initialSignals, initialPostcode, apiError }: Props) {
  const router = useRouter();
  const [input, setInput] = useState(initialPostcode ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevPostcode, setPrevPostcode] = useState(initialPostcode);

  if (prevPostcode !== initialPostcode) {
    setPrevPostcode(initialPostcode);
    setLoading(false);
    setError(null);
  }

  const signals = initialSignals;
  const grouped = groupByCategory(signals);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!UK_POSTCODE_RE.test(trimmed)) {
      setError("Please enter a valid UK postcode (e.g. M1 1AE)");
      return;
    }
    if (trimmed === initialPostcode) {
      return;
    }
    setError(null);
    setLoading(true);
    router.push(`/showcase/estate-agents?postcode=${encodeURIComponent(trimmed)}`);
  }

  function renderErrorState() {
    if (apiError?.status === 404) {
      const terminated = apiError.body?.terminated as
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
    if (apiError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-[#E3000F]">API error</p>
          <p className="text-xs text-red-600/80 mt-1">{apiError.message}</p>
        </div>
      );
    }
    return (
      <p className="text-sm text-slate-500">
        {loading
          ? "Fetching live signals…"
          : "No signals found. Try a different postcode."}
      </p>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-8 flex gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="postcode" className="block text-sm text-slate-600 mb-1">
            UK Postcode
          </label>
          <input
            id="postcode"
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null); }}
            placeholder="e.g. M1 1AE"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#003087] focus:ring-1 focus:ring-[#003087]/20"
          />
          {error && <p className="text-xs text-[#E3000F] mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#003087] px-4 py-2 text-sm font-medium text-white hover:bg-[#00256a] disabled:opacity-50 transition"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {apiError ? (
        renderErrorState()
      ) : signals.length === 0 ? (
        <p className="text-sm text-slate-500">
          {loading
            ? "Fetching live signals…"
            : "No signals found. Try a different postcode."}
        </p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <div className="grid gap-3">
              {items.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{s.name}</span>
                    <span className="text-xs font-mono text-[#003087]">{formatValue(s)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
