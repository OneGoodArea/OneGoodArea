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
  title: "Scoring Methodology | AreaIQ",
  description: "How AreaIQ scores areas: transparent, deterministic formulas applied to 6 live UK data sources. Same postcode, same score, every time.",
  openGraph: {
    title: "Scoring Methodology | AreaIQ",
    description: "Transparent, deterministic scoring applied to 6 live UK data sources. Same postcode, same score, every time.",
    type: "article",
    url: "https://www.area-iq.co.uk/methodology",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Scoring Methodology | AreaIQ", description: "Transparent, deterministic scoring applied to 6 live UK data sources." },
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
    name: "ONS / IMD 2025",
    provider: "MHCLG via ArcGIS",
    radius: "LSOA boundary",
    data: "Index of Multiple Deprivation. Ranks 33,755 Lower Super Output Areas across income, employment, health, education, and living environment. Decile 1 = most deprived, decile 10 = least deprived.",
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
  {
    name: "HM Land Registry",
    provider: "Price Paid Data",
    radius: "Postcode district",
    data: "Actual sold prices from the last 12 months via SPARQL query. Median and mean prices, year-on-year change, property type breakdown (detached, semi, terraced, flat), tenure split, and price range.",
  },
];

const INTENT_DIMENSIONS = [
  {
    intent: "moving",
    label: "Moving",
    desc: "Residential relocation",
    dimensions: ["Safety", "Schools", "Transport", "Amenities", "Cost of Living"],
  },
  {
    intent: "business",
    label: "Business",
    desc: "Commercial viability",
    dimensions: ["Foot Traffic", "Competition", "Transport", "Spending Power", "Commercial Costs"],
  },
  {
    intent: "investing",
    label: "Investing",
    desc: "Property investment",
    dimensions: ["Price Growth", "Rental Yield", "Regeneration", "Tenant Demand", "Risk Factors"],
  },
  {
    intent: "research",
    label: "Research",
    desc: "General area profile",
    dimensions: ["Safety", "Transport", "Amenities", "Demographics", "Environment"],
  },
];

const SCORING_FUNCTIONS = [
  {
    icon: Shield,
    label: "Safety",
    intents: "Moving, Research",
    explanation:
      "Analyses 3 months of police.uk crime data using a non-linear curve that penalises high-crime areas more sharply. Adjusts for violent crime concentration and month-on-month trends. Areas with rising crime are penalised; areas with falling crime are rewarded.",
  },
  {
    icon: Train,
    label: "Transport",
    intents: "Moving, Business, Research",
    explanation:
      "Measures rail/tube stations and bus stops with diminishing returns for each additional station. Combines heavy rail connectivity with local bus coverage into a single accessibility score. Benchmarked against area type (urban, suburban, rural).",
  },
  {
    icon: GraduationCap,
    label: "Schools",
    intents: "Moving",
    explanation:
      "Counts schools and educational facilities nearby using a diminishing returns curve. Having at least one good school matters more than having many. Benchmarks adjust for area type so rural areas are not penalised for fewer institutions.",
  },
  {
    icon: Store,
    label: "Amenities",
    intents: "Moving, Research",
    explanation:
      "A weighted composite across five categories: education, food and drink, healthcare, retail, and green spaces. Each category is normalised against area-type benchmarks and combined into a single convenience score.",
  },
  {
    icon: Users,
    label: "Demographics",
    intents: "Research",
    explanation:
      "Derived from government deprivation indices (IMD for England, WIMD for Wales, SIMD for Scotland). Maps the official decile ranking to a score reflecting the socioeconomic profile of the neighbourhood, including the LSOA's national rank and percentile position.",
  },
  {
    icon: TreePine,
    label: "Environment",
    intents: "Moving, Research",
    explanation:
      "Combines flood risk zones, active flood warnings, and green space availability. Areas with no flood risk and good park access score highest. Active warnings have significant negative impact. Data from the Environment Agency and OpenStreetMap.",
  },
  {
    icon: Scale,
    label: "Cost of Living",
    intents: "Moving",
    explanation:
      "Uses Land Registry sold prices as the primary input. When price data is available, scores are based on the ratio of local median prices to the national median. Falls back to deprivation data as a proxy when transaction data is unavailable.",
  },
];

const BUSINESS_SCORING = [
  {
    label: "Foot Traffic",
    explanation:
      "Combines transport connectivity with commercial activity density. Areas with strong rail, bus, and retail presence indicate higher natural footfall. Both components are weighted and capped to prevent outliers.",
  },
  {
    label: "Competition",
    explanation:
      "Measures commercial saturation by counting food, drink, and retail venues nearby, then inverts the count. Lower competition density scores higher. Useful for identifying underserved areas with unmet demand.",
  },
  {
    label: "Spending Power",
    explanation:
      "Derived from deprivation indices as a proxy for local disposable income. Less deprived areas indicate higher average spending power. Correlates with footfall quality, not just volume.",
  },
  {
    label: "Commercial Costs",
    explanation:
      "Uses Land Registry property values as a proxy for commercial rents and overheads. Higher local property prices correlate with higher commercial costs, resulting in a lower score. Falls back to deprivation data when price data is unavailable.",
  },
];

const INVESTING_SCORING = [
  {
    label: "Price Growth",
    explanation:
      "When Land Registry data is available, scores are based on real year-on-year price changes. Moderate growth scores highest; sharp declines and flat markets score lower. Falls back to deprivation-based growth potential estimates when transaction data is unavailable.",
  },
  {
    label: "Rental Yield",
    explanation:
      "Uses Land Registry median prices as the yield denominator. Lower property values indicate higher potential gross yields. Adjusts upward for strong local amenities and transport that drive tenant demand. Falls back to deprivation data when price data is unavailable.",
  },
  {
    label: "Regeneration",
    explanation:
      "Scores areas by development potential. Higher-deprivation areas with good transport links score highest, indicating opportunity for uplift. Already-developed premium areas score lower. Infrastructure investment is a key multiplier.",
  },
  {
    label: "Tenant Demand",
    explanation:
      "A composite of transport connectivity, local amenities, bus coverage, and commercial activity. Areas with strong infrastructure and varied amenities attract more tenants, driving occupancy and reducing void periods.",
  },
  {
    label: "Risk Factors",
    explanation:
      "Combines crime and environmental risk into a single downside metric. Low crime and no flood risk produce a high score. Areas with active flood warnings or elevated crime see significant score reductions.",
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
                  6 data sources &bull; 4 intent types &bull; no AI in the
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
                Every report is built from 6 live UK government and open data
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
                traffic and spending power. Weights are calibrated internally
                and are not published.
              </p>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-px"
                style={{ background: "var(--border)" }}
              >
                {INTENT_DIMENSIONS.map((item) => (
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
                          key={d}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="w-1 h-1 rounded-full"
                            style={{ background: "var(--neon-green)", opacity: 0.6 }}
                          />
                          <span
                            className="text-[11px] font-mono"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {d}
                          </span>
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
                      desc: "6 APIs queried in parallel for the target location",
                    },
                    {
                      step: "2",
                      title: "Compute Scores",
                      desc: "Deterministic functions produce locked 0-100 scores",
                    },
                    {
                      step: "3",
                      title: "AI Narrates",
                      desc: "AI Engine receives locked scores + raw data, writes the report",
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
                proportionally to its internally calibrated weight. The result
                is a single 0-100 number representing how well the area suits
                your stated purpose.
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
                  How it works
                </div>
                <div className="space-y-2">
                  {[
                    "Each dimension is scored independently from 0 to 100",
                    "Dimensions are weighted according to the selected intent",
                    "The weighted scores are combined into a single overall score",
                    "The same postcode with the same data always produces the same number",
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
