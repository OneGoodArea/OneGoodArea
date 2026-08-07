"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ChangeReport,
  Portfolio,
  PortfolioDetail,
  PortfolioEnrichItem,
} from "@/lib/showcase/types";
import { formatPercentage, UK_POSTCODE_RE } from "./constants";

/** Client-imposed cap on tracked areas per portfolio (clear in the UI). */
const MAX_AREAS = 10;
const DEMO_PORTFOLIO_NAME = "Demo portfolio";

interface MonitorTabProps {
  postcode?: string;
}

async function bff<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function MonitorTab({ postcode = "" }: MonitorTabProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [enrichments, setEnrichments] = useState<PortfolioEnrichItem[] | null>(null);
  const [changes, setChanges] = useState<ChangeReport | null>(null);
  const [areaInput, setAreaInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** Load a portfolio's areas and (re)score them. */
  const selectAndLoad = useCallback(async (id: string) => {
    setError(null);
    setChanges(null);
    setBusy("scoring");
    try {
      const p = await bff<PortfolioDetail>(`/api/showcase/portfolios/${id}`);
      setDetail(p);
      if (p.areas.length > 0) {
        const items = await bff<{ results: PortfolioEnrichItem[] }>(
          `/api/showcase/portfolios/${id}/enrich`,
          { method: "POST", body: JSON.stringify({}) },
        );
        setEnrichments(items.results);
      } else {
        setEnrichments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await bff<{ portfolios: Portfolio[] }>("/api/showcase/portfolios");
        if (cancelled) return;
        setPortfolios(list.portfolios);
        const first = list.portfolios[0]?.id ?? null;
        setSelectedId(first);
        if (first) {
          const p = await bff<PortfolioDetail>(`/api/showcase/portfolios/${first}`);
          if (cancelled) return;
          setDetail(p);
          if (p.areas.length > 0) {
            const items = await bff<{ results: PortfolioEnrichItem[] }>(
              `/api/showcase/portfolios/${first}/enrich`,
              { method: "POST", body: JSON.stringify({}) },
            );
            if (cancelled) return;
            setEnrichments(items.results);
          } else {
            setEnrichments([]);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load portfolios.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshList() {
    const list = await bff<{ portfolios: Portfolio[] }>("/api/showcase/portfolios");
    setPortfolios(list.portfolios);
    return list.portfolios;
  }

  async function handleAddArea(areaRaw: string) {
    const area = areaRaw.trim().toUpperCase();
    if (!UK_POSTCODE_RE.test(area)) {
      setError("Please enter a valid UK postcode (e.g. M21 9PN).");
      return;
    }
    if (detail && detail.areas.length >= MAX_AREAS) {
      setError(`This portfolio is full (max ${MAX_AREAS} areas).`);
      return;
    }
    setError(null);
    setNotice(null);
    let targetId = selectedId;
    try {
      if (!targetId) {
        setBusy("creating");
        const created = await bff<Portfolio>("/api/showcase/portfolios", {
          method: "POST",
          body: JSON.stringify({ name: DEMO_PORTFOLIO_NAME }),
        });
        targetId = created.id;
        setSelectedId(targetId);
      }
      setBusy("adding");
      const res = await bff<{ added: number; portfolio: PortfolioDetail }>(
        `/api/showcase/portfolios/${targetId}/areas`,
        { method: "POST", body: JSON.stringify({ areas: [{ area }] }) },
      );
      setDetail(res.portfolio);
      setAreaInput("");
      setBusy("scoring");
      const items = await bff<{ results: PortfolioEnrichItem[] }>(
        `/api/showcase/portfolios/${targetId}/enrich`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setEnrichments(items.results);
      setNotice(
        res.added > 0
          ? `Added ${area}.`
          : `${area} is already in this portfolio.`,
      );
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add area.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(area: string) {
    if (!selectedId) return;
    setBusy("removing");
    setError(null);
    try {
      await bff(`/api/showcase/portfolios/${selectedId}/areas/${encodeURIComponent(area)}`, {
        method: "DELETE",
      });
      await selectAndLoad(selectedId);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove area.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setBusy("deleting");
    setError(null);
    try {
      await bff(`/api/showcase/portfolios/${selectedId}`, { method: "DELETE" });
      setDetail(null);
      setEnrichments(null);
      setChanges(null);
      setSelectedId(null);
      setConfirmDelete(false);
      const list = await refreshList();
      const next = list[0]?.id ?? null;
      setSelectedId(next);
      if (next) await selectAndLoad(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete portfolio.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRefreshScores() {
    if (!selectedId) return;
    setBusy("scoring");
    setError(null);
    try {
      const items = await bff<{ results: PortfolioEnrichItem[] }>(
        `/api/showcase/portfolios/${selectedId}/enrich`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setEnrichments(items.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score portfolio.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCheckChanges() {
    if (!selectedId) return;
    setBusy("checking");
    setError(null);
    try {
      const report = await bff<ChangeReport>(`/api/showcase/portfolios/${selectedId}/changes`);
      setChanges(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check changes.");
    } finally {
      setBusy(null);
    }
  }

  const tracked = new Set((detail?.areas ?? []).map((a) => a.area.toUpperCase()));
  const atCap = (detail?.areas.length ?? 0) >= MAX_AREAS;
  const showShortcut = !!postcode && !tracked.has(postcode.toUpperCase()) && !atCap;

  return (
    <div className="prx-monitor">
      {loading && (
        <p className="prx-scores__loading">
          <span className="prx-spinner" aria-hidden />
          Loading portfolios…
        </p>
      )}
      {error && <p className="prx-scores__error">{error}</p>}
      {notice && <p className="prx-monitor__notice">{notice}</p>}

      {!loading && (
        <>
          <div className="prx-monitor__toolbar">
            <label className="prx-monitor__select-label" htmlFor="prx-monitor-portfolio">
              Portfolio
            </label>
            <select
              id="prx-monitor-portfolio"
              className="prx-monitor__select"
              value={selectedId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setSelectedId(id);
                void selectAndLoad(id);
              }}
              disabled={portfolios.length === 0}
            >
              {portfolios.length === 0 && <option value="">No portfolio yet</option>}
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.area_count ?? 0} areas
                </option>
              ))}
            </select>
            {selectedId && (
              <button
                type="button"
                className="prx-monitor__btn prx-monitor__btn--danger"
                onClick={() => void handleDelete()}
                disabled={busy !== null}
              >
                {confirmDelete ? "Confirm delete?" : "Delete portfolio"}
              </button>
            )}
          </div>

          <form
            className="prx-monitor__add"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddArea(areaInput);
            }}
          >
            <label className="prx-monitor__add-label" htmlFor="prx-monitor-area">
              Track an area
            </label>
            <input
              id="prx-monitor-area"
              className="prx-postcode__input prx-monitor__add-input"
              type="text"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              placeholder="e.g. M21 9PN"
              disabled={busy !== null}
            />
            <button
              type="submit"
              className="prx-postcode__btn"
              disabled={busy !== null || atCap}
              title={atCap ? `Max ${MAX_AREAS} areas per portfolio` : undefined}
            >
              {busy === "adding" || busy === "creating" ? "Adding…" : "Add area"}
            </button>
            {showShortcut && (
              <button
                type="button"
                className="prx-monitor__btn"
                onClick={() => void handleAddArea(postcode)}
                disabled={busy !== null}
              >
                Add {postcode}
              </button>
            )}
          </form>

          {atCap && (
            <p className="prx-monitor__cap-note">
              Limit reached — a portfolio holds up to {MAX_AREAS} areas. Remove one to add more.
            </p>
          )}

          {detail && detail.areas.length > 0 && (
            <section className="prx-monitor__portfolio" aria-label="Tracked areas">
              <div className="prx-monitor__portfolio-head">
                <h4 className="prx-monitor__title">Tracked areas</h4>
                <span className="prx-monitor__cap">
                  {detail.areas.length}/{MAX_AREAS}
                  <span className="prx-monitor__cap-bar" aria-hidden>
                    <span
                      style={{ width: `${Math.min(100, (detail.areas.length / MAX_AREAS) * 100)}%` }}
                    />
                  </span>
                </span>
              </div>
              <ul className="prx-monitor__rows">
                {detail.areas.map((a) => {
                  const item = enrichments?.find((it) => it.area === a.area);
                  return (
                    <li key={a.id} className="prx-monitor__row">
                      <div className="prx-monitor__area">
                        <span className="prx-monitor__pc">{a.area}</span>
                        {a.label && <span className="prx-monitor__name">{a.label}</span>}
                      </div>
                      <div className="prx-monitor__row-right">
                        {busy === "scoring" && !item ? (
                          <span className="prx-monitor__score-cell prx-monitor__score-cell--pending">…</span>
                        ) : item?.error ? (
                          <span className="prx-monitor__score-cell prx-monitor__score-cell--error" title={item.error}>
                            n/a
                          </span>
                        ) : item?.score ? (
                          <span className="prx-monitor__score-cell">
                            <span className="prx-monitor__score-num">{item.score.score}</span>
                            <span className="prx-monitor__score-meta">{formatPercentage(item.score.confidence)}</span>
                          </span>
                        ) : (
                          <span className="prx-monitor__score-cell prx-monitor__score-cell--pending">—</span>
                        )}
                        <button
                          type="button"
                          className="prx-monitor__remove"
                          onClick={() => void handleRemove(a.area)}
                          disabled={busy !== null}
                          aria-label={`Remove ${a.area}`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="prx-monitor__btn"
                onClick={() => void handleRefreshScores()}
                disabled={busy !== null}
              >
                {busy === "scoring" ? "Scoring…" : "Refresh scores"}
              </button>
            </section>
          )}

          {!detail && portfolios.length === 0 && (
            <p className="prx-scores__hint">
              No portfolio yet. Add your first postcode above to create the demo
              portfolio — shared by everyone visiting this demo.
            </p>
          )}

          {detail && detail.areas.length === 0 && (
            <p className="prx-scores__hint">Add an area to start monitoring it.</p>
          )}

          <section className="prx-monitor__diff" aria-label="Change probe">
            <div className="prx-monitor__diff-head">
              <h4 className="prx-monitor__title">Changes since last snapshot</h4>
              <button
                type="button"
                className="prx-monitor__btn"
                onClick={() => void handleCheckChanges()}
                disabled={!selectedId || busy !== null}
              >
                {busy === "checking" ? "Checking…" : "Check changes"}
              </button>
            </div>
            {changes && changes.changes.length > 0 && (
              <ul className="prx-monitor__diff-list">
                {changes.changes.map((c, i) => (
                  <li key={i} className="prx-monitor__diff-row">
                    <span className="prx-monitor__diff-pc">{c.area}</span>
                    <span className="prx-monitor__diff-signal">{c.label ?? c.signal_key}</span>
                    <span className="prx-monitor__diff-period">
                      {c.period_from} → {c.period_to}
                    </span>
                    <span className="prx-monitor__diff-from">{c.value_from ?? "—"}</span>
                    <span className="prx-monitor__diff-arrow">→</span>
                    <span className="prx-monitor__diff-to">{c.value_to ?? "—"}</span>
                    <span className={`prx-monitor__dir prx-monitor__dir--${c.direction}`}>
                      {c.direction}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {changes && changes.changes.length === 0 && (
              <p className="prx-scores__hint">
                No material changes detected since the last snapshot.
              </p>
            )}
            {!changes && (
              <p className="prx-scores__hint">
                Run a probe to compare this portfolio against the previous period.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
