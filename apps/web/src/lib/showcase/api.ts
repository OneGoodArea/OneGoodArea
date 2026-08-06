import "server-only";

import type { Preset, Score, ScoreResult, Product, Signal } from "@/lib/showcase/types";

const BASE_URL = process.env.INTERNAL_API_URL ?? "https://onegoodarea.onrender.com";
const SHOWCASE_API_KEY = process.env.SHOWCASE_API_KEY ?? "";

/* AR-755: attribute showcase-demo traffic in event/training analytics. The
   API's classifyClientApp() maps this stamp to client_app: "estate-agents"
   (same mechanism as onegoodarea-mcp-server in mcp/src/api-client.ts). */
const SHOWCASE_USER_AGENT = "onegoodarea-estate-agents/1.0.0";

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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": SHOWCASE_USER_AGENT,
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

export { ApiError };
