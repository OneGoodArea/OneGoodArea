/**
 * Thin HTTP client for the OneGoodArea REST API.
 * Used by every MCP tool — keeps auth + base URL handling in one place.
 */

const DEFAULT_BASE = "https://www.onegoodarea.com";

export type Intent = "moving" | "business" | "investing" | "research";

export interface OogaScoreResponse {
  area: string;
  intent: Intent;
  areaiq_score: number;
  sub_scores: Array<{
    label: string;
    score: number;
    weight: number;
    summary: string;
    reasoning: string;
    confidence?: number;
    confidence_reason?: string;
  }>;
  summary: string;
  sections: Array<{ title: string; content: string; data_points: Array<{ label: string; value: string }> }>;
  recommendations: string[];
  data_sources: string[];
  generated_at: string;
  engine_version?: string;
  area_type?: "urban" | "suburban" | "rural";
  confidence?: number;
}

export interface OogaApiClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Defaults to 60 seconds — the engine takes 15-45s on cache miss. */
  timeoutMs?: number;
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
   * POST /api/v1/report — generates (or returns cached) report for the given
   * postcode/area + intent. Returns the full structured response.
   */
  async scoreArea(area: string, intent: Intent): Promise<OogaScoreResponse> {
    const url = `${this.baseUrl}/api/v1/report`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "onegoodarea-mcp-server/0.1.0",
        },
        body: JSON.stringify({ area, intent }),
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
}
