"use client";

import { ArrowRight } from "lucide-react";
import { AreaReport } from "@/lib/types";
import { ReportView } from "@/components/report-view";
import Link from "next/link";

export function ReportPageClient({ report, id }: { report: AreaReport; id: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* Header */}
      <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              AreaIQ
            </Link>
            <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {report.area}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {id}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        <Link
          href="/report"
          className="text-[11px] font-mono mb-6 flex items-center gap-1.5 transition-colors inline-flex"
          style={{ color: "var(--text-tertiary)" }}
        >
          <ArrowRight size={11} className="rotate-180" />
          New report
        </Link>
        <ReportView report={report} />
      </main>

      {/* Footer */}
      <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-10 flex items-center justify-between">
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>AreaIQ</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Area intelligence, instantly.</span>
        </div>
      </footer>
    </div>
  );
}
