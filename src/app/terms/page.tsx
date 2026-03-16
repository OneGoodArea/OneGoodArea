import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | AreaIQ",
  description: "Terms of Service for AreaIQ, the UK area intelligence platform. Covers account usage, subscriptions, API access, data accuracy, and governing law.",
  openGraph: {
    title: "Terms of Service | AreaIQ",
    description: "Terms of Service for AreaIQ, the UK area intelligence platform.",
    type: "article",
    url: "https://www.area-iq.co.uk/terms",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Terms of Service | AreaIQ" },
  alternates: { canonical: "https://www.area-iq.co.uk/terms" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <h2
        className="text-[11px] font-mono uppercase tracking-wider mb-4"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title}
      </h2>
      <div
        className="border p-5"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          className="text-[13px] leading-relaxed space-y-3"
          style={{ color: "var(--text-secondary)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Terms of Service" }]} maxWidth="800px">
        <Link
          href="/report"
          className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Go to App
          <ArrowRight size={12} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-[28px] font-semibold tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Terms of Service
          </h1>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            These terms govern your use of AreaIQ. By creating an account or
            using the service, you agree to be bound by them. Please read them
            carefully.
          </p>
          <p
            className="text-[11px] font-mono mt-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Last updated: 10 March 2026
          </p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using AreaIQ (&quot;the Service&quot;), operated by
            AreaIQ (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), a
            sole trader registered in the United Kingdom, you agree to these
            Terms of Service. If you do not agree, you must not use the Service.
          </p>
          <p>
            We may update these terms from time to time. Continued use of the
            Service after changes constitutes acceptance of the revised terms. We
            will notify registered users of material changes via email.
          </p>
        </Section>

        <Section title="2. Account Registration">
          <p>
            To use AreaIQ, you must create an account using Google OAuth or email
            and password. You are responsible for maintaining the confidentiality
            of your account credentials and for all activity that occurs under
            your account.
          </p>
          <p>
            You must provide accurate, current information during registration.
            You must be at least 16 years old to create an account. We reserve
            the right to suspend or terminate accounts that violate these terms
            or contain false information.
          </p>
        </Section>

        <Section title="3. Subscriptions and Payments">
          <p>
            AreaIQ offers web report plans (Free at £0/month for 3 reports,
            Starter at £29/month for 20 reports, Pro at £79/month for 75 reports)
            and API plans (Developer at £49/month for 100 reports, Business at
            £249/month for 500 reports, Growth at £499/month for 1,500 reports).
            Enterprise pricing is available on request. All prices are in GBP and
            inclusive of applicable taxes.
          </p>
          <p>
            Paid subscriptions are billed monthly through Stripe. By subscribing
            to a paid plan, you authorise us to charge your payment method on a
            recurring basis until you cancel. You can cancel at any time through
            the Stripe billing portal. Cancellation takes effect at the end of
            your current billing period, and you retain access until then.
          </p>
          <p>
            We do not offer refunds for partial billing periods. If we change
            pricing, existing subscribers will be notified at least 30 days in
            advance and the new pricing will apply from the next billing cycle.
          </p>
        </Section>

        <Section title="4. Usage Limits">
          <p>
            Each plan includes a monthly report credit allowance. Credits reset
            on the 1st of each calendar month. Unused credits do not carry over.
            If you exceed your monthly limit, you will need to upgrade your plan
            to generate additional reports.
          </p>
          <p>
            We reserve the right to implement rate limiting or throttling to
            protect service stability. Automated abuse, including scripted
            requests outside the official API, may result in account suspension.
          </p>
        </Section>

        <Section title="5. API Usage">
          <p>
            API access is available on the Developer, Business, and Growth plans. API keys
            are personal to your account and must not be shared or published
            publicly. You are responsible for all usage associated with your API
            keys.
          </p>
          <p>
            You may revoke API keys at any time from your dashboard. We reserve
            the right to revoke API keys that are used in violation of these
            terms, including excessive automated requests or reselling of report
            data.
          </p>
          <p>
            API usage counts towards your monthly report credit allowance. Full
            API documentation is available at{" "}
            <Link
              href="/docs"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              /docs
            </Link>
            .
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            All content, design, code, and branding on AreaIQ are owned by
            AreaIQ. You may not copy, modify, distribute, or reverse-engineer
            any part of the Service without written permission.
          </p>
          <p>
            Reports generated through AreaIQ are licensed to you for personal or
            internal business use. You may share individual reports via their
            permanent URLs. You may not bulk-reproduce, resell, or redistribute
            report data as a competing product or dataset.
          </p>
        </Section>

        <Section title="7. Data Accuracy and Disclaimer">
          <p>
            AreaIQ aggregates data from publicly available UK government sources,
            including Police.uk, the Ministry of Housing, Communities and Local
            Government (IMD 2025), Postcodes.io, OpenStreetMap, and the
            Environment Agency. Scores are computed using deterministic
            algorithms applied to this data.
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>
              Reports are for informational purposes only.
            </strong>{" "}
            They do not constitute professional advice, property valuations,
            investment recommendations, or any form of regulated financial
            guidance. You should not rely solely on AreaIQ reports when making
            property, business, or investment decisions.
          </p>
          <p>
            We make reasonable efforts to ensure data accuracy but cannot
            guarantee completeness, timeliness, or correctness. Government data
            sources may contain delays, omissions, or inaccuracies that are
            outside our control.
          </p>
        </Section>

        <Section title="8. Acceptable Use">
          <p>
            You agree not to use the Service to: violate any applicable law or
            regulation; attempt to gain unauthorised access to other accounts or
            systems; interfere with or disrupt the Service or its
            infrastructure; scrape, crawl, or extract data outside of the
            official API; or use the Service for any unlawful, fraudulent, or
            harmful purpose.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You may delete your account at any time by contacting us at{" "}
            <a
              href="mailto:hello@area-iq.co.uk"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              hello@area-iq.co.uk
            </a>
            . We will process deletion requests within 48 hours.
          </p>
          <p>
            We may suspend or terminate your account immediately if you violate
            these terms, engage in abusive behaviour, or if required by law. On
            termination, your right to use the Service ceases immediately. We may
            retain anonymised, aggregated data for analytical purposes.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, AreaIQ and its operator
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to loss
            of profits, data, or business opportunities, arising out of or
            related to your use of the Service.
          </p>
          <p>
            Our total liability for any claim arising from the Service shall not
            exceed the amount you paid us in the 12 months preceding the claim.
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, express or implied.
          </p>
          <p>
            Nothing in these terms excludes or limits liability for death or
            personal injury caused by negligence, fraud, or any other liability
            that cannot be excluded under English law.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These terms are governed by and construed in accordance with the laws
            of England and Wales. Any disputes arising from or in connection with
            these terms or the Service shall be subject to the exclusive
            jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            If you have questions about these terms, contact us at{" "}
            <a
              href="mailto:hello@area-iq.co.uk"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              hello@area-iq.co.uk
            </a>
            .
          </p>
          <p>
            See also our{" "}
            <Link
              href="/privacy"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              Privacy Policy
            </Link>{" "}
            for details on how we handle your data.
          </p>
        </Section>
      </main>

      <Footer maxWidth="800px" />
    </div>
  );
}
