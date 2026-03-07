"use client";

import { ArrowRight } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { AreaReport } from "@/lib/types";
import { ReportView } from "@/components/report-view";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function ReportPageClient({ report, id }: { report: AreaReport; id: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* Header */}
      <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/" />
            <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {report.area}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden sm:block text-[10px] font-mono uppercase tracking-wider transition-colors hover:opacity-80"
              style={{ color: "var(--text-tertiary)" }}
            >
              My Reports
            </Link>
            <span className="hidden md:inline text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {id}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-6 py-6 md:py-8">
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
          <Logo size="sm" variant="footer" />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Area intelligence, instantly.</span>
        </div>
      </footer>
    </div>
  );
}
