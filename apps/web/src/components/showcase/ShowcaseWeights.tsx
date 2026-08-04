"use client";

const WEIGHTS = [
  { id: "foot_traffic_demand", label: "Foot Traffic & Demand", weight: 30 },
  { id: "competition_density", label: "Competition Density", weight: 20 },
  { id: "transport_access", label: "Transport & Access", weight: 15 },
  { id: "local_spending_power", label: "Local Spending Power", weight: 20 },
  { id: "commercial_costs", label: "Commercial Costs", weight: 15 },
];

export default function ShowcaseWeights() {
  return (
    <div className="space-y-3">
      {WEIGHTS.map((w) => (
        <div key={w.id} className="flex items-center justify-between">
          <span className="text-sm text-[#e4e4e8]">{w.label}</span>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 rounded-full bg-[#1c1c22]">
              <div
                className="h-2 rounded-full bg-[#3b82f6]/50"
                style={{ width: `${w.weight}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[#8a8a96] w-8 text-right">
              {w.weight}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
