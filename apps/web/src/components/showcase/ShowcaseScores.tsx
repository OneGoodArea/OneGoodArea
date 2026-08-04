"use client";

import type { Score } from "@/lib/showcase/types";

interface Props {
  scores: Score[];
}

export default function ShowcaseScores({ scores }: Props) {
  if (scores.length === 0) return null;

  return (
    <div>
      {scores.map((s) => (
        <div key={s.id} className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#e4e4e8]">{s.name}</span>
            <span className="text-xs font-mono text-[#3b82f6]">{s.value}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1c1c22]">
            <div
              className="h-2 rounded-full bg-[#3b82f6]"
              style={{ width: `${(s.value / s.maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
