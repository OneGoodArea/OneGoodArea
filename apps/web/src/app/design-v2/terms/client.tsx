"use client";

import {
  LegalShell,
  LegalSection,
  LegalP,
  LegalEmph,
  LegalMail,
  LegalLink,
  type LegalSection as LegalSectionType,
} from "../_shared/legal-shell";

/* /terms — Brand v3 rewrite + content refresh (AR-204 PR).

   Content audited against current product state on 2026-06-02:
   - Pricing tiers refreshed to the 6 V2 plans (Sandbox / Starter /
     Build / Scale / Growth / Enterprise) verified against
     apps/web/src/lib/stripe.ts PLANS.
   - API access language updated: API is on ALL tiers including
     Sandbox (not just Developer/Business/Growth as the legacy
     text said).
   - Data source list refreshed against /methodology to include
     IMD 2025 + WIMD 2019 + SIMD 2020 separately, ONS NSPL, and
     Companies House. */

const SECTIONS: LegalSectionType[] = [
  { id: "acceptance",     label: "Acceptance" },
  { id: "account",        label: "Account registration" },
  { id: "subscriptions",  label: "Subscriptions + payments" },
  { id: "limits",         label: "Usage limits + soft caps" },
  { id: "api",            label: "API usage" },
  { id: "ip",             label: "Intellectual property" },
  { id: "accuracy",       label: "Data accuracy + disclaimer" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "termination",    label: "Termination" },
  { id: "liability",      label: "Limitation of liability" },
  { id: "law",            label: "Governing law" },
  { id: "contact",        label: "Contact" },
];

