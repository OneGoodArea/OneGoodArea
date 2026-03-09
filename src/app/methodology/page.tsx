import Link from "next/link";
import type { Metadata } from "next";
import {
  Database,
  Shield,
  Train,
  GraduationCap,
  Store,
  Users,
  TreePine,
  Cpu,
  Scale,
  TrendingUp,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Methodology | AreaIQ",
  description:
    "How AreaIQ scores areas: transparent, deterministic formulas applied to 5 live UK data sources. Same postcode, same score, every time.",
};

const NAV_ITEMS = [
  { id: "data-sources", label: "Data Sources" },
  { id: "intent-types", label: "Intent Types" },
  { id: "scoring", label: "Scoring Functions" },
  { id: "ai-role", label: "Role of AI" },
  { id: "overall-score", label: "Overall Score" },
  { id: "score-scale", label: "Score Scale" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-14 scroll-mt-8">
      <h2
        className="text-[16px] font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

const DATA_SOURCES = [
  {
    name: "Police.uk",
    provider: "Home Office",
    radius: "1 mile",
    data: "Street-level crime incidents from the last 3 months, broken down by category (theft, violence, burglary, etc.). Includes monthly trend data for direction-of-travel analysis.",
  },
  {
    name: "ONS / IMD 2019",
    provider: "MHCLG via ArcGIS",
    radius: "LSOA boundary",
    data: "Index of Multiple Deprivation. Ranks 32,844 Lower Super Output Areas across income, employment, health, education, and living environment. Decile 1 = most deprived, decile 10 = least deprived.",
  },
  {
    name: "OpenStreetMap",
    provider: "Overpass API",
    radius: "500m to 2km",
    data: "Nearby amenities: schools within 1.5km, food and shops within 1km, transport stations within 2km, bus stops within 500m, parks and healthcare facilities.",
  },
  {
    name: "Environment Agency",
    provider: "Defra",
    radius: "3km / 5km",
    data: "Flood risk zones within 3km, active flood warnings within 5km, and identified rivers at risk. Data is fetched live per request.",
  },
  {
    name: "Postcodes.io",
    provider: "ONS / Royal Mail",
    radius: "Point lookup",
    data: "Geocoding (latitude/longitude), LSOA code and name, local authority, ward, constituency, and region. Acts as the entry point for all other lookups.",
  },
];

const INTENT_WEIGHTS = [
  {
    intent: "moving",
    label: "Moving",
    desc: "Residential relocation",
    dimensions: [
      { name: "Safety", weight: 25 },
      { name: "Schools", weight: 20 },
      { name: "Transport", weight: 20 },
      { name: "Amenities", weight: 15 },
      { name: "Cost of Living", weight: 20 },
    ],
  },
  {
    intent: "business",
    label: "Business",
    desc: "Commercial viability",
    dimensions: [
      { name: "Foot Traffic", weight: 30 },
      { name: "Competition", weight: 20 },
      { name: "Transport", weight: 15 },
      { name: "Spending Power", weight: 20 },
      { name: "Commercial Costs", weight: 15 },
    ],
  },
  {
    intent: "investing",
    label: "Investing",
    desc: "Property investment",
    dimensions: [
      { name: "Price Growth", weight: 25 },
      { name: "Rental Yield", weight: 25 },
      { name: "Regeneration", weight: 20 },
      { name: "Tenant Demand", weight: 15 },
      { name: "Risk Factors", weight: 15 },
    ],
  },
  {
    intent: "research",
    label: "Research",
    desc: "General area profile",
    dimensions: [
      { name: "Safety", weight: 20 },
      { name: "Transport", weight: 20 },
      { name: "Amenities", weight: 20 },
      { name: "Demographics", weight: 20 },
      { name: "Environment", weight: 20 },
    ],
  },
];

const SCORING_FUNCTIONS = [
  {
    icon: Shield,
    label: "Safety",
    intents: "Moving, Research",
    explanation:
      "Converts the monthly crime rate into a 0-100 score using a sigmoid curve. An area with 10 crimes per month scores around 86; 60 per month scores around 50; 200 per month drops to around 23. The score is then adjusted: high violent crime percentage (over 30% of total) subtracts up to 10 points, while low violent crime (under 10%) adds 5. A rising trend (over 20% increase month-on-month) penalises by 5 points; a falling trend rewards by 5.",
  },
  {
    icon: Train,
    label: "Transport",
    intents: "Moving, Business, Research",
    explanation:
      "Counts rail and tube stations within 2km with diminishing returns. The first station adds 16 points, the second adds 12, and so on, capping at 5 stations. Bus stops within 500m contribute up to 40 additional points (3.3 per stop). The two components are summed and clamped to 5-95.",
  },
  {
    icon: GraduationCap,
    label: "Schools",
    intents: "Moving",
    explanation:
      "Counts schools and educational facilities within 1.5km. Uses a square root curve for diminishing returns: 1 school scores 36, 2 schools score 48, 4 schools score 64, and 8 schools score 87. The minimum is 8 (no schools nearby) and the maximum is 95.",
  },
  {
    icon: Store,
    label: "Amenities",
    intents: "Moving, Research",
    explanation:
      "A composite score across five categories, each normalised against a benchmark: schools (out of 8), food and drink (out of 20), healthcare (out of 6), shops (out of 5), and parks (out of 4). The categories are weighted at 20%, 25%, 20%, 15%, and 20% respectively. The weighted composite is then scaled to a 5-95 range.",
  },
  {
    icon: Users,
    label: "Demographics",
    intents: "Research",
    explanation:
      "Maps directly from the IMD decile. Decile 1 (most deprived) scores 14, decile 5 scores 50, and decile 10 (least deprived) scores 95. The formula is: (decile x 9) + 5, clamped to 10-95. Reasoning includes the LSOA's national rank and percentile position.",
  },
  {
    icon: TreePine,
    label: "Environment",
    intents: "Moving, Research",
    explanation:
      "Starts from a base of 95. Each flood risk zone within 3km subtracts 6 points. Each active flood warning subtracts 15 points. Nearby parks add a bonus of up to 10 points (2.5 per park). The final score is clamped to 5-95. An area with no flood zones and 4 parks scores 95. An area with 3 flood zones and 2 active warnings scores around 42.",
  },
  {
    icon: Scale,
    label: "Cost of Living",
    intents: "Moving",
    explanation:
      "Inverts the IMD decile as a cost proxy: less deprived areas are more expensive, so affordability scores lower. Decile 10 (affluent) scores 18, while decile 1 (most deprived, most affordable) scores 82. Formula: ((11 - decile) x 8) + 10.",
  },
];

const BUSINESS_SCORING = [
  {
    label: "Foot Traffic",
    explanation:
      "Combines transport connectivity (stations x 15 + bus stops x 2, up to 50) with commercial activity density (restaurants + pubs + shops x 1.5, up to 50). High transport and retail presence indicates strong footfall.",
  },
  {
    label: "Competition",
    explanation:
      "Counts food, drink, and retail venues within 1km, then inverts the count. Fewer competitors = higher score. Formula: 90 - (competitors x 2), clamped to 10-90. Under 10 venues scores above 70; over 25 venues drops below 40.",
  },
  {
    label: "Spending Power",
    explanation:
      "Maps from IMD decile: higher decile (less deprived) = higher spending power. Formula: (decile x 9) + 8. Decile 8+ is labelled high spending power; decile 5-7 is moderate.",
  },
  {
    label: "Commercial Costs",
    explanation:
      "Inverts the IMD decile as a rent proxy, similar to Cost of Living. Affluent areas score lower (higher rents), more deprived areas score higher (lower rents). Formula: ((11 - decile) x 9) + 5.",
  },
];

const INVESTING_SCORING = [
  {
    label: "Price Growth",
    explanation:
      "Mid-range areas (IMD decile 4-7) score highest for growth potential, peaking around 75-80. Premium areas (decile 8+) score lower due to limited ceiling. Deprived areas (decile 1-3) score moderately, reflecting higher risk. Transport stations add up to 15 bonus points.",
  },
  {
    label: "Rental Yield",
    explanation:
      "Lower-cost areas tend to produce higher gross yields. The base yield score starts from (11 - decile) x 7 + 15, so decile 1 scores highest. Nearby amenities and transport add up to 15 points as a demand multiplier.",
  },
  {
    label: "Regeneration",
    explanation:
      "Areas with higher deprivation (decile 1-4) score highest for regeneration potential, starting from 60-75. Mid-range areas score around 50. Already-developed areas (decile 8+) score 30. Transport links add up to 20 bonus points.",
  },
  {
    label: "Tenant Demand",
    explanation:
      "Combines transport stations (up to 40 points), total amenities (up to 30 points), bus stops (up to 15 points), and food/drink venues (up to 15 points). More connectivity and local amenities signal stronger rental demand.",
  },
  {
    label: "Risk Factors",
    explanation:
      "Averages the Safety score and Environment score (without park bonus). Low crime and no flood risk produce a high score. Active flood warnings and high crime rates both drag the score down significantly.",
  },
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
                How AreaIQ Scores Areas
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
                  5 data sources &bull; 4 intent types &bull; no AI in the
                  numbers
                </span>
              </div>
            </div>

            {/* ── Data Sources ── */}
            <Section id="data-sources" title="Data Sources">
              <p
                className="text-[13px] mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Every report is built from 5 live UK government and open data
                sources, fetched in parallel at the time of request. No cached
                data. No estimates. No surveys.
              </p>
              <div
                className="border"
                style={{ borderColor: "var(--border)" }}
              >
                {DATA_SOURCES.map((source, i) => (
                  <div
                    key={source.name}
                    className={`px-5 py-4 ${
                      i < DATA_SOURCES.length - 1 ? "border-b" : ""
                    }`}
                    style={{
                      borderColor: "var(--border)",
                      background:
                        i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className="text-[13px] font-mono font-semibold"
                        style={{ color: "var(--neon-green)" }}
                      >
                        {source.name}
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {source.provider}
                      </span>
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5"
                        style={{
                          color: "var(--text-tertiary)",
                          background: "var(--bg-active)",
                        }}
                      >
                        {source.radius}
                      </span>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {source.data}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Intent Types ── */}
            <Section id="intent-types" title="Intent Types & Dimension Weights">
              <p
                className="text-[13px] mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                The intent determines which dimensions are scored and how they
                are weighted. Different use cases care about different things.
                Moving prioritises safety and schools. Business prioritises foot
                traffic and spending power.
              </p>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-px"
                style={{ background: "var(--border)" }}
              >
                {INTENT_WEIGHTS.map((item) => (
                  <div
                    key={item.intent}
                    className="p-5"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <code
                        className="text-[12px] font-mono font-semibold"
                        style={{ color: "var(--accent)" }}
                      >
                        {item.intent}
                      </code>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        &middot; {item.desc}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {item.dimensions.map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center justify-between"
                        >
                          <span
                            className="text-[11px] font-mono"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {d.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1 rounded-full"
                              style={{
                                width: `${d.weight * 2.5}px`,
                                background: "var(--neon-green)",
                                opacity: 0.6,
                              }}
                            />
                            <span
                              className="text-[10px] font-mono tabular-nums w-7 text-right"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {d.weight}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Scoring Functions ── */}
            <Section id="scoring" title="How Each Score Is Calculated">
              <p
                className="text-[13px] mb-6 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Each dimension has a dedicated scoring function. Inputs go in,
                a number between 0 and 100 comes out. No randomness. No
                AI-generated numbers. Below is a plain-English breakdown of
                every function.
              </p>

              {/* Core dimensions */}
              <div
                className="text-[9px] font-mono uppercase tracking-wider mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Core Dimensions
              </div>
              <div
                className="border mb-8"
                style={{ borderColor: "var(--border)" }}
              >
                {SCORING_FUNCTIONS.map((fn, i) => (
                  <div
                    key={fn.label}
                    className={`px-5 py-4 ${
                      i < SCORING_FUNCTIONS.length - 1 ? "border-b" : ""
                    }`}
                    style={{
                      borderColor: "var(--border)",
                      background:
                        i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <fn.icon
                        size={14}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fn.label}
                      </span>
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 ml-1"
                        style={{
                          color: "var(--text-tertiary)",
                          background: "var(--bg-active)",
                        }}
                      >
                        {fn.intents}
                      </span>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {fn.explanation}
                    </p>
                  </div>
                ))}
              </div>

              {/* Business-specific */}
              <div
                className="text-[9px] font-mono uppercase tracking-wider mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Business Intent: Derived Dimensions
              </div>
              <p
                className="text-[12px] mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Business reports use derived scores that combine transport,
                amenity, and deprivation data into commercially relevant
                metrics.
              </p>
              <div
                className="border mb-8"
                style={{ borderColor: "var(--border)" }}
              >
                {BUSINESS_SCORING.map((fn, i) => (
                  <div
                    key={fn.label}
                    className={`px-5 py-4 ${
                      i < BUSINESS_SCORING.length - 1 ? "border-b" : ""
                    }`}
                    style={{
                      borderColor: "var(--border)",
                      background:
                        i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp
                        size={14}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fn.label}
                      </span>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {fn.explanation}
                    </p>
                  </div>
                ))}
              </div>

              {/* Investing-specific */}
              <div
                className="text-[9px] font-mono uppercase tracking-wider mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Investing Intent: Derived Dimensions
              </div>
              <p
                className="text-[12px] mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Investing reports combine deprivation data, transport
                connectivity, crime statistics, and flood risk into
                investment-focused metrics.
              </p>
              <div
                className="border"
                style={{ borderColor: "var(--border)" }}
              >
                {INVESTING_SCORING.map((fn, i) => (
                  <div
                    key={fn.label}
                    className={`px-5 py-4 ${
                      i < INVESTING_SCORING.length - 1 ? "border-b" : ""
                    }`}
                    style={{
                      borderColor: "var(--border)",
                      background:
                        i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge
                        size={14}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fn.label}
                      </span>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {fn.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── What AI Does ── */}
            <Section id="ai-role" title="What AI Does (and Does Not Do)">
              <div
                className="border mb-6"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="px-5 py-3 border-b"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div
                    className="text-[9px] font-mono uppercase tracking-wider"
                    style={{ color: "var(--neon-green)" }}
                  >
                    The Pipeline
                  </div>
                </div>
                <div
                  className="grid grid-cols-1 sm:grid-cols-4 gap-px"
                  style={{ background: "var(--border)" }}
                >
                  {[
                    {
                      step: "1",
                      title: "Fetch Data",
                      desc: "5 APIs queried in parallel for the target location",
                    },
                    {
                      step: "2",
                      title: "Compute Scores",
                      desc: "Deterministic functions produce locked 0-100 scores",
                    },
                    {
                      step: "3",
                      title: "AI Narrates",
                      desc: "Claude receives locked scores + raw data, writes the report",
                    },
                    {
                      step: "4",
                      title: "Enforce Scores",
                      desc: "Server overwrites any AI deviation with computed values",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="p-4"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold"
                          style={{
                            background: "var(--neon-green-dim)",
                            color: "var(--neon-green)",
                          }}
                        >
                          {item.step}
                        </span>
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.title}
                        </span>
                      </div>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="border"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="hidden sm:grid grid-cols-2 gap-px"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="px-5 py-2 text-[9px] font-mono uppercase tracking-wider"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--neon-green)",
                    }}
                  >
                    AI Does
                  </div>
                  <div
                    className="px-5 py-2 text-[9px] font-mono uppercase tracking-wider"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--neon-red)",
                    }}
                  >
                    AI Does Not
                  </div>
                </div>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-px"
                  style={{ background: "var(--border)" }}
                >
                  <div className="p-5" style={{ background: "var(--bg)" }}>
                    <div
                      className="sm:hidden text-[9px] font-mono uppercase tracking-wider mb-3"
                      style={{ color: "var(--neon-green)" }}
                    >
                      AI Does
                    </div>
                    <div className="space-y-2">
                      {[
                        "Write the executive summary",
                        "Author detailed analysis sections",
                        "Generate actionable recommendations",
                        "Interpret raw data points in context",
                        "Explain what scores mean for your use case",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-2 text-[12px]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <span
                            className="text-[10px] mt-0.5"
                            style={{ color: "var(--neon-green)" }}
                          >
                            +
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5" style={{ background: "var(--bg)" }}>
                    <div
                      className="sm:hidden text-[9px] font-mono uppercase tracking-wider mb-3"
                      style={{ color: "var(--neon-red)" }}
                    >
                      AI Does Not
                    </div>
                    <div className="space-y-2">
                      {[
                        "Set or modify any numerical score",
                        "Choose dimension weights",
                        "Invent data points or statistics",
                        "Override the scoring engine",
                        "Influence the overall AreaIQ score",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-2 text-[12px]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <span
                            className="text-[10px] mt-0.5"
                            style={{ color: "var(--neon-red)" }}
                          >
                            -
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="mt-4 p-3 border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  className="text-[11px] font-mono font-semibold mb-1"
                  style={{ color: "var(--neon-amber)" }}
                >
                  Server-Side Enforcement
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Even if the AI model returns different numbers in its
                  response, the server replaces them with the pre-computed
                  scores before saving the report. The numbers you see are
                  always the output of the deterministic scoring engine.
                </p>
              </div>
            </Section>

            {/* ── Overall Score ── */}
            <Section id="overall-score" title="Overall Score">
              <p
                className="text-[13px] mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                The AreaIQ overall score is a weighted average of all dimension
                scores for the selected intent. Each dimension contributes
                proportionally to its weight.
              </p>

              <div
                className="border p-5 mb-4"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  className="text-[9px] font-mono uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Formula
                </div>
                <div
                  className="text-[13px] font-mono leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                >
                  overall = round( (score<sub>1</sub> &times; weight
                  <sub>1</sub> + score<sub>2</sub> &times; weight<sub>2</sub> +
                  ... + score<sub>n</sub> &times; weight<sub>n</sub>) / 100 )
                </div>
              </div>

              <div
                className="border p-5"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div
                  className="text-[9px] font-mono uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Example: Moving Intent
                </div>
                <div className="space-y-1">
                  {[
                    { dim: "Safety", score: 72, weight: 25, product: "1800" },
                    { dim: "Schools", score: 64, weight: 20, product: "1280" },
                    {
                      dim: "Transport",
                      score: 81,
                      weight: 20,
                      product: "1620",
                    },
                    {
                      dim: "Amenities",
                      score: 58,
                      weight: 15,
                      product: "870",
                    },
                    {
                      dim: "Cost of Living",
                      score: 45,
                      weight: 20,
                      product: "900",
                    },
                  ].map((row) => (
                    <div
                      key={row.dim}
                      className="flex items-center text-[11px] font-mono"
                    >
                      <span
                        className="w-28"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {row.dim}
                      </span>
                      <span
                        className="w-12 text-right tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.score}
                      </span>
                      <span
                        className="w-8 text-center"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        &times;
                      </span>
                      <span
                        className="w-10 text-right tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.weight}
                      </span>
                      <span
                        className="w-8 text-center"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        =
                      </span>
                      <span
                        className="w-14 text-right tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {row.product}
                      </span>
                    </div>
                  ))}
                  <div
                    className="border-t pt-2 mt-2 flex items-center text-[11px] font-mono"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span
                      className="w-28"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Total
                    </span>
                    <span className="w-12" />
                    <span className="w-8" />
                    <span className="w-10" />
                    <span
                      className="w-8 text-center"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      =
                    </span>
                    <span
                      className="w-14 text-right tabular-nums font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      6470
                    </span>
                  </div>
                  <div className="flex items-center text-[11px] font-mono">
                    <span
                      className="w-28"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      / 100
                    </span>
                    <span className="w-12" />
                    <span className="w-8" />
                    <span className="w-10" />
                    <span
                      className="w-8 text-center"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      =
                    </span>
                    <span
                      className="w-14 text-right tabular-nums font-bold"
                      style={{ color: "var(--neon-green)" }}
                    >
                      65
                    </span>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Score Scale ── */}
            <Section id="score-scale" title="Score Scale">
              <p
                className="text-[13px] mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Scores are colour-coded using a RAG (Red, Amber, Green) system
                across every report. This applies to both dimension scores and
                the overall AreaIQ score.
              </p>

              <div
                className="border"
                style={{ borderColor: "var(--border)" }}
              >
                {[
                  {
                    range: "70 - 100",
                    label: "Strong",
                    color: "var(--neon-green)",
                    colorDim: "var(--neon-green-dim)",
                    desc: "The area performs well in this dimension. A strong foundation with no major concerns. For overall scores, this indicates a highly suitable location for your stated intent.",
                  },
                  {
                    range: "45 - 69",
                    label: "Moderate",
                    color: "var(--neon-amber)",
                    colorDim: "var(--neon-amber-dim)",
                    desc: "The area is adequate but has room for improvement. Some trade-offs to consider. Worth investigating further before making decisions.",
                  },
                  {
                    range: "0 - 44",
                    label: "Weak",
                    color: "var(--neon-red)",
                    colorDim: "var(--neon-red-dim)",
                    desc: "The area underperforms in this dimension. Significant challenges identified. Does not necessarily disqualify the area, but indicates a specific weakness worth understanding.",
                  },
                ].map((tier, i, arr) => (
                  <div
                    key={tier.label}
                    className={`px-5 py-5 ${
                      i < arr.length - 1 ? "border-b" : ""
                    }`}
                    style={{
                      borderColor: "var(--border)",
                      background:
                        i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-[11px] font-mono font-bold px-2 py-0.5"
                        style={{ color: tier.color, background: tier.colorDim }}
                      >
                        {tier.range}
                      </span>
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: tier.color }}
                      >
                        {tier.label}
                      </span>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {tier.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 p-3 border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  className="text-[11px] font-mono font-semibold mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  A Note on Interpretation
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  A low score in one dimension does not make an area
                  unsuitable. Context matters. A business location with a low
                  competition score (meaning heavy saturation) might still
                  succeed with strong differentiation. Read the narrative
                  sections alongside the numbers.
                </p>
              </div>
            </Section>

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
