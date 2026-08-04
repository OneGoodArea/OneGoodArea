"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Signal } from "@/lib/showcase/types";

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
}

export default function ShowcaseSignals({ initialSignals, initialPostcode }: Props) {
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
    router.push(`/showcase/proptech?postcode=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-8 flex gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="postcode" className="block text-sm text-[#8a8a96] mb-1">
            UK Postcode
          </label>
          <input
            id="postcode"
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null); }}
            placeholder="e.g. M1 1AE"
            className="w-full rounded border border-[#1c1c22] bg-[#09090b] px-3 py-2 text-sm text-[#e4e4e8] placeholder:text-[#555] focus:outline-none focus:border-[#3b82f6]"
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {signals.length === 0 ? (
        <p className="text-sm text-[#8a8a96]">
          {loading
            ? "Fetching live signals…"
            : "No signals found. Try a different postcode."}
        </p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-semibold text-[#e4e4e7] mb-3 uppercase tracking-wide">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <div className="grid gap-3">
              {items.map((s) => (
                <div key={s.id} className="rounded border border-[#1c1c22] bg-[#09090b] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#e4e4e8]">{s.name}</span>
                    <span className="text-xs font-mono text-[#3b82f6]">{formatValue(s)}</span>
                  </div>
                  <p className="text-xs text-[#8a8a96] mt-1">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
