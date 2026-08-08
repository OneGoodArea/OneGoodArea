"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ScoreResult, Signal, TransactionsResult } from "@/lib/showcase/types";
import { TABS, UK_POSTCODE_RE, type TabId } from "./constants";
import { SignalsTab } from "./SignalsTab";
import { ScoresTab } from "./ScoresTab";
import { PortfolioTab } from "./PortfolioTab";

interface ProptechShowcaseProps {
  initialPostcode?: string;
  initialSignals: Signal[];
  initialScore: ScoreResult | null;
  initialTransactions: TransactionsResult | null;
}

export function ProptechShowcase({
  initialPostcode,
  initialSignals,
  initialScore,
  initialTransactions,
}: ProptechShowcaseProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState(initialPostcode ?? "");
  const [activeTab, setActiveTab] = useState<TabId>("signals");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!UK_POSTCODE_RE.test(trimmed)) {
      setError("Please enter a valid UK postcode (e.g. M21 9PN)");
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/showcase/proptech?postcode=${encodeURIComponent(trimmed)}`);
    });
  }

  return (
    <div className="prx-showcase">
      <div className="prx-showcase__controls">
        <form onSubmit={handleSubmit} className="prx-postcode">
          <label htmlFor="prx-postcode" className="prx-postcode__label">
            UK Postcode
          </label>
          <input
            id="prx-postcode"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="e.g. M21 9PN"
            className="prx-postcode__input"
          />
          <button type="submit" className="prx-postcode__btn" disabled={isPending}>
            {isPending ? "Searching…" : "Search"}
          </button>
        </form>
        {error && <p className="prx-showcase__error">{error}</p>}
        {isPending && (
          <p className="prx-showcase__searching" role="status">
            <span className="prx-spinner prx-spinner--sm" aria-hidden />
            Searching {input.trim().toUpperCase()}…
          </p>
        )}
        {initialPostcode && !error && (
          <span className="prx-showcase__current">{initialPostcode}</span>
        )}
      </div>

      <div className="prx-tabs" role="tablist" aria-label="PropTech showcase">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`prx-tabs__tab${activeTab === tab.id ? " prx-tabs__tab--active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "signals" && (
        <SignalsTab
          signals={initialSignals}
          transactions={initialTransactions}
        />
      )}
      {activeTab === "scores" && (
        <ScoresTab postcode={initialPostcode ?? ""} initialResult={initialScore} />
      )}
      {activeTab === "portfolio" && <PortfolioTab postcode={initialPostcode ?? ""} />}
    </div>
  );
}
