"use client";

import { useState } from "react";

interface WeightInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function WeightInput({ label, value, onChange }: WeightInputProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-[#1c1c22] bg-[#0f0f12]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#e4e4e8]">{label}</span>
        <span className="text-sm text-[#8a8a96]">Weight {Math.round(value)}%</span>
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
        className="w-full accent-blue-500"
      />
    </div>
  );
}