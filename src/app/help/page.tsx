import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Mail, FileText, CreditCard, Key, MapPin } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Help & Support | OneGoodArea",
  description: "Get help with OneGoodArea: area intelligence reports, billing, API access, and more. FAQs on scoring, data sources, plans, and API keys.",
  openGraph: {
    title: "Help & Support | OneGoodArea",
    description: "Get help with OneGoodArea: area intelligence reports, billing, API access, and more.",
    type: "website",
    url: "https://www.area-iq.co.uk/help",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Help & Support | OneGoodArea", description: "Get help with OneGoodArea: area intelligence reports, billing, API access, and more." },
  alternates: { canonical: "https://www.area-iq.co.uk/help" },
};

const topics = [
  {
    icon: MapPin,
    title: "Reports",
    desc: "How reports work, data sources, scoring methodology, and intent types.",
    items: [
      { q: "What data sources are used?", a: "Every report uses 7 live UK data sources: Postcodes.io (geocoding), Police.uk (crime data), IMD 2025 (deprivation), OpenStreetMap (amenities), Environment Agency (flood risk), HM Land Registry (property prices), and Ofsted (school inspection ratings, England only)." },
      { q: "How are scores calculated?", a: "Each report scores your area across 5 dimensions, weighted by intent. A 'moving' report prioritises Safety, Schools, and Transport. A 'business' report focuses on Foot Traffic and Spending Power. All scores are deterministic. See our Methodology page for more details." },
      { q: "What are the intent types?", a: "Moving (residential relocation), Business (commercial viability), Investing (property investment), and Research (general area profile). Each uses different scoring dimensions and weights." },
      { q: "Can I share my reports?", a: "Yes. Every report has share buttons for WhatsApp, LinkedIn, X, and a copy link button. Reports have permanent URLs that anyone can view without an account." },
      { q: "Can I download a report as PDF?", a: "Yes, on Starter plans and above. Click the PDF button on any report to download a branded PDF you can share with clients or attach to property offers." },
      { q: "Do I get emailed my reports?", a: "Yes. Every report is automatically emailed to you with a score summary as soon as it is generated. No extra setup needed." },
      { q: "What is the watchlist?", a: "Save any area from a report to your watchlist. View all saved areas on your dashboard, filter them, and export the list as a CSV file." },
      { q: "What are data freshness badges?", a: "Every report shows colour-coded badges indicating the source and age of each data point, so you know exactly how current the information is." },
      { q: "What is the Nearby Schools panel?", a: "For English postcodes, every report shows Ofsted inspection ratings for schools within 1.5km. You can see each school's name, type, rating (Outstanding, Good, Requires Improvement, or Inadequate), and distance. School quality also factors into the Schools and Education score. Scotland and Wales support is planned." },
      { q: "What is the Property Market panel?", a: "Available on Pro plans and above. It shows real sold prices from HM Land Registry for the local postcode district: median price, year-on-year trends, property type breakdown, tenure split, and price range." },
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    desc: "Pricing tiers, upgrades, cancellations, and invoices.",
    items: [
      { q: "What plans are available?", a: "Web reports: Free (3/month), Starter £29/mo (20), Pro £79/mo (75). API access: Developer £49/mo (100), Business £249/mo (500), Growth £499/mo (1,500). Enterprise pricing available on request." },
      { q: "How do I upgrade?", a: "Go to the Pricing page and select your plan. Payment is handled securely via Stripe." },
      { q: "Can I cancel anytime?", a: "Yes. Cancel from your dashboard via the billing portal. You'll keep access until the end of your billing period." },
      { q: "What happens if I hit my limit?", a: "You'll see a prompt to upgrade. Your existing reports remain accessible, you just can't generate new ones until your limit resets on the 1st of the month." },
    ],
  },
  {
    icon: Key,
    title: "API Access",
    desc: "API keys, integration, rate limits, and documentation.",
    items: [
      { q: "How do I get API access?", a: "Subscribe to a Developer (£49/mo), Business (£249/mo), or Growth (£499/mo) plan, then generate API keys from your dashboard." },
      { q: "Where are the API docs?", a: "Full documentation with code examples in cURL, Node.js, Python, and Go is available at /docs." },
      { q: "What are the rate limits?", a: "API plans include 100 to 1,500 reports/month depending on tier. Rate limit is 30 requests per minute. Each report takes 10-20 seconds due to live data fetching." },
      { q: "Can I revoke an API key?", a: "Yes. Revoke any key instantly from your dashboard. The key stops working immediately." },
    ],
  },
  {
    icon: FileText,
    title: "Account",
    desc: "Sign in, sign up, and account management.",
    items: [
      { q: "How do I sign up?", a: "Sign up with Google or create an account with email and password at /sign-up." },
      { q: "Can I use GitHub to sign in?", a: "GitHub sign-in is coming soon. Currently Google and email/password are supported." },
      { q: "How do I delete my account?", a: "Contact us at hello@area-iq.co.uk and we'll process your request within 48 hours." },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Help" }]} maxWidth="900px">
        <Link
          href="/report"
          className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Go to App
          <ArrowRight size={12} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[900px] w-full mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Help & Support
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Find answers below or reach out directly. We typically respond within 24 hours.
          </p>
        </div>

        {/* Contact Card */}
        <div
          className="border p-6 mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: "var(--neon-green-dim)" }}
            >
              <Mail size={14} style={{ color: "var(--neon-green)" }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Email Support
              </div>
              <div className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                For bugs, feature requests, account issues, or anything else
              </div>
            </div>
          </div>
          <a
            href="mailto:hello@area-iq.co.uk"
            className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors shrink-0"
            style={{ background: "var(--bg-active)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            hello@area-iq.co.uk
          </a>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {topics.map((topic) => (
            <div key={topic.title}>
              <div className="flex items-center gap-2 mb-4">
                <topic.icon size={14} style={{ color: "var(--text-tertiary)" }} />
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {topic.title}
                </h2>
                <span className="text-[10px] font-mono ml-1" style={{ color: "var(--text-tertiary)" }}>
                  · {topic.desc}
                </span>
              </div>

              <div className="border" style={{ borderColor: "var(--border)" }}>
                {topic.items.map((item, i) => (
                  <div
                    key={item.q}
                    className={i < topic.items.length - 1 ? "border-b" : ""}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="px-5 py-4" style={{ background: i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)" }}>
                      <div className="text-[13px] font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                        {item.q}
                      </div>
                      <div className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {item.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center border p-8" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <div className="text-[14px] font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Still need help?
          </div>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-tertiary)" }}>
            Drop us an email and we&apos;ll get back to you within 24 hours.
          </p>
          <a
            href="mailto:hello@area-iq.co.uk"
            className="inline-flex h-10 px-6 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
            style={{ background: "var(--text-primary)", color: "var(--bg)" }}
          >
            <Mail size={12} />
            Contact Us
          </a>
        </div>
        {/* FAQPage JSON-LD for Google rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: topics.flatMap((topic) =>
                topic.items.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.a,
                  },
                }))
              ),
            }),
          }}
        />
      </main>

      <Footer maxWidth="900px" />
    </div>
  );
}