export default function TermsClient() {
  return (
    <LegalShell
      eyebrow="Legal · Terms of Service"
      title="Terms of Service"
      lastUpdated="2 June 2026"
      intro="These terms govern your use of OneGoodArea. By creating an account or using the service you agree to them. Read them carefully."
      sections={SECTIONS}
    >
      <LegalSection id="acceptance" n={1} title="Acceptance of terms">
        <LegalP>
          By accessing or using OneGoodArea (&quot;the Service&quot;),
          operated by OneGoodArea (&quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;), a sole trader registered in the United Kingdom,
          you agree to these Terms of Service. If you do not agree, you
          must not use the Service.
        </LegalP>
        <LegalP>
          We may update these terms from time to time. Continued use of
          the Service after changes constitutes acceptance of the revised
          terms. We will notify registered users of material changes via
          email.
        </LegalP>
      </LegalSection>

      <LegalSection id="account" n={2} title="Account registration">
        <LegalP>
          To use OneGoodArea you must create an account using Google OAuth,
          GitHub OAuth, or email and password. You are responsible for
          maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account.
        </LegalP>
        <LegalP>
          You must provide accurate, current information during registration.
          You must be at least 16 years old to create an account. We reserve
          the right to suspend or terminate accounts that violate these
          terms or contain false information.
        </LegalP>
      </LegalSection>

      <LegalSection id="subscriptions" n={3} title="Subscriptions and payments">
        <LegalP>
          OneGoodArea offers six tiers. Sandbox (free, no card required,
          35 API calls per month, hard cap, API and dashboard access).
          Starter (£49 per month, 1,500 calls, hard cap). Build (£149 per
          month, 6,000 calls, soft cap). Scale (£499 per month, 25,000
          calls, soft cap). Growth (£1,499 per month, 100,000 calls, soft
          cap, MCP add-on included). Enterprise (from £4,999 per month,
          250,000-call floor negotiated up, custom contract, MCP add-on
          included).
        </LegalP>
        <LegalP>
          The MCP add-on is available at £29 per month for Sandbox,
          Starter, Build, and Scale (and included free on Growth and
          Enterprise). It exposes the OneGoodArea API to Claude Desktop,
          Cursor, and any MCP-compatible client.
        </LegalP>
        <LegalP>
          All prices are in GBP and inclusive of applicable taxes. Paid
          subscriptions are billed monthly through Stripe. By subscribing
          to a paid plan you authorise us to charge your payment method on
          a recurring basis until you cancel. You can cancel at any time
          through the Stripe billing portal. Cancellation takes effect at
          the end of your current billing period and you retain access
          until then.
        </LegalP>
        <LegalP>
          We do not offer refunds for partial billing periods. If we
          change pricing, existing subscribers will be notified at least
          30 days in advance and the new pricing will apply from the next
          billing cycle. Legacy v1 consumer tiers (Free, Starter, Pro,
          Developer, Business, Growth on the old pricing scheme) were
          retired in April 2026; existing subscribers on those legacy
          tiers continue on their plan with the features they paid for.
        </LegalP>
      </LegalSection>

      <LegalSection id="limits" n={4} title="Usage limits and soft caps">
        <LegalP>
          Each plan includes a monthly API call allowance. The counter
          resets on the first day of each calendar month. Unused calls do
          not carry over.
        </LegalP>
        <LegalP>
          <LegalEmph>Hard-cap tiers (Sandbox, Starter).</LegalEmph> When
          you reach the included call count, further API calls return 402
          Payment Required and the dashboard prompts an upgrade. No
          overage charges apply.
        </LegalP>
        <LegalP>
          <LegalEmph>Soft-cap tiers (Build, Scale, Growth).</LegalEmph>{" "}
          You receive an additional 25 percent headroom above the included
          call count, charged at £0.05 per call (5p) on the next invoice.
          Past the 25 percent headroom the limit becomes hard and further
          calls return 402.
        </LegalP>
        <LegalP>
          <LegalEmph>Enterprise.</LegalEmph> Overage is negotiated in the
          master services agreement.
        </LegalP>
        <LegalP>
          We reserve the right to implement rate limiting or throttling to
          protect service stability. The standard rate limit is 30 requests
          per minute per API key on a 60-second sliding window. Automated
          abuse, including scripted requests that ignore documented rate
          limits or attempt to circumvent quotas, may result in account
          suspension.
        </LegalP>
      </LegalSection>

      <LegalSection id="api" n={5} title="API usage">
        <LegalP>
          API access is available on every plan, including the free
          Sandbox tier. API keys are personal to your account and must not
          be shared or published publicly. You are responsible for all
          usage associated with your API keys.
        </LegalP>
        <LegalP>
          You may revoke API keys at any time from your dashboard. We
          reserve the right to revoke API keys that are used in violation
          of these terms, including reselling of underlying data or any
          attempt to extract our proprietary engine logic.
        </LegalP>
        <LegalP>
          API usage counts toward your monthly call allowance. Cached
          responses (24-hour idempotency window via the Idempotency-Key
          header) do not count toward your monthly quota but do count
          toward the per-minute rate limit. Full API documentation is
          available at <LegalLink href="/docs">/docs</LegalLink>; the
          interactive reference is at{" "}
          <LegalLink href="/docs/api-reference">
            /docs/api-reference
          </LegalLink>
          .
        </LegalP>
      </LegalSection>

      <LegalSection id="ip" n={6} title="Intellectual property">
        <LegalP>
          All content, design, code, and branding on OneGoodArea are owned
          by OneGoodArea. You may not copy, modify, distribute, or
          reverse-engineer any part of the Service without written
          permission.
        </LegalP>
        <LegalP>
          API responses are licensed to you for internal business use,
          including embedding underlying values in your own products under
          your existing customer agreements. You may not bulk-reproduce,
          resell, or redistribute the underlying dataset as a competing
          product or as a substitute API.
        </LegalP>
      </LegalSection>

      <LegalSection id="accuracy" n={7} title="Data accuracy and disclaimer">
        <LegalP>
          OneGoodArea aggregates data from publicly available UK government
          and open sources, including Police.uk (recorded crime), the three
          national deprivation methodologies (IMD 2025 for England, WIMD
          2019 for Wales, SIMD 2020 for Scotland), HM Land Registry
          (residential price paid), Ofsted (England school inspections),
          Companies House (business density), OpenStreetMap (amenities),
          the Environment Agency (flood risk), and the ONS National
          Statistics Postcode Lookup (postcode to LSOA spine). Scores are
          computed using documented formulas applied to this data; the
          full methodology and source registry is published on{" "}
          <LegalLink href="/methodology">/methodology</LegalLink>.
        </LegalP>
        <LegalP>
          <LegalEmph>The Service is for informational purposes only.</LegalEmph>{" "}
          It does not constitute professional advice, property valuations,
          investment recommendations, or any form of regulated financial
          guidance. You must not rely solely on OneGoodArea outputs when
          making property, business, lending, underwriting, or investment
          decisions; your professional model risk, compliance, and
          governance processes remain your responsibility.
        </LegalP>
        <LegalP>
          We make reasonable efforts to ensure data accuracy but cannot
          guarantee completeness, timeliness, or correctness. Government
          data sources may contain delays, omissions, or inaccuracies that
          are outside our control. Where data is unavailable for a given
          area the response is honest about it (null values rather than
          fabricated cross-border estimates).
        </LegalP>
      </LegalSection>

      <LegalSection id="acceptable-use" n={8} title="Acceptable use">
        <LegalP>
          You agree not to use the Service to: violate any applicable law
          or regulation; attempt to gain unauthorised access to other
          accounts or systems; interfere with or disrupt the Service or
          its infrastructure; scrape, crawl, or extract data outside of
          the official API; or use the Service for any unlawful,
          fraudulent, or harmful purpose.
        </LegalP>
      </LegalSection>

      <LegalSection id="termination" n={9} title="Termination">
        <LegalP>
          You may delete your account at any time by emailing us at{" "}
          <LegalMail /> with the subject &quot;Account deletion&quot;. We
          will process the request within 48 hours.
        </LegalP>
        <LegalP>
          We may suspend or terminate your account immediately if you
          violate these terms, engage in abusive behaviour, or if required
          by law. On termination your right to use the Service ceases
          immediately. We may retain anonymised, aggregated data for
          analytical purposes.
        </LegalP>
      </LegalSection>

      <LegalSection id="liability" n={10} title="Limitation of liability">
        <LegalP>
          To the maximum extent permitted by law, OneGoodArea and its
          operator shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages, including but not
          limited to loss of profits, data, or business opportunities,
          arising out of or related to your use of the Service.
        </LegalP>
        <LegalP>
          Our total liability for any claim arising from the Service shall
          not exceed the amount you paid us in the 12 months preceding the
          claim. The Service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, express or
          implied.
        </LegalP>
        <LegalP>
          Nothing in these terms excludes or limits liability for death or
          personal injury caused by negligence, fraud, or any other
          liability that cannot be excluded under English law.
        </LegalP>
      </LegalSection>

      <LegalSection id="law" n={11} title="Governing law">
        <LegalP>
          These terms are governed by and construed in accordance with the
          laws of England and Wales. Any disputes arising from or in
          connection with these terms or the Service shall be subject to
          the exclusive jurisdiction of the courts of England and Wales.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" n={12} title="Contact">
        <LegalP>
          If you have questions about these terms, contact us at{" "}
          <LegalMail />.
        </LegalP>
        <LegalP>
          See also our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> for details
          on how we handle your data.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
