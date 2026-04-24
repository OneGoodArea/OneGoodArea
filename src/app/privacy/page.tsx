import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | OneGoodArea",
  description: "Privacy Policy for OneGoodArea. Learn how we collect, use, and protect your personal data in compliance with GDPR and UK data protection law.",
  openGraph: {
    title: "Privacy Policy | OneGoodArea",
    description: "How OneGoodArea collects, uses, and protects your personal data. GDPR compliant.",
    type: "article",
    url: "https://www.area-iq.co.uk/privacy",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Privacy Policy | OneGoodArea" },
  alternates: { canonical: "https://www.area-iq.co.uk/privacy" },
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Privacy Policy" }]} maxWidth="800px">
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
            Privacy Policy
          </h1>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            This policy explains what personal data OneGoodArea collects, how we use
            it, and your rights under the UK General Data Protection Regulation
            (UK GDPR) and the Data Protection Act 2018.
          </p>
          <p
            className="text-[11px] font-mono mt-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Last updated: 10 March 2026
          </p>
        </div>

        <Section title="1. Data Controller">
          <p>
            OneGoodArea is operated as a sole trader based in the
            United Kingdom. For data protection enquiries, contact us at{" "}
            <a
              href="mailto:hello@area-iq.co.uk"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              hello@area-iq.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p>We collect the following categories of personal data:</p>
          <div className="mt-2">
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Account information.
              </strong>{" "}
              Name, email address, and hashed password (for email/password
              accounts). For Google OAuth users, we receive your name, email, and
              profile image from Google.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Report history.
              </strong>{" "}
              The postcodes and intents you search, the reports generated, and
              the timestamps of each request. This is stored against your user
              account.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Usage analytics.
              </strong>{" "}
              Page views, feature usage events, and report generation counts.
              These are tracked internally for product improvement and are
              associated with your account.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Payment information.
              </strong>{" "}
              Billing details are collected and processed by Stripe. We do not
              store your card number, CVC, or full payment details. We retain
              your Stripe customer ID and subscription status.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                API keys.
              </strong>{" "}
              If you are on the Business plan, we store hashed API keys
              associated with your account.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Email verification tokens.
              </strong>{" "}
              Temporary tokens generated during account verification, stored
              until used or expired.
            </p>
          </div>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We process your personal data for the following purposes:</p>
          <div className="mt-2">
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Service delivery.
              </strong>{" "}
              To authenticate you, generate area reports, track your usage
              against plan limits, and maintain your report history. Legal basis:
              performance of a contract.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Payment processing.
              </strong>{" "}
              To manage subscriptions, process payments, and handle billing
              queries through Stripe. Legal basis: performance of a contract.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Product improvement.
              </strong>{" "}
              To understand how the Service is used, identify issues, and improve
              features. Legal basis: legitimate interest.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Communication.
              </strong>{" "}
              To send account-related emails, including verification, password
              resets, and material changes to the Service or terms. Legal basis:
              performance of a contract and legitimate interest.
            </p>
          </div>
          <p>
            We do not sell your personal data to third parties. We do not use
            your data for advertising or profiling.
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>
            We share data with the following third-party processors, each acting
            under data processing agreements:
          </p>
          <div
            className="mt-3 border"
            style={{ borderColor: "var(--border)" }}
          >
            {[
              {
                name: "Stripe",
                purpose: "Payment processing and subscription management",
                data: "Email, billing details, payment method",
              },
              {
                name: "Vercel",
                purpose: "Application hosting and edge delivery",
                data: "Request logs, IP addresses",
              },
              {
                name: "Neon",
                purpose: "PostgreSQL database hosting",
                data: "Account data, report history, usage records",
              },
              {
                name: "Anthropic",
                purpose: "AI Engine narration layer",
                data: "Area data and scores (no personal data sent)",
              },
              {
                name: "Resend",
                purpose: "Transactional email delivery",
                data: "Email address, email content",
              },
              {
                name: "Google OAuth",
                purpose: "Authentication provider",
                data: "Name, email, profile image (provided by Google)",
              },
            ].map((service, i, arr) => (
              <div
                key={service.name}
                className={`px-4 py-3 ${i < arr.length - 1 ? "border-b" : ""}`}
                style={{
                  borderColor: "var(--border)",
                  background:
                    i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg)",
                }}
              >
                <div
                  className="text-[12px] font-mono font-medium mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {service.name}
                </div>
                <div
                  className="text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {service.purpose}
                </div>
                <div
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Data shared: {service.data}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3">
            Postcodes.io, Police.uk, the IMD 2025 dataset, OpenStreetMap, and
            the Environment Agency API are queried server-side using only
            postcode or coordinate data. No personal information is sent to these
            government data sources.
          </p>
        </Section>

        <Section title="5. Cookies and Session Data">
          <p>
            OneGoodArea uses a single session cookie managed by NextAuth.js. This
            cookie is essential for authentication and does not track you across
            other websites. It contains a signed JWT token with your user ID and
            session expiry.
          </p>
          <p>
            We do not use third-party tracking cookies, advertising pixels, or
            analytics services such as Google Analytics. All usage tracking is
            first-party and internal.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            <strong style={{ color: "var(--text-primary)" }}>
              Account data
            </strong>{" "}
            is retained for as long as your account is active. If you request
            account deletion, we will erase your personal data within 30 days,
            except where retention is required by law (for example, financial
            records for tax purposes, which are retained for up to 7 years).
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>
              Report data
            </strong>{" "}
            is retained with your account. Shared report URLs remain accessible
            unless the associated account is deleted.
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>
              Email verification tokens
            </strong>{" "}
            expire and are deleted after 24 hours.
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>
              Payment records
            </strong>{" "}
            in Stripe are retained in accordance with Stripe&apos;s data
            retention policies and UK financial regulations.
          </p>
        </Section>

        <Section title="7. Your Rights Under UK GDPR">
          <p>
            Under the UK General Data Protection Regulation, you have the
            following rights:
          </p>
          <div className="mt-2">
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Right of access.
              </strong>{" "}
              You can request a copy of all personal data we hold about you.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Right to rectification.
              </strong>{" "}
              You can ask us to correct inaccurate or incomplete data.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Right to erasure.
              </strong>{" "}
              You can request deletion of your personal data. We will comply
              within 30 days, subject to legal retention obligations.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Right to data portability.
              </strong>{" "}
              You can request your data in a structured, machine-readable format
              (JSON).
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Right to restrict processing.
              </strong>{" "}
              You can ask us to limit how we use your data in certain
              circumstances.
            </p>
            <p>
              <strong style={{ color: "var(--text-primary)" }}>
                Right to object.
              </strong>{" "}
              You can object to processing based on legitimate interest. We will
              stop unless we have compelling grounds to continue.
            </p>
          </div>
          <p className="mt-2">
            To exercise any of these rights, email{" "}
            <a
              href="mailto:hello@area-iq.co.uk"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              hello@area-iq.co.uk
            </a>{" "}
            with the subject line &quot;Data Request&quot;. We will respond
            within 30 days.
          </p>
          <p>
            If you are not satisfied with our response, you have the right to
            lodge a complaint with the Information Commissioner&apos;s Office
            (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              ico.org.uk
            </a>
            .
          </p>
        </Section>

        <Section title="8. Data Security">
          <p>
            We implement appropriate technical and organisational measures to
            protect your personal data, including: encrypted connections (HTTPS)
            for all traffic, hashed passwords using Web Crypto API, encrypted
            database connections to Neon Postgres, hashed API keys, and
            environment-variable-based secret management on Vercel.
          </p>
          <p>
            While we take reasonable precautions, no method of transmission over
            the internet or electronic storage is 100% secure. We cannot
            guarantee absolute security.
          </p>
        </Section>

        <Section title="9. International Data Transfers">
          <p>
            Some of our third-party processors (Vercel, Stripe, Anthropic) may
            process data outside the UK. Where this occurs, we ensure appropriate
            safeguards are in place, including Standard Contractual Clauses
            (SCCs) or equivalent mechanisms approved under UK data protection
            law.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>
            OneGoodArea is not directed at individuals under the age of 16. We do not
            knowingly collect personal data from children. If we become aware
            that a user is under 16, we will delete their account and associated
            data promptly.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Material
            changes will be communicated to registered users via email. The
            &quot;Last updated&quot; date at the top of this page indicates the
            most recent revision.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            For any privacy-related questions or data requests, contact us at{" "}
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
              href="/terms"
              className="underline transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              Terms of Service
            </Link>{" "}
            for the full terms governing use of the platform.
          </p>
        </Section>
      </main>

      <Footer maxWidth="800px" />
    </div>
  );
}
