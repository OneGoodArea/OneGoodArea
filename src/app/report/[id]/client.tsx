"use client";

import { ArrowRight } from "lucide-react";
import { UserButton } from "@/components/user-button";
import { AreaReport } from "@/lib/types";
import { ReportView } from "@/components/report-view";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { PlanId } from "@/lib/stripe";

export function ReportPageClient({ report, id, plan = "free" }: { report: AreaReport; id: string; plan?: PlanId }) {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: report.area }]}>
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
      </Navbar>

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
        <ReportView report={report} plan={plan} reportId={id} />
      </main>

      <Footer />
    </div>
  );
}
