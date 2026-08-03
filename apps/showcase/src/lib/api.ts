import type { Signal, Score, Client } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getSignals(): Promise<Signal[]> {
  return apiFetch<Signal[]>("/api/signals");
}

export async function getScores(): Promise<Score[]> {
  return apiFetch<Score[]>("/api/scores");
}

export async function getClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${id}`);
}