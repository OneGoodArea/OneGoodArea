"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /help
   FAQ + contact. Content ported from live /help, rewritten
   OneGoodArea throughout. JSON-LD preserved for rich snippets.
   ═══════════════════════════════════════════════════════════════ */

type QA = { q: string; a: string };
type Topic = { icon: IconName; title: string; desc: string; items: QA[] };

const TOPICS: Topic[] = [
  {
    icon: "map",
    title: "Reports",
    desc: "How reports work, data sources, scoring, and intent types.",
    items: [
      { q: "What data sources are used?",        a: "Every report uses seven live UK data sources: Postcodes.io (geocoding), Police.uk (crime data), IMD 2025 (deprivation), OpenStreetMap (amenities), Environment Agency (flood risk), HM Land Registry (property prices), and Ofsted (school inspection ratings, England only)." },
      { q: "How are scores calculated?",         a: "Each report scores your area across five dimensions, weighted by intent. A moving report prioritises Safety, Schools, and Transport. A business report focuses on Foot Traffic and Spending Power. The same inputs always produce the same output. See the Methodology page for more details." },
      { q: "What are the intent types?",          a: "Moving (residential relocation), Business (commercial viability), Investing (property investment), and Research (general area profile). Each uses different scoring dimensions and weights." },
      { q: "Can I share my reports?",             a: "Yes. Every report has share buttons for WhatsApp, LinkedIn, X, and a copy link button. Reports have permanent URLs that anyone can view without an account." },
      { q: "Can I download a report as PDF?",     a: "Yes, on Starter plans and above. Click the PDF button on any report to download a branded PDF you can share with clients or attach to property offers." },
      { q: "Do I get emailed my reports?",        a: "Yes. Every report is automatically emailed to you with a score summary as soon as it is generated. No extra setup needed." },
      { q: "What is the watchlist?",              a: "Save any area from a report to your watchlist. View all saved areas on your dashboard, filter them, and export the list as a CSV file." },
      { q: "What are data freshness badges?",     a: "Every report shows colour-coded badges indicating the source and age of each data point, so you know exactly how current the information is." },
      { q: "What is the Nearby Schools panel?",   a: "For English postcodes, every report shows Ofsted inspection ratings for schools within 1.5km. You can see each school's name, type, rating (Outstanding, Good, Requires Improvement, or Inadequate), and distance. School quality also factors into the Schools and Education score. Scotland and Wales support is planned." },
      { q: "What is the Property Market panel?",  a: "Available on Pro plans and above. It shows real sold prices from HM Land Registry for the local postcode district: median price, year-on-year trends, property type breakdown, tenure split, and price range." },
    ],
  },
  {
    icon: "gauge",
    title: "Billing + plans",
    desc: "Pricing tiers, upgrades, cancellations, and invoices.",
    items: [
      { q: "What plans are available?",           a: "Web reports: Free (3/month), Starter £29/mo (20), Pro £79/mo (75). API access: Developer £49/mo (100), Business £249/mo (500), Growth £499/mo (1,500). Enterprise pricing is available on request." },
      { q: "How do I upgrade?",                   a: "Go to the Pricing page and select your plan. Payment is handled securely via Stripe." },
      { q: "Can I cancel any time?",              a: "Yes. Cancel from your dashboard via the billing portal. You keep access until the end of your billing period." },
      { q: "What happens if I hit my limit?",     a: "You see a prompt to upgrade. Your existing reports remain accessible, you just can't generate new ones until your limit resets on the 1st of the month." },
    ],
  },
  {
    icon: "key",
    title: "API access",
    desc: "API keys, integration, rate limits, and documentation.",
    items: [
      { q: "How do I get API access?",            a: "Subscribe to a Developer (£49/mo), Business (£249/mo), or Growth (£499/mo) plan, then generate API keys from your dashboard." },
      { q: "Where are the API docs?",             a: "Full documentation with code examples in cURL, Node.js, Python, and Go is available at /docs." },
      { q: "What are the rate limits?",           a: "API plans include 100 to 1,500 reports/month depending on tier. Rate limit is 30 requests per minute per key. Cached responses (24 hours) don't count against your quota." },
      { q: "Can I revoke an API key?",            a: "Yes. Revoke any key instantly from your dashboard. The key stops working immediately." },
    ],
  },
  {
    icon: "researcher",
    title: "Account",
    desc: "Sign in, sign up, and account management.",
    items: [
      { q: "How do I sign up?",                   a: "Sign up with Google, GitHub, or create an account with email and password at /sign-up." },
      { q: "How do I reset my password?",         a: "Go to /forgot-password, enter the email you signed up with, and we'll send a reset link. Link expires in 1 hour." },
      { q: "How do I delete my account?",         a: "Contact us at hello@area-iq.co.uk and we'll process your request within 48 hours." },
    ],
  },
];

const ALL_QA: QA[] = TOPICS.flatMap((t) => t.items);

export default function HelpClient() {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <ContactCard />
      <Topics />
      <FinalCta />
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: ALL_QA.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </div>
  );
}

function Hero() {
  return (
    <section style={{
      position: "relative",
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: -220, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 520,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "100px 40px 40px",
        position: "relative", zIndex: 1, textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.24em", textTransform: "uppercase",
          color: "var(--text-2)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 22,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--signal)",
            animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
          }} />
          Help + support
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 58px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 16px",
        }}>
          How can we <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>help?</em>
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          margin: "0 auto", maxWidth: "56ch",
        }}>
          Answers below cover the common questions. If you don&apos;t see yours, drop us a line. We typically respond within 24 hours.
        </p>
      </div>
    </section>
  );
}

function ContactCard() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "40px 0 40px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          border: "1px solid var(--border)",
          padding: "22px 26px",
          background: "var(--bg-off)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 4,
              background: "var(--signal-dim)",
              border: "1px solid var(--ink-deep)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 8 L12 3 L20 8 V20 H4 Z" stroke="var(--ink-deep)" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M4 8 L12 13 L20 8" stroke="var(--ink-deep)" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{
                fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
                letterSpacing: "-0.012em", color: "var(--ink-deep)",
                marginBottom: 2,
              }}>Email support</div>
              <div style={{
                fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
                color: "var(--text-2)", lineHeight: 1.45,
              }}>Bugs, feature requests, account issues, or anything else.</div>
            </div>
          </div>
          <a href="mailto:hello@area-iq.co.uk" style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "12px 18px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            hello@area-iq.co.uk
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function Topics() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 100px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px" }}>
        {TOPICS.map((topic, i) => (
          <TopicBlock key={topic.title} topic={topic} first={i === 0} />
        ))}
      </div>
    </section>
  );
}

function TopicBlock({ topic, first }: { topic: Topic; first: boolean }) {
  return (
    <section style={{ marginTop: first ? 0 : 56 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        marginBottom: 22,
      }}>
        <AiqIcon name={topic.icon} size={26} />
        <h2 style={{
          fontFamily: "var(--display)", fontSize: "clamp(24px, 3vw, 30px)",
          fontWeight: 500, letterSpacing: "-0.014em",
          color: "var(--ink-deep)", lineHeight: 1.1,
          margin: 0,
        }}>{topic.title}</h2>
      </div>
      <p style={{
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--text-3)",
        margin: "0 0 20px",
      }}>{topic.desc}</p>
      <div style={{ border: "1px solid var(--border)" }}>
        {topic.items.map((item, i) => (
          <QARow key={item.q} item={item} isLast={i === topic.items.length - 1} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

function QARow({ item, isLast, defaultOpen }: {
  item: QA; isLast: boolean; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
      background: "var(--bg)",
    }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, padding: "20px 22px",
          background: "transparent", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{
          fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
          letterSpacing: "-0.012em", color: "var(--ink-deep)",
          lineHeight: 1.3,
        }}>{item.q}</span>
        <span aria-hidden style={{
          width: 22, height: 22, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border)", borderRadius: "50%",
          color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 12,
          background: open ? "var(--signal-dim)" : "transparent",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 240ms cubic-bezier(0.16,1,0.3,1), background 140ms",
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 600 : 0, overflow: "hidden",
        transition: "max-height 280ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          padding: "0 22px 22px",
          fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
          lineHeight: 1.6, color: "var(--text-2)",
          letterSpacing: "-0.003em",
          maxWidth: "72ch",
        }}>{item.a}</div>
      </div>
    </div>
  );
}

function FinalCta() {
  return (
    <section style={{
      background: "var(--bg-off)",
      padding: "80px 0 100px",
    }}>
      <div style={{
        maxWidth: 780, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(28px, 3.6vw, 40px)", lineHeight: 1.08,
          letterSpacing: "-0.016em", color: "var(--ink-deep)",
          margin: "0 0 12px",
        }}>
          Still stuck? <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
          }}>Tell us.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          margin: "0 auto 28px", maxWidth: "48ch",
        }}>
          Drop us an email and we&apos;ll get back to you within 24 hours.
        </p>
        <a href="mailto:hello@area-iq.co.uk" style={{
          fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--signal-ink)", background: "var(--signal)",
          padding: "13px 22px", borderRadius: 999, textDecoration: "none",
          border: "1px solid var(--ink-deep)",
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          Contact us
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </a>
        <div style={{
          marginTop: 22,
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <Link href="/design-v2/methodology" style={{ color: "var(--text-2)", textDecoration: "none", borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
            Methodology
          </Link>
          <span aria-hidden style={{ margin: "0 10px" }}>·</span>
          <Link href="/design-v2/docs" style={{ color: "var(--text-2)", textDecoration: "none", borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
            API docs
          </Link>
          <span aria-hidden style={{ margin: "0 10px" }}>·</span>
          <Link href="/design-v2/pricing" style={{ color: "var(--text-2)", textDecoration: "none", borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
            Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
