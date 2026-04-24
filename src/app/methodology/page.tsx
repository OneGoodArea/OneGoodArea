import Link from "next/link";
import type { Metadata } from "next";
import { Database, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DataSourcesSection } from "./data-sources-section";
import { IntentTypesSection } from "./intent-types-section";
import { ScoringFunctionsSection } from "./scoring-functions-section";
import { AiSection } from "./ai-section";
import { OverallScoreSection, ScoreScaleSection } from "./overall-score-section";

export const metadata: Metadata = {
  title: "Scoring Methodology | OneGoodArea",
  description: "How OneGoodArea scores areas: transparent, deterministic formulas applied to 7 live UK data sources. Same postcode, same score, every time.",
  openGraph: {
    title: "Scoring Methodology | OneGoodArea",
    description: "Transparent, deterministic scoring applied to 7 live UK data sources. Same postcode, same score, every time.",
    type: "article",
    url: "https://www.area-iq.co.uk/methodology",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Scoring Methodology | OneGoodArea", description: "Transparent, deterministic scoring applied to 7 live UK data sources." },
  alternates: { canonical: "https://www.area-iq.co.uk/methodology" },
};

const NAV_ITEMS = [
  { id: "data-sources", label: "Data Sources" },
  { id: "intent-types", label: "Intent Types" },
  { id: "scoring", label: "Scoring Functions" },
  { id: "ai-role", label: "Role of AI" },
  { id: "overall-score", label: "Overall Score" },
  { id: "score-scale", label: "Score Scale" },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Methodology" }]} maxWidth="1100px">
        <Link
          href="/report"
          className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Try It
          <ArrowRight size={12} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:block">
            <div className="sticky top-8">
              <div
                className="text-[9px] font-mono uppercase tracking-wider mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                On this page
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-[12px] font-mono py-1 transition-colors hover:opacity-80"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {/* Hero */}
            <div className="mb-12">
              <h1
                className="text-[28px] font-semibold tracking-tight mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                How OneGoodArea Scores Areas
              </h1>
              <p
                className="text-[14px] leading-relaxed mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Every score is computed from real data using transparent,
                deterministic formulas. Same postcode, same data, same score,
                every time.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="text-[10px] font-mono px-2 py-0.5"
                  style={{
                    color: "var(--neon-green)",
                    background: "var(--neon-green-dim)",
                  }}
                >
                  Deterministic Scoring
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  7 data sources &bull; 4 intent types &bull; no AI in the
                  numbers
                </span>
              </div>
            </div>

            <DataSourcesSection />
            <IntentTypesSection />
            <ScoringFunctionsSection />
            <AiSection />
            <OverallScoreSection />
            <ScoreScaleSection />

            {/* Bottom CTA */}
            <div
              className="border p-8 text-center"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-elevated)",
              }}
            >
              <div
                className="text-[14px] font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                See the scoring engine in action
              </div>
              <p
                className="text-[12px] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Generate a free report for any UK postcode or area name.
              </p>
              <Link
                href="/report"
                className="inline-flex h-10 px-6 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg)",
                }}
              >
                <Database size={12} />
                Generate Report
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer maxWidth="1100px" />
    </div>
  );
}
