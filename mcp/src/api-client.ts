/**
 * Thin HTTP client for the OneGoodArea REST API.
 * Used by every MCP tool — keeps auth + base URL handling in one place.
 *
 * AR-364: rewritten to target the live apps/api at /v1/* directly (not
 * the apps/web /api/v1/* proxy, which is silently broken since AR-324).
 * Uses /v1/score?explain=true so brief-shape narrative is composed
 * server-side from real engine state — no client-side text synthesis.
 */

const DEFAULT_BASE = "https://onegoodarea.onrender.com";
const USER_AGENT = "onegoodarea-mcp-server/1.0.0";

export type Preset = "moving" | "business" | "investing" | "research";

/** AR-366: the seven signal categories exposed by /v1/signals/:category.
    Mirrors @onegoodarea/contracts SIGNAL_CATEGORIES. */
export const SIGNAL_CATEGORIES = [
  "crime",
  "deprivation",
  "property",
  "schools",
  "amenities",
  "transport",
  "environment",
] as const;
export type SignalCategory = typeof SIGNAL_CATEGORIES[number];

/** AR-366: one addressable signal as returned by /v1/area + /v1/signals/:category.
    Matches @onegoodarea/contracts Signal. */
export interface OogaSignal {
  key: string;
  category: SignalCategory;
  label: string;
  value: number | string | null;
  unit: string | null;
  normalized_value?: number | null;
  percentile?: number | null;
  direction: "higher_is_better" | "lower_is_better" | "neutral";
  confidence: number;
  confidence_reason: string;
  source: string;
  observed_period: string;
}

/** AR-367: the seven Intelligence plan ops. Mirrors @onegoodarea/contracts
    QueryPlan.op discriminator. */
export type OogaPlanOp =
  | "rank_areas"
  | "get_area"
  | "score_area"
  | "compare_areas"
  | "find_peers"
  | "find_insights"
  | "find_forecast";

/** AR-367: response from POST /v1/query — discriminated by plan.op. We
    don't strict-decode the per-op results shapes here; the formatter
    walks them defensively. Matches @onegoodarea/contracts QueryResponse. */
export interface OogaQueryResponse {
  plan: { op: OogaPlanOp; params: unknown };
  plan_source: "client" | "nl";
  results: unknown;
  meta: { generated_at: string };
}

/** AR-368: Monitor types — matches @onegoodarea/contracts Portfolio + PortfolioArea. */
export interface OogaPortfolio {
  id: string;
  name: string;
  area_count?: number;
  created_at?: string;
}

export interface OogaPortfolioArea {
  id: string;
  area: string;
  label: string | null;
  created_at?: string;
}

/** AR-368: response from POST /v1/portfolios/:id/areas (the route returns
    the updated portfolio detail with all areas). */
export interface OogaPortfolioDetail extends OogaPortfolio {
  areas: OogaPortfolioArea[];
}

/** AR-368: a material signal change for one tracked area between two
    time-series periods. Mirrors @onegoodarea/contracts SignalChange. */
export interface OogaSignalChange {
  signal_key: string;
  label: string | null;
  area: string;
  geo_code: string;
  period_from: string;
  period_to: string;
  value_from: number | null;
  value_to: number | null;
  delta: number | null;
  pct_change: number | null;
  direction: "up" | "down" | "flat";
  material: boolean;
}

/** AR-368: the response from POST /v1/portfolios/:id/changes — a change
    detection report for one portfolio between two periods. */
export interface OogaChangeReport {
  portfolio_id: string;
  baseline: "previous" | "first";
  threshold_pct: number;
  min_transactions: number;
  areas_checked: number;
  material_count: number;
  changes: OogaSignalChange[];
  generated_at: string;
}

/** AR-367: typed peers response from POST /v1/peers. */
export interface OogaPeersResponse {
  target: {
    geo_code: string;
    signals_used: string[];
  };
  peers: Array<{
    geo_code: string;
    distance: number;
    n_dims_used: number;
  }>;
  meta: { generated_at: string; scope: string };
}

/** AR-366: the AreaProfile response from /v1/area and /v1/signals/:category. */
export interface OogaAreaProfile {
  geo: {
    query: string;
    postcode: string | null;
    latitude: number;
    longitude: number;
    lsoa: string | null;
    msoa: string | null;
    admin_district: string | null;
    region: string | null;
    country: string;
    area_type: "urban" | "suburban" | "rural";
  };
  signals: OogaSignal[];
  meta: {
    engine_version: string;
    generated_at: string;
    sources: string[];
    fetch_mode: "live" | "store" | "hybrid";
  };
}

/** One weighted component of a composite score. Matches the
    @onegoodarea/contracts `ScoreDimension` shape; we redeclare it here
    so the MCP package can be published independently of the monorepo
    contracts (the npm release ships only mcp/dist). */
export interface OogaScoreDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  confidence: number;
  reasoning: string;
  confidence_reason: string;
}

/** The response of POST /v1/score?explain=true. The `summary`,
    `recommendations`, and `data_sources` fields are server-side
    composed when explain mode is on (AR-363). */
export interface OogaScoreResponse {
  area: string;
  preset: Preset;
  score: number;
  area_type: "urban" | "suburban" | "rural";
  dimensions: OogaScoreDimension[];
  confidence: number;
  weights_source: "preset" | "custom";
  engine_version: string;
  /** Brief-shape fields — present when ?explain=true. */
  summary?: string;
  recommendations?: string[];
  data_sources?: string[];
}

export interface OogaApiClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Defaults to 60 seconds — the engine takes 15-45s on cache miss. */
  timeoutMs?: number;
}

/** /v1/me response shape (the bits MCP relies on). The API returns more
    fields (org, key allowlist, addons, etc.) — we only declare what we
    use, since extra fields are fine at runtime. */
export interface OogaMeResponse {
  plan: string;
  plan_name: string;
  api_access: boolean;
  mcp_access: boolean;
  api_calls_per_month: number;
  used_this_month: number;
  limit_this_month: number | null;
  engine_version: string;
}

export class OogaApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "OogaApiError";
  }
}

export class OogaApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: OogaApiClientOptions) {
    if (!opts.apiKey) throw new Error("OogaApiClient requires apiKey");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  /**
   * GET /v1/me — returns the authenticated user's plan + entitlements.
   * Called by the MCP server at startup to check `mcp_access`.
   */
  async me(): Promise<OogaMeResponse> {
    const url = `${this.baseUrl}/v1/me`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      });

      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text; }

      if (!res.ok) {
        const errMsg =
          typeof body === "object" && body !== null && "error" in body
            ? String((body as { error: unknown }).error)
            : `HTTP ${res.status}`;
        throw new OogaApiError(errMsg, res.status, body);
      }

      return body as OogaMeResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * POST /v1/score?explain=true — score a UK area for the given preset.
   * `explain=true` triggers server-side composition of the brief-shape
   * fields (summary, recommendations, data_sources) from real engine
   * state. Per the brief-shape policy, the MCP never synthesises text.
   */
  async scoreArea(area: string, preset: Preset): Promise<OogaScoreResponse> {
    const url = `${this.baseUrl}/v1/score?explain=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ area, preset }),
        signal: controller.signal,
      });

      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      if (!res.ok) {
        const errMsg =
          typeof body === "object" && body !== null && "error" in body
            ? String((body as { error: unknown }).error)
            : `HTTP ${res.status}`;
        throw new OogaApiError(errMsg, res.status, body);
      }

      return body as OogaScoreResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * GET /v1/area?area=<area> — full signal catalog for an area.
   * Returns every signal with its raw value, normalized value + percentile
   * (when store-backed), per-signal confidence + reason, source attribution,
   * and observation period. The full Signals primitive (AR-366).
   */
  async getAreaSignals(area: string): Promise<OogaAreaProfile> {
    return this.getAreaProfile(`/v1/area?area=${encodeURIComponent(area)}`);
  }

  /**
   * GET /v1/signals/:category?area=<area> — signals filtered to one category
   * (crime / deprivation / property / schools / amenities / transport /
   * environment). Same Signal shape as /v1/area; just a narrower payload
   * for when the LLM only needs one slice.
   */
  async getSignalsByCategory(area: string, category: SignalCategory): Promise<OogaAreaProfile> {
    return this.getAreaProfile(`/v1/signals/${category}?area=${encodeURIComponent(area)}`);
  }

  /**
   * POST /v1/query with `{question}` — natural-language interface to the
   * Intelligence query plane. The planner emits a typed plan; the DB
   * executes it; the response carries plan + plan_source + results so
   * every answer is reproducible (AR-367).
   */
  async findAreas(question: string): Promise<OogaQueryResponse> {
    return this.postIntelligence("/v1/query", { question });
  }

  /**
   * POST /v1/peers with `{target: {area}, k?}` — k-NN over normalized
   * signal values. Returns the target geo_code + signals_used + a
   * ranked peers[] list (AR-367).
   */
  async findPeers(area: string, k?: number): Promise<OogaPeersResponse> {
    const body: { target: { area: string }; k?: number } = { target: { area } };
    if (k !== undefined) body.k = k;
    return this.postIntelligence("/v1/peers", body);
  }

  /**
   * POST /v1/portfolios — create a new Monitor portfolio. AR-368.
   */
  async createPortfolio(name: string): Promise<OogaPortfolio> {
    return this.postIntelligence<OogaPortfolio>("/v1/portfolios", { name });
  }

  /**
   * POST /v1/portfolios/:id/areas — add tracked areas to a portfolio. Returns
   * the updated portfolio detail with all areas. AR-368.
   */
  async addPortfolioAreas(
    portfolioId: string,
    areas: Array<{ area: string; label?: string | null }>,
  ): Promise<OogaPortfolioDetail> {
    return this.postIntelligence<OogaPortfolioDetail>(
      `/v1/portfolios/${encodeURIComponent(portfolioId)}/areas`,
      { areas },
    );
  }

  /**
   * POST /v1/portfolios/:id/changes — detect material signal changes between
   * two time-series periods. AR-368.
   */
  async getPortfolioChanges(
    portfolioId: string,
    opts: { baseline?: "previous" | "first"; threshold_pct?: number; min_transactions?: number } = {},
  ): Promise<OogaChangeReport> {
    const body: Record<string, unknown> = {};
    if (opts.baseline !== undefined) body.baseline = opts.baseline;
    if (opts.threshold_pct !== undefined) body.threshold_pct = opts.threshold_pct;
    if (opts.min_transactions !== undefined) body.min_transactions = opts.min_transactions;
    /* Default emit:false — the MCP shouldn't fire webhooks on a probe call. */
    body.emit = false;
    return this.postIntelligence<OogaChangeReport>(
      `/v1/portfolios/${encodeURIComponent(portfolioId)}/changes`,
      body,
    );
  }

  /** Shared POST handler for the Intelligence endpoints. */
  private async postIntelligence<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = text; }

      if (!res.ok) {
        const errMsg =
          typeof parsed === "object" && parsed !== null && "error" in parsed
            ? String((parsed as { error: unknown }).error)
            : `HTTP ${res.status}`;
        throw new OogaApiError(errMsg, res.status, parsed);
      }

      return parsed as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Shared GET handler for the two area-profile endpoints. */
  private async getAreaProfile(path: string): Promise<OogaAreaProfile> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      });

      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text; }

      if (!res.ok) {
        const errMsg =
          typeof body === "object" && body !== null && "error" in body
            ? String((body as { error: unknown }).error)
            : `HTTP ${res.status}`;
        throw new OogaApiError(errMsg, res.status, body);
      }

      return body as OogaAreaProfile;
    } finally {
      clearTimeout(timeout);
    }
  }
}
