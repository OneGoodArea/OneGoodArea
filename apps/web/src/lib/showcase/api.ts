import type { Signal, Score } from "@/lib/showcase/types";

const BASE_URL = process.env.INTERNAL_API_URL ?? "https://onegoodarea.onrender.com";
const SHOWCASE_API_KEY = process.env.SHOWCASE_API_KEY ?? "";

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(SHOWCASE_API_KEY ? { Authorization: `Bearer ${SHOWCASE_API_KEY}` } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
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

export async function getSignals(): Promise<Signal[]> {
  const data = await apiFetch<{ signals: ApiSignal[] }>("/v1/area?postcode=M1+1AE");
  return (data.signals ?? []).map((s) => ({
    id: s.key,
    name: s.label,
    description: s.confidence_reason,
    score: s.percentile ?? 0,
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

export async function getScores(): Promise<Score[]> {
  const data = await apiFetch<{ dimensions: ApiDimension[] }>("/v1/score", {
    method: "POST",
    body: JSON.stringify({ area: "M1 1AE", preset: "business" }),
  });
  return (data.dimensions ?? []).map((d) => ({
    id: d.key,
    name: d.label,
    value: d.score,
    maxValue: 100,
    product: "scores",
  }));
}
