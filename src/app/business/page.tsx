"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, Code2, Globe, Shield, BarChart3, Key, Zap, Database, Clock, Users } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const SNIPPET = `curl -X POST https://www.area-iq.co.uk/api/v1/report \\
  -H "Authorization: Bearer aiq_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"area": "SW1A 1AA", "intent": "moving"}'`;

const RESPONSE = `{
  "id": "rpt_1710000000_abc123",
  "report": {
    "area": "Westminster, SW1A 1AA",
    "intent": "moving",
    "areaiq_score": 78,
    "area_type": "urban",
    "sub_scores": [
      { "label": "Safety", "score": 72, "weight": 25 },
      { "label": "Transport", "score": 94, "weight": 20 },
      { "label": "Schools", "score": 68, "weight": 20 },
      { "label": "Amenities", "score": 86, "weight": 20 },
      { "label": "Environment", "score": 70, "weight": 15 }
    ],
    "summary": "Westminster scores 78/100 for moving...",
    "sections": [ ... ],
    "recommendations": [ ... ]
  }
}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 transition-colors cursor-pointer"
      style={{ color: copied ? "var(--neon-green)" : "var(--text-tertiary)", background: "var(--bg-active)" }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function BusinessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Business" }]}>
        <Link
          href="/docs"
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 transition-colors hover:opacity-80"
          style={{ color: "var(--text-tertiary)" }}
        >
          API Docs
        </Link>
        <Link
          href="/pricing"
          className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          View Pricing <ArrowRight size={12} />
        </Link>
      </Navbar>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-24">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  For platforms, agents, and developers
                </span>
              </div>
              <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight leading-[1.1] mb-5" style={{ color: "var(--text-primary)" }}>
                Area intelligence<br />for your product
              </h1>
              <p className="text-[15px] leading-relaxed mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
                Embed scored UK area data into property portals, CRMs, relocation tools, and investment platforms. REST API or drop-in widget. No UK competitor offers this.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/pricing"
                  className="h-11 px-6 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                  style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                >
                  Start Building <ArrowRight size={12} />
                </Link>
                <a
                  href="mailto:hello@area-iq.co.uk?subject=Enterprise API enquiry"
                  className="h-11 px-6 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                  style={{ background: "var(--bg-active)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-20">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--neon-green)" }}>
              Capabilities
            </div>
            <h2 className="text-[24px] md:text-[30px] font-semibold tracking-tight mb-10" style={{ color: "var(--text-primary)" }}>
              Everything you need to integrate
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
              {[
                { icon: Key, title: "REST API", desc: "POST a postcode, get a full scored report. JSON response with overall score, 5 dimensions, AI narrative, and data-backed reasoning." },
                { icon: Globe, title: "Embed widget", desc: "Single script tag on any page. No API key needed. Score card renders automatically. Dark and light themes. Under 5KB." },
                { icon: Shield, title: "Deterministic scoring", desc: "16 scoring functions. Same postcode + same intent = same scores, every time. No AI hallucination. Transparent methodology." },
                { icon: Database, title: "5 live data sources", desc: "Police.uk crime data, ONS deprivation, OpenStreetMap amenities, Environment Agency flood risk, Postcodes.io classification." },
                { icon: Zap, title: "24h response cache", desc: "Repeat queries served instantly from cache. First request hits live APIs. Subsequent requests cost you nothing." },
                { icon: BarChart3, title: "Usage dashboard", desc: "Track API calls, monitor per-key activity, view 30-day trends. Real-time usage stats. All self-serve." },
              ].map((item) => (
                <div key={item.title} className="p-6" style={{ background: "var(--bg-elevated)" }}>
                  <item.icon size={16} style={{ color: "var(--accent)" }} />
                  <div className="text-[13px] font-semibold mt-3 mb-2" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-20">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--neon-amber)" }}>
              Use cases
            </div>
            <h2 className="text-[24px] md:text-[30px] font-semibold tracking-tight mb-10" style={{ color: "var(--text-primary)" }}>
              Who builds with AreaIQ
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
              {[
                {
                  title: "Estate agents",
                  desc: "Show area scores on every listing page. Help buyers understand safety, transport, and schools before they visit. Embed the widget or use the API to build custom integrations.",
                  example: "\"We added AreaIQ scores to our listings. Buyers now ask about area quality before price.\"",
                },
                {
                  title: "Property portals",
                  desc: "Enrich search results with area intelligence. Give users a reason to choose your portal over Rightmove. Score every listing automatically via the API.",
                  example: "Differentiate with data no other UK portal has.",
                },
                {
                  title: "Investment platforms",
                  desc: "Screen areas at scale for yield, safety, and growth potential. Compare 50 postcodes in minutes. Filter by intent-specific scores for buy-to-let, commercial, or development.",
                  example: "500+ API reports per month on the Business plan.",
                },
                {
                  title: "Relocation companies",
                  desc: "Score destination areas for corporate clients. Provide objective area intelligence alongside relocation packages. Automate area reports for every placement.",
                  example: "One API call per destination. Full report in 15 seconds.",
                },
              ].map((item) => (
                <div key={item.title} className="p-6" style={{ background: "var(--bg-elevated)" }}>
                  <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </div>
                  <div className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                    {item.desc}
                  </div>
                  <div className="text-[10px] font-mono italic" style={{ color: "var(--text-tertiary)" }}>
                    {item.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API Preview */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-20">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--neon-green)" }}>
              Developer experience
            </div>
            <h2 className="text-[24px] md:text-[30px] font-semibold tracking-tight mb-10" style={{ color: "var(--text-primary)" }}>
              One request. Full area intelligence.
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
              <div className="p-6" style={{ background: "var(--bg-elevated)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Request</span>
                  <CopyButton text={SNIPPET} />
                </div>
                <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto p-4" style={{ background: "var(--bg)", color: "var(--neon-green)", border: "1px solid var(--border)" }}>
                  {SNIPPET}
                </pre>
              </div>
              <div className="p-6" style={{ background: "var(--bg)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Response</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>200 OK</span>
                </div>
                <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto p-4" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  {RESPONSE}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6">
              <Link href="/docs" className="text-[11px] font-mono flex items-center gap-1.5 transition-colors hover:opacity-80" style={{ color: "var(--neon-green)" }}>
                <Code2 size={12} /> Full API documentation <ArrowRight size={10} />
              </Link>
              <Link href="/docs#embed" className="text-[11px] font-mono flex items-center gap-1.5 transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
                <Globe size={12} /> Widget embed docs <ArrowRight size={10} />
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing summary */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-20">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              API pricing
            </div>
            <h2 className="text-[24px] md:text-[30px] font-semibold tracking-tight mb-10" style={{ color: "var(--text-primary)" }}>
              Scale as you grow
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
              {[
                { name: "Developer", price: "£49", reports: "100", perReport: "£0.49", desc: "Solo devs, prototypes" },
                { name: "Business", price: "£249", reports: "500", perReport: "£0.50", desc: "Platforms, integrations", highlight: true },
                { name: "Growth", price: "£499", reports: "1,500", perReport: "£0.33", desc: "Portals, high volume" },
                { name: "Enterprise", price: "Custom", reports: "5,000+", perReport: "Custom", desc: "SLAs, annual contracts" },
              ].map((tier) => (
                <div key={tier.name} className="p-6 relative" style={{ background: "var(--bg-elevated)" }}>
                  {tier.highlight && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "var(--neon-green)" }} />}
                  <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{tier.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[28px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>{tier.price}</span>
                    {tier.price !== "Custom" && <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>/mo</span>}
                  </div>
                  <div className="text-[11px] font-mono mb-1" style={{ color: "var(--neon-green)" }}>{tier.reports} reports / month</div>
                  <div className="text-[10px] font-mono mb-2" style={{ color: "var(--text-tertiary)" }}>{tier.perReport} / report</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{tier.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6" style={{ color: "var(--text-tertiary)" }}>
              {[
                { icon: Clock, text: "Cancel anytime" },
                { icon: Shield, text: "No setup fee" },
                { icon: Users, text: "Self-serve onboarding" },
                { icon: Zap, text: "Cached queries are free" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <item.icon size={11} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="max-w-[1100px] mx-auto px-6 py-20 md:py-28 text-center">
            <h2 className="text-[26px] md:text-[34px] font-semibold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
              Ready to integrate?
            </h2>
            <p className="text-[14px] mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              Get API access in under 2 minutes. Create an account, subscribe to a plan, generate your key, and start building.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/pricing"
                className="h-12 px-10 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide"
                style={{ background: "var(--text-primary)", color: "var(--bg)" }}
              >
                Get API Access <ArrowRight size={13} />
              </Link>
              <a
                href="mailto:hello@area-iq.co.uk?subject=Enterprise API enquiry"
                className="h-12 px-10 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide"
                style={{ background: "var(--bg-active)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                Talk to Sales
              </a>
            </div>
            <div className="mt-4 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              Developer plan starts at £49/mo. No commitment.
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
