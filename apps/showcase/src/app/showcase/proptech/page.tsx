import { WeightInput } from "@/components/weight-input";
import { WorkflowCard } from "@/components/workflow-card";
import { getSignals, getScores } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProptechPage() {
  let signals: { id: string; name: string; description: string; score: number; category: string }[] = [];
  let scores: { id: string; name: string; value: number; maxValue: number; product: string }[] = [];

  try {
    signals = await getSignals();
    scores = await getScores();
  } catch {
    // API unavailable during development — show empty state
  }

  return (
    <main className="min-h-screen bg-[#09090b]">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-[#e4e4e8] mb-2">Proptech Workflow</h1>
        <p className="text-[#8a8a96] mb-8">
          Interactive demo using Signals and Scores with custom weights.
        </p>

        <WorkflowCard title="Signals" description="Real-time property signals from the API">
          {signals.length === 0 ? (
            <p className="text-[#7a7a88] text-sm">No signals available</p>
          ) : (
            <div className="grid gap-3">
              {signals.map((s) => (
                <div key={s.id} className="rounded border border-[#1c1c22] bg-[#0f0f12] p-3">
                  <span className="text-sm font-medium text-[#e4e4e8]">{s.name}</span>
                  <p className="text-xs text-[#8a8a96] mt-1">{s.description}</p>
                  <span className="text-xs text-[#3b82f6]">Score: {s.score}</span>
                </div>
              ))}
            </div>
          )}
        </WorkflowCard>

        <WorkflowCard title="Scores" description="Property scores from the API" className="mt-6">
          {scores.length === 0 ? (
            <p className="text-[#7a7a88] text-sm">No scores available</p>
          ) : (
            <div className="grid gap-3">
              {scores.map((s) => (
                <div key={s.id} className="rounded border border-[#1c1c22] bg-[#0f0f12] p-3">
                  <span className="text-sm font-medium text-[#e4e4e8]">{s.name}</span>
                  <p className="text-xs text-[#8a8a96] mt-1">
                    {s.value} / {s.maxValue}
                  </p>
                </div>
              ))}
            </div>
          )}
        </WorkflowCard>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-[#e4e4e8] mb-4">Custom Weights</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <WeightInput label="Signals Weight" product="Signals" value={1} onChange={() => {}} />
            <WeightInput label="Scores Weight" product="Scores" value={1} onChange={() => {}} />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1c1c22]">
          <a href="/" className="text-sm text-blue-400 hover:underline">
            &larr; Back to homepage
          </a>
        </div>
      </section>
    </main>
  );
}