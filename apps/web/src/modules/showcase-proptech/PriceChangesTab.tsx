"use client";

import type { ForecastResult, Signal, TransactionsResult } from "@/lib/showcase/types";

const priceFmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

interface PriceChangesTabProps {
  signals: Signal[];
  forecast: ForecastResult | null;
  transactions: TransactionsResult | null;
}

function pctValue(signals: Signal[]): number | null {
  const s = signals.find((x) => x.id === "property.price_change_pct");
  return typeof s?.value === "number" ? s.value : null;
}

function medianValue(signals: Signal[]): number | null {
  const s = signals.find((x) => x.id === "property.median_price");
  return typeof s?.value === "number" ? s.value : null;
}

/* Static SVG line + confidence band for the forecast points. Pure SVG, no
   chart lib; sized to the parent via width:100% + viewBox. */
function ForecastChart({ forecast }: { forecast: ForecastResult }) {
  const pts = forecast.points;
  if (pts.length === 0) return null;

  const values = pts.flatMap((p) => [p.projected_value, p.lower_bound, p.upper_bound]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const W = 600;
  const H = 180;

  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.projected_value).toFixed(1)}`).join(" ");
  const bandTop = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.upper_bound).toFixed(1)}`).join(" ");
  const bandBottom = [...pts].reverse().map((p, i) => `L${x(pts.length - 1 - i).toFixed(1)},${y(p.lower_bound).toFixed(1)}`).join(" ");

  const last = pts[pts.length - 1]!;
  const tick = (t: number) => {
    const i = Math.round((t / 100) * (pts.length - 1));
    return pts[i]!;
  };

  return (
    <svg
      className="prx-price__chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Projected median price, ${forecast.meta.horizon_months} months ahead`}
    >
      <polygon points={`${bandTop} ${bandBottom}`} className="prx-price__band" />
      <polyline points={line} className="prx-price__line" fill="none" />
      {[0, 25, 50, 75, 100].map((t) => {
        const p = tick(t);
        return (
          <g key={t}>
            <line
              x1={x(Math.round((t / 100) * (pts.length - 1)))}
              y1={0}
              x2={x(Math.round((t / 100) * (pts.length - 1)))}
              y2={H}
              className="prx-price__grid"
            />
            <text x={x(Math.round((t / 100) * (pts.length - 1)))} y={H + 14} textAnchor="middle" className="prx-price__tick">
              {p.observed_period}
            </text>
          </g>
        );
      })}
      <text x={W - 4} y={14} textAnchor="end" className="prx-price__last">
        {priceFmt.format(last.projected_value)}
      </text>
    </svg>
  );
}

export function PriceChangesTab({ signals, forecast, transactions }: PriceChangesTabProps) {
  const median = medianValue(signals);
  const yoy = pctValue(signals);
  const hasData = !!median || !!yoy || !!forecast || !!transactions;

  if (!hasData) {
    return (
      <div className="prx-price">
        <p className="prx-signals__hint">Enter a postcode to see price changes.</p>
      </div>
    );
  }

  return (
    <div className="prx-price">
      <section className="prx-price__stats" aria-label="Price stats">
        <div className="prx-price__stat">
          <span className="prx-price__stat-label">Median sale price</span>
          <span className="prx-price__stat-value">{median !== null ? priceFmt.format(median) : "—"}</span>
        </div>
        <div className="prx-price__stat">
          <span className="prx-price__stat-label">Change (year on year)</span>
          <span className={`prx-price__stat-value prx-price__yoy prx-price__yoy--${yoy === null ? "na" : yoy > 0 ? "up" : yoy < 0 ? "down" : "flat"}`}>
            {yoy !== null ? `${yoy > 0 ? "+" : ""}${yoy}%` : "—"}
          </span>
        </div>
        <div className="prx-price__stat">
          <span className="prx-price__stat-label">Sales in period</span>
          <span className="prx-price__stat-value">{transactions ? transactions.transactionCount : "—"}</span>
        </div>
      </section>

      {forecast && forecast.points.length > 1 && (
        <section className="prx-price__forecast" aria-label="Price forecast">
          <div className="prx-price__forecast-head">
            <h4 className="prx-history__title">Median price forecast</h4>
            <span className="prx-history__meta">
              {forecast.meta.horizon_months} months · r² {forecast.meta.r2 !== null ? forecast.meta.r2.toFixed(2) : "n/a"}
            </span>
          </div>
          <ForecastChart forecast={forecast} />
        </section>
      )}
      {forecast && forecast.points.length <= 1 && (
        <p className="prx-scores__hint">Forecast not available for this area.</p>
      )}

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
    </div>
  );
}
