import Link from "next/link";
import { getSignals, getScores } from "@/lib/showcase/api";

const fallbackSignals = [
  { id: "s1", name: "Deprivation Decile", description: "IMD rank", score: 2 },
  { id: "s2", name: "Crime Rate", description: "Per 1,000 population", score: 45 },
  { id: "s3", name: "Property YoY", description: "Value change %", score: 3.2 },
  { id: "s4", name: "Green Space", description: "% green area", score: 18 },
  { id: "s5", name: "School Rating", description: "Ofsted avg", score: 2 },
  { id: "s6", name: "Broadband", description: "Mbps avg", score: 76 },
];

const fallbackScores = [
  { id: "sc1", name: "Affordability", value: 72, maxValue: 100, product: "scores" },
  { id: "sc2", name: "Safety", value: 55, maxValue: 100, product: "scores" },
  { id: "sc3", name: "Growth Potential", value: 68, maxValue: 100, product: "scores" },
  { id: "sc4", name: "Liveability", value: 81, maxValue: 100, product: "scores" },
];

type SignalItem = { id: string; name: string; description: string; score: number };
type ScoreItem = { id: string; name: string; value: number; maxValue: number; product: string };

export const dynamic = "force-dynamic";

export default async function ProptechPage() {
  let items: SignalItem[] = [];
  let scores: ScoreItem[] = [];
  let live = false;

  try {
    items = await getSignals();
    scores = await getScores();
    live = items.length > 0;
  } catch {
    items = fallbackSignals;
    scores = fallbackScores;
  }

  return (
    <main className="min-h-screen bg-[#09090b]">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-[#e4e4e8] mb-2">Proptech Workflow</h1>
        <p className="text-[#8a8a96] mb-8">
          {live
            ? "Live data from the API — real signals and scores for a sample UK area."
            : "Demo data — showing how a proptech client would use Signals and Scores with custom weights."}
        </p>

        <div className="rounded-lg border border-[#1c1c22] bg-[#0f0f12] p-6">
          <h3 className="text-lg font-semibold text-[#e4e4e8] mb-2">Signals{!live && " (demo)"}</h3>
          <p className="text-sm text-[#8a8a96] mb-4">Area intelligence signals per LSOA</p>
          <div className="grid gap-3">
            {items.map((s) => (
              <div key={s.id} className="rounded border border-[#1c1c22] bg-[#09090b] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e4e4e8]">{s.name}</span>
                  <span className="text-xs font-mono text-[#3b82f6]">{s.score}</span>
                </div>
                <p className="text-xs text-[#8a8a96] mt-1">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#1c1c22] bg-[#0f0f12] p-6 mt-6">
          <h3 className="text-lg font-semibold text-[#e4e4e8] mb-2">Scores{!live && " (demo)"}</h3>
          <p className="text-sm text-[#8a8a96] mb-4">Composite 0-100 scores</p>
          <div className="grid gap-3">
            {scores.map((s) => (
              <div key={s.id} className="rounded border border-[#1c1c22] bg-[#09090b] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#e4e4e8]">{s.name}</span>
                  <span className="text-xs font-mono text-[#3b82f6]">{s.value}/{s.maxValue}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1c1c22]">
                  <div
                    className="h-1.5 rounded-full bg-[#3b82f6]"
                    style={{ width: `${(s.value / s.maxValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1c1c22]">
          <Link href="/" className="text-sm text-blue-400 hover:underline">
            &larr; Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}