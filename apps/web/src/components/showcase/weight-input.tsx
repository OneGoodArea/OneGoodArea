"use client";

import { useState } from "react";

interface WeightInputProps {
  label: string;
  product: string;
  value: number;
  onChange: (value: number) => void;
}

export function WeightInput({ label, product, value, onChange }: WeightInputProps) {
  const [textValue, setTextValue] = useState(String(value));

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-[#1c1c22] bg-[#0f0f12]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#e4e4e8]">{label}</span>
        <span className="text-sm text-[#8a8a96]">{product}</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(v);
          setTextValue(String(v));
        }}
        className="w-full accent-blue-500"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.1"
          value={textValue}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
              onChange(v);
              setTextValue(String(v));
            }
          }}
          className="w-20 rounded border border-[#1c1c22] bg-[#09090b] px-2 py-1 text-sm text-[#e4e4e8] outline-none focus:border-blue-500"
        />
        <span className="text-xs text-[#7a7a88]">weight</span>
      </div>
    </div>
  );
}