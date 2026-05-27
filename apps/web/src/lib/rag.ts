export interface RAG {
  color: string;
  dim: string;
  glow: string;
  label: string;
}

export function getRAG(score: number): RAG {
  if (score >= 70) return { color: "var(--neon-green)", dim: "var(--neon-green-dim)", glow: "neon-green-glow", label: "Strong" };
  if (score >= 45) return { color: "var(--neon-amber)", dim: "var(--neon-amber-dim)", glow: "neon-amber-glow", label: "Moderate" };
  return { color: "var(--neon-red)", dim: "var(--neon-red-dim)", glow: "neon-red-glow", label: "Weak" };
}
