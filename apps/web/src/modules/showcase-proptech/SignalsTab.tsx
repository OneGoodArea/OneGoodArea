"use client";

import type { Signal, TransactionsResult } from "@/lib/showcase/types";
import { LINEAGE, SIGNAL_CATEGORY_LABELS } from "./constants";

const priceFmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

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
  transactions: TransactionsResult | null;
}

export function SignalsTab({ signals, transactions }: SignalsTabProps) {
  const grouped = groupByCategory(signals);

  if (signals.length === 0 && !transactions) {
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

      {transactions && (
        <section className="prx-history" aria-label="Recent sales">
          <div className="prx-history__head">
            <h4 className="prx-history__title">Recent sales</h4>
            <span className="prx-history__meta">
              {transactions.transactionCount} ·{" "}
              {new Date(transactions.period.from).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}{" "}
              –{" "}
              {new Date(transactions.period.to).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <ul className="prx-history__list">
            {transactions.transactions.slice(0, 8).map((t) => (
              <li key={`${t.date}-${t.price}-${t.propertyType}`} className="prx-history__row">
                <span className="prx-history__date">{t.date}</span>
                <span className="prx-history__type">{t.propertyType}</span>
                <span className="prx-history__estate">{t.estateType}</span>
                <span className="prx-history__price">{priceFmt.format(t.price)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="prx-lineage" aria-label="Data lineage">
        <h4 className="prx-lineage__title">Where the numbers come from</h4>
        <ul className="prx-lineage__list">
          {LINEAGE.map((l) => (
            <li key={l.source} className="prx-lineage__item">
              <span className="prx-lineage__source">{l.source}</span>
              <span className="prx-lineage__note">{l.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
