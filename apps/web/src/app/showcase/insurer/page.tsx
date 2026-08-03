import Link from "next/link";
import { WorkflowCard } from "@/components/showcase/workflow-card";

export default function InsurerPage() {
  return (
    <main className="min-h-screen bg-[#09090b]">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-[#e4e4e8] mb-2">Insurer Workflow</h1>
        <p className="text-[#8a8a96] mb-8">
          This workflow demo is not yet configured. Signals and scores will be
          available here soon.
        </p>
        <WorkflowCard title="Signals" description="Placeholder for insurer signals">
          <p className="text-[#7a7a88] text-sm">No signals configured yet</p>
        </WorkflowCard>
        <WorkflowCard title="Scores" description="Placeholder for insurer scores" className="mt-6">
          <p className="text-[#7a7a88] text-sm">No scores configured yet</p>
        </WorkflowCard>
        <div className="mt-8 pt-6 border-t border-[#1c1c22]">
          <Link href="/" className="text-sm text-blue-400 hover:underline">
            &larr; Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}