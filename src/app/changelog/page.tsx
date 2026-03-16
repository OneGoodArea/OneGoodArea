import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Changelog | AreaIQ",
  description: "Product updates, new features, and improvements to AreaIQ. See what we ship, month by month.",
  openGraph: {
    title: "Changelog | AreaIQ",
    description: "Product updates, new features, and improvements to AreaIQ.",
    type: "article",
    url: "https://www.area-iq.co.uk/changelog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Changelog | AreaIQ", description: "Product updates, new features, and improvements to AreaIQ." },
  alternates: { canonical: "https://www.area-iq.co.uk/changelog" },
};

type EntryType = "feature" | "fix" | "improvement";

interface ChangelogEntry {
  type: EntryType;
  title: string;
  description?: string;
}

interface ChangelogMonth {
  month: string;
  entries: ChangelogEntry[];
}

const BADGE_STYLES: Record<EntryType, { color: string; bg: string }> = {
  feature: { color: "var(--neon-green)", bg: "var(--neon-green-dim)" },
  fix: { color: "var(--neon-amber)", bg: "var(--neon-amber-dim)" },
  improvement: { color: "var(--accent)", bg: "var(--accent-dim)" },
};

const CHANGELOG: ChangelogMonth[] = [
  {
    month: "March 2026",
    entries: [
      {
        type: "feature",
        title: "IMD 2025 upgrade",
        description:
          "English deprivation data upgraded from IMD 2019 to IMD 2025 (published October 2025). Now covers 33,755 neighbourhoods using the latest census boundaries.",
      },
      {
        type: "feature",
        title: "Blog",
        description:
          "New /blog section with data-driven posts on UK areas, property investment, and home buying.",
      },
      {
        type: "feature",
        title: "Dark/light theme toggle",
        description:
          "Switch between dark and light mode from the navbar. Warm milky off-white palette in light mode. Persists across sessions.",
      },
      {
        type: "feature",
        title: "HM Land Registry integration",
        description:
          "6th live data source. SPARQL queries against the Land Registry Price Paid API return real sold prices by postcode district. Median price, YoY trends, property type breakdown, tenure split, and price range.",
      },
      {
        type: "feature",
        title: "Property Market panel",
        description:
          "New report section showing local property market data from HM Land Registry. Gated to Pro and above, with a teaser for free and starter plans.",
      },
      {
        type: "feature",
        title: "Data freshness badges",
        description:
          "Colour-coded badges on every report showing the age and source of each data point. Live, recent, or static.",
      },
      {
        type: "fix",
        title: "Geocode accuracy for place names",
        description:
          "Searching by city name (e.g. Oxford) now correctly resolves to the city, not a small suburb with the same name. Results ranked by settlement type.",
      },
      {
        type: "improvement",
        title: "Country-specific deprivation indices",
        description:
          "Deprivation data now uses country-specific indices: SIMD 2020 for Scotland, WIMD 2019 for Wales, IMD 2019 for England. All scoring and reasoning strings reference the correct index name and vintage explicitly.",
      },
      {
        type: "improvement",
        title: "SEO enrichment across all pages",
        description:
          "Full OpenGraph, Twitter cards, and canonical URLs on all 11 public pages. Semantic heading hierarchy, internal linking between area pages, and FAQPage structured data on the help page.",
      },
      {
        type: "feature",
        title: "12 UK area pages",
        description:
          "Programmatic SEO pages for London, Manchester, Cardiff, Liverpool, Glasgow, Belfast, Edinburgh, Birmingham, Leeds, Bristol, Sheffield, and Nottingham. Real scored data from 6 live sources.",
      },
      {
        type: "feature",
        title: "Saved areas watchlist",
        description:
          "Save areas from reports, view them on a dashboard grid, and export filtered reports as CSV.",
      },
      {
        type: "improvement",
        title: "Accessibility and security audit",
        description:
          "WCAG AA contrast, ARIA landmarks, 48px touch targets, and 7 security headers.",
      },
      {
        type: "feature",
        title: "Interactive API playground",
        description:
          "Live playground on the docs page with curated postcodes, intent selector, score visualisation, and raw JSON toggle.",
      },
      {
        type: "feature",
        title: "Password reset and email resend",
        description:
          "Forgot password flow with branded email and 1-hour token expiry. Resend verification from sign-up.",
      },
      {
        type: "feature",
        title: "Report deletion",
        description:
          "Delete reports from the dashboard with a branded confirmation modal.",
      },
      {
        type: "improvement",
        title: "Adaptive CTAs and plan badges",
        description:
          "Landing page CTAs adapt to session state. Pricing page badges show your current plan.",
      },
      {
        type: "feature",
        title: "B2B landing page",
        description:
          "Dedicated /business page with capabilities, use cases, API preview, and pricing summary.",
      },
      {
        type: "feature",
        title: "Embeddable widget",
        description:
          "Drop a single script tag on any page to show AreaIQ scores. No API key needed. Dark and light themes.",
      },
      {
        type: "feature",
        title: "API pricing tiers: Developer, Business, Growth",
        description:
          "New API plans from £49/mo (100 reports) to £499/mo (1,500 reports). Enterprise pricing on request.",
      },
      {
        type: "feature",
        title: "Deterministic scoring badge",
        description:
          "Trust signal on every report confirming scores are computed deterministically",
      },
      {
        type: "feature",
        title: "Report caching layer",
        description:
          "24-hour cache by postcode and intent. Repeat queries skip all API calls for instant results.",
      },
      {
        type: "feature",
        title: "API usage dashboard",
        description:
          "Request stats, 30-day chart, and key activity for API plan users",
      },
      {
        type: "feature",
        title: "Report email delivery",
        description:
          "Branded email with score summary sent after every report",
      },
      {
        type: "feature",
        title: "Input validation and error boundaries",
        description:
          "Sanitised inputs, branded error pages for crashes",
      },
      {
        type: "feature",
        title: "Dashboard onboarding",
        description:
          "Welcome card with suggested postcodes for new users",
      },
      {
        type: "feature",
        title: "Webhook idempotency",
        description:
          "Prevents duplicate processing on Stripe retries",
      },
      {
        type: "improvement",
        title: "Admin analytics enrichment",
        description:
          "Conversion funnel, intent distribution, MRR panel",
      },
      {
        type: "feature",
        title: "Toast notifications",
        description:
          "Slide-in feedback for actions across the app",
      },
      {
        type: "feature",
        title: "In-app subscription cancellation",
        description:
          "Cancel Stripe plan directly from settings",
      },
      {
        type: "feature",
        title: "Rate limiting",
        description:
          "Sliding window protection on report and API endpoints",
      },
      {
        type: "feature",
        title: "Self-serve account deletion",
        description:
          "Delete all data from settings with confirmation",
      },
      {
        type: "feature",
        title: "Terms of Service and Privacy Policy",
        description: "GDPR-compliant legal pages",
      },
      {
        type: "feature",
        title: "Custom 404 page",
        description: "Terminal-style branded error display",
      },
      {
        type: "feature",
        title: "About page",
        description:
          "Animated story, architecture pipeline, data source feed",
      },
      {
        type: "improvement",
        title: "Comparison page polish",
        description: "Area-type badges, share buttons",
      },
      {
        type: "feature",
        title: "Skeleton loading states",
        description:
          "Loading UI for reports, dashboard, and comparisons",
      },
      {
        type: "improvement",
        title: "Dashboard polish",
        description: "Search, filter by intent, sort by date/score/area",
      },
      {
        type: "feature",
        title: "Share buttons",
        description:
          "WhatsApp, LinkedIn, X, and copy link on reports",
      },
      {
        type: "feature",
        title: "Area-type aware scoring",
        description: "Urban, suburban, and rural benchmarks",
      },
      {
        type: "feature",
        title: "PDF export",
        description:
          "Branded dark-theme downloadable report (Starter+ only)",
      },
      {
        type: "feature",
        title: "Methodology page",
        description:
          "Full scoring documentation with formulas and weights",
      },
    ],
  },
  {
    month: "February 2026",
    entries: [
      {
        type: "feature",
        title: "Deterministic scoring engine",
        description:
          "16 functions, 4 intent profiles, transparent reasoning",
      },
      {
        type: "improvement",
        title: "Landing page differentiation",
        description: '"Why AreaIQ" section, LSOA granularity',
      },
      {
        type: "fix",
        title: "LSOA code lookup",
        description: "Fixed silent IMD lookup failures",
      },
      {
        type: "fix",
        title: "Violent crime pattern matching",
        description: "Catches all crime category variations",
      },
      {
        type: "feature",
        title: "Dynamic OG images",
        description:
          "Rich link previews for WhatsApp, LinkedIn, Slack",
      },
      {
        type: "feature",
        title: "Email verification",
        description: "Branded Resend templates with token flow",
      },
      {
        type: "feature",
        title: "Hero redesign",
        description: "Terminal-style animated data feed",
      },
      {
        type: "feature",
        title: "Live Stripe payments",
        description: "4-tier credit model with webhooks",
      },
      {
        type: "feature",
        title: "Activity tracking and admin dashboard",
        description: "Custom analytics, no third-party tools",
      },
      {
        type: "improvement",
        title: "Mobile responsiveness",
        description: "Responsive tables and layouts across all pages",
      },
      {
        type: "feature",
        title: "Settings page",
        description: "Password change, account info",
      },
    ],
  },
  {
    month: "January 2026",
    entries: [
      {
        type: "feature",
        title: "Interactive report display",
        description:
          "Radar chart, collapsible sections, score context bar",
      },
      {
        type: "feature",
        title: "Help and support page",
        description: "FAQ, contact email",
      },
      {
        type: "feature",
        title: "Pricing page",
        description:
          "4-tier credit-based model with comparison table",
      },
      {
        type: "feature",
        title: "API documentation",
        description: "Public docs page with code examples",
      },
      {
        type: "feature",
        title: "Area comparison",
        description: "Side-by-side scoring of two locations",
      },
      {
        type: "feature",
        title: "Public REST API",
        description: "Bearer auth, API key management",
      },
      {
        type: "feature",
        title: "Stripe integration",
        description: "Checkout, portal, webhook handling",
      },
      {
        type: "feature",
        title: "NextAuth migration",
        description: "Self-hosted auth replacing Clerk",
      },
      {
        type: "feature",
        title: "Report generator",
        description:
          "AI-narrated area intelligence from 5 data sources",
      },
      {
        type: "feature",
        title: "Core platform",
        description: "Dashboard, auth, database, deployment to Vercel",
      },
    ],
  },
];

function Badge({ type }: { type: EntryType }) {
  const style = BADGE_STYLES[type];
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 shrink-0"
      style={{ color: style.color, background: style.bg }}
    >
      {type}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Changelog" }]}>
        <Link
          href="/report"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Try it
          <ArrowRight size={11} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-[22px] font-semibold tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Changelog
          </h1>
          <p
            className="text-[13px]"
            style={{ color: "var(--text-secondary)" }}
          >
            New features, fixes, and improvements shipped to AreaIQ.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-10">
          {CHANGELOG.map((group) => (
            <section key={group.month}>
              {/* Month header */}
              <div className="mb-4">
                <h2
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {group.month}
                </h2>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {group.entries.length} update
                  {group.entries.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Entries */}
              <div>
                {group.entries.map((entry, i) => (
                  <div
                    key={i}
                    className="py-3 flex items-start gap-3"
                    style={{
                      borderBottom:
                        i < group.entries.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <div className="mt-0.5">
                      <Badge type={entry.type} />
                    </div>
                    <div>
                      <div
                        className="text-[13px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {entry.title}
                      </div>
                      {entry.description && (
                        <div
                          className="text-[11px] mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {entry.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer maxWidth="800px" />
    </div>
  );
}
