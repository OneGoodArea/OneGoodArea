"use client";

import { useState } from "react";

interface WeightInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function WeightInput({ label, value, onChange }: WeightInputProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-500">Weight {Math.round(value)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(v);
        }}
        className="w-full accent-[#003087]"
      />
    </div>
  );
}