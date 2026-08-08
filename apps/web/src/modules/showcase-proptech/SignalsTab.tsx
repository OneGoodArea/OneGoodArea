"use client";

import type { Signal } from "@/lib/showcase/types";
import { SIGNAL_CATEGORY_LABELS } from "./constants";

function formatValue(s: Signal): string {
  if (s.value === null || s.value === undefined) return "N/A";
  if (typeof s.value === "number") return s.value.toLocaleString();
  return String(s.value);
}

function groupByCategory(signals: Signal[]): Record<string, Signal[]> {
  const groups: Record<string, Signal[]> = {};
  for (const s of signals) {
    const cat = s.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  }
  return groups;
}

interface SignalsTabProps {
  signals: Signal[];
}

export function SignalsTab({ signals }: SignalsTabProps) {
  const grouped = groupByCategory(signals);

  if (signals.length === 0) {
    return (
      <div className="prx-signals">
        <p className="prx-signals__hint">Enter a postcode to see area signals.</p>
      </div>
    );
  }

  return (
    <div className="prx-signals">
      <section className="prx-signals__grid" aria-label="Area signals">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="prx-signals__group">
            <h4 className="prx-signals__cat">
              {SIGNAL_CATEGORY_LABELS[category] ?? category}
            </h4>
            <ul className="prx-signals__list">
              {items.map((s) => (
                <li key={s.id} className="prx-signals__card">
                  <div className="prx-signals__row">
                    <span className="prx-signals__name">{s.name}</span>
                    <span className="prx-signals__value">{formatValue(s)}</span>
                  </div>
                  <p className="prx-signals__desc">{s.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
