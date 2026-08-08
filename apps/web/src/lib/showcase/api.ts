import "server-only";

import type {
  Preset,
  ScoreResult,
  Product,
  Signal,
  TransactionsResult,
  Portfolio,
  PortfolioDetail,
  PortfolioEnrichItem,
  ChangeReport,
} from "@/lib/showcase/types";

const BASE_URL = process.env.INTERNAL_API_URL ?? "https://onegoodarea.onrender.com";
const SHOWCASE_API_KEY = process.env.SHOWCASE_API_KEY ?? "";

/* AR-755: attribute showcase-demo traffic in event/training analytics. The
   API's classifyClientApp() maps each stamp to a client_app (same mechanism
   as onegoodarea-mcp-server in mcp/src/api-client.ts). */
const SHOWCASE_USER_AGENT = "onegoodarea-estate-agents/1.0.0";

/* AR-758: the PropTech showcase stamps its own client_app: "proptech". */
const SHOWCASE_PROP_TECH_USER_AGENT = "onegoodarea-proptech/1.0.0";

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  userAgent: string = SHOWCASE_USER_AGENT,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        ...(SHOWCASE_API_KEY ? { Authorization: `Bearer ${SHOWCASE_API_KEY}` } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const errorMsg = body?.error ?? `${res.status} ${res.statusText}`;
      throw new ApiError(res.status, errorMsg, body);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

interface ApiSignal {
  key: string;
  category: string;
  label: string;
  value: number | string | null;
  percentile?: number | null;
  confidence_reason: string;
}

export async function getSignals(postcode?: string): Promise<Signal[]> {
  const area = postcode ?? "M1 1AE";
  const data = await apiFetch<{ signals: ApiSignal[] }>(`/v1/area?postcode=${encodeURIComponent(area)}`);
  return (data.signals ?? []).map((s) => ({
    id: s.key,
    name: s.label,
    description: s.confidence_reason,
    value: s.value,
    category: s.category,
  }));
}

interface ApiDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  confidence: number;
}

interface ApiScoreResult {
  preset: string;
  score: number;
  confidence: number;
  weights_source: "preset" | "custom";
  dimensions: ApiDimension[];
}

export async function getScores(postcode?: string, preset?: Preset): Promise<ScoreResult> {
  const area = postcode ?? "M1 1AE";
  const body: { area: string; preset?: Preset } = { area };
  if (preset) body.preset = preset;
  const data = await apiFetch<ApiScoreResult>("/v1/score", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    preset: data.preset as Preset,
    score: data.score,
    confidence: data.confidence,
    weightsSource: data.weights_source,
    dimensions: (data.dimensions ?? []).map((d) => ({
      id: d.key,
      name: d.label,
      value: d.score,
      maxValue: 100,
      product: "scores" as Product,
      weight: d.weight,
      confidence: d.confidence,
    })),
  };
}

interface ApiTransaction {
  date: string;
  price: number;
  property_type: string;
  estate_type: string;
}

interface ApiTransactionsResponse {
  postcode_area: string;
  period: { from: string; to: string };
  transaction_count: number;
  transactions: ApiTransaction[];
}

export async function getTransactions(postcode?: string): Promise<TransactionsResult> {
  const area = postcode ?? "M1 1AE";
  const data = await apiFetch<ApiTransactionsResponse>(
    `/v1/area/transactions?postcode=${encodeURIComponent(area)}`,
    {},
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
  return {
    postcodeArea: data.postcode_area,
    period: data.period,
    transactionCount: data.transaction_count,
    transactions: (data.transactions ?? []).map((t) => ({
      date: t.date,
      price: t.price,
      propertyType: t.property_type,
      estateType: t.estate_type,
    })),
  };
}

/* ── Portfolios (Monitor product). All traffic stamps the proptech client_app
   and resolves to the shared demo user via the SHOWCASE_API_KEY. ── */

export async function listPortfolios(): Promise<Portfolio[]> {
  const data = await apiFetch<{ portfolios: Portfolio[] }>(
    "/v1/portfolios",
    {},
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
  return data.portfolios ?? [];
}

export async function createPortfolio(name: string): Promise<Portfolio> {
  return apiFetch<Portfolio>(
    "/v1/portfolios",
    { method: "POST", body: JSON.stringify({ name }) },
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

export async function getPortfolio(id: string): Promise<PortfolioDetail> {
  return apiFetch<PortfolioDetail>(
    `/v1/portfolios/${encodeURIComponent(id)}`,
    {},
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

export async function deletePortfolio(id: string): Promise<void> {
  await apiFetch<{ deleted: true }>(
    `/v1/portfolios/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

export async function addPortfolioAreas(
  id: string,
  areas: { area: string; label?: string | null }[],
): Promise<{ added: number; portfolio: PortfolioDetail }> {
  return apiFetch<{ added: number; portfolio: PortfolioDetail }>(
    `/v1/portfolios/${encodeURIComponent(id)}/areas`,
    { method: "POST", body: JSON.stringify({ areas }) },
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

export async function removePortfolioArea(id: string, area: string): Promise<void> {
  await apiFetch<{ removed: boolean }>(
    `/v1/portfolios/${encodeURIComponent(id)}/areas/${encodeURIComponent(area)}`,
    { method: "DELETE" },
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

export async function enrichPortfolio(id: string, preset?: Preset): Promise<PortfolioEnrichItem[]> {
  const body: { preset?: Preset } = {};
  if (preset) body.preset = preset;
  const data = await apiFetch<{ count: number; results: PortfolioEnrichItem[] }>(
    `/v1/portfolios/${encodeURIComponent(id)}/enrich`,
    { method: "POST", body: JSON.stringify(body) },
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
  return data.results ?? [];
}

export async function getPortfolioChanges(id: string): Promise<ChangeReport> {
  return apiFetch<ChangeReport>(
    `/v1/portfolios/${encodeURIComponent(id)}/changes`,
    {},
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

/* AR-764: side-effect-capable variant of /changes. The demo defaults
   `emit` to false so a "Re-scan" never fires material-change webhooks —
   the read-only GET probe (AR-399) already covers emit:false peeks. */
export async function triggerPortfolioChanges(
  id: string,
  options: { baseline?: "previous" | "first"; threshold_pct?: number; min_transactions?: number; emit?: boolean } = {},
): Promise<ChangeReport> {
  return apiFetch<ChangeReport>(
    `/v1/portfolios/${encodeURIComponent(id)}/changes`,
    {
      method: "POST",
      body: JSON.stringify({ ...options, emit: options.emit ?? false }),
    },
    SHOWCASE_PROP_TECH_USER_AGENT,
  );
}

export { ApiError };
