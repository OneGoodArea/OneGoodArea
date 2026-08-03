import type { Signal, Score } from "@/lib/showcase/types";

const BASE_URL = process.env.INTERNAL_API_URL ?? "https://onegoodarea.onrender.com";

async function apiFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
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

export async function getSignals(): Promise<Signal[]> {
  const data = await apiFetch<{ signals: Record<string, unknown> }>(
    "/v1/area?postcode=M1+1AE"
  );
  return Object.entries(data.signals ?? {}).map(([key, v]: [string, unknown]) => ({
    id: key,
    name: key.replace(/_/g, " "),
    description: "",
    score: (v as { percentile?: number })?.percentile ?? 0,
    category: "",
  }));
}

export async function getScores(): Promise<Score[]> {
  const data = await apiFetch<{ scores: Score[] }>("/v1/scores");
  return data.scores ?? [];
}