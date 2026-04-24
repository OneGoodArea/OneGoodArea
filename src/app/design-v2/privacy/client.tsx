"use client";

import React from "react";
import Link from "next/link";
import {
  LegalShell, LegalSection, LegalP, LegalEmph, LegalMail,
  type LegalSection as LegalSectionType,
} from "../_shared/legal-shell";

const SECTIONS: LegalSectionType[] = [
  { id: "controller", label: "Data controller" },
  { id: "collect",    label: "What we collect" },
  { id: "use",        label: "How we use it" },
  { id: "third",      label: "Third-party services" },
  { id: "cookies",    label: "Cookies + sessions" },
  { id: "retention",  label: "Data retention" },
  { id: "rights",     label: "Your rights" },
  { id: "security",   label: "Data security" },
  { id: "transfers",  label: "International transfers" },
  { id: "children",   label: "Children's privacy" },
  { id: "changes",    label: "Changes to this policy" },
  { id: "contact",    label: "Contact" },
];

const PROCESSORS: { name: string; purpose: string; data: string }[] = [
  { name: "Stripe",       purpose: "Payment processing and subscription management", data: "Email, billing details, payment method" },
  { name: "Vercel",       purpose: "Application hosting and edge delivery",          data: "Request logs, IP addresses" },
  { name: "Neon",         purpose: "PostgreSQL database hosting",                    data: "Account data, report history, usage records" },
  { name: "Anthropic",    purpose: "Engine narration layer",                         data: "Area data and scores (no personal data sent)" },
  { name: "Resend",       purpose: "Transactional email delivery",                   data: "Email address, email content" },
  { name: "Google OAuth", purpose: "Authentication provider",                        data: "Name, email, profile image (provided by Google)" },
  { name: "GitHub OAuth", purpose: "Authentication provider",                        data: "Name, email, profile image (provided by GitHub)" },
];

export default function PrivacyClient() {
  return (
    <LegalShell
      eyebrow="Legal · Privacy Policy"
      title={<>How OneGoodArea handles <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>your data.</em></>}
      lastUpdated="10 March 2026"
      intro="This policy explains what personal data OneGoodArea collects, how we use it, and your rights under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018."
      sections={SECTIONS}
    >
      <LegalSection id="controller" n={1} title="Data controller">
        <LegalP>
          OneGoodArea is operated as a sole trader based in the United Kingdom. For data protection enquiries, contact us at <LegalMail />.
        </LegalP>
      </LegalSection>

      <LegalSection id="collect" n={2} title="What data we collect">
        <LegalP>We collect the following categories of personal data:</LegalP>
        <LegalP>
          <LegalEmph>Account information.</LegalEmph> Name, email address, and hashed password (for email/password accounts). For OAuth users, we receive your name, email, and profile image from the provider.
        </LegalP>
        <LegalP>
          <LegalEmph>Report history.</LegalEmph> The postcodes and intents you search, the reports generated, and the timestamps of each request. Stored against your user account.
        </LegalP>
        <LegalP>
          <LegalEmph>Usage analytics.</LegalEmph> Page views, feature usage events, and report generation counts. Tracked internally for product improvement and associated with your account.
        </LegalP>
        <LegalP>
          <LegalEmph>Payment information.</LegalEmph> Billing details are collected and processed by Stripe. We do not store your card number, CVC, or full payment details. We retain your Stripe customer ID and subscription status.
        </LegalP>
        <LegalP>
          <LegalEmph>API keys.</LegalEmph> If you are on a Developer, Business, or Growth plan, we store hashed API keys associated with your account.
        </LegalP>
        <LegalP>
          <LegalEmph>Email verification tokens.</LegalEmph> Temporary tokens generated during account verification, stored until used or expired.
        </LegalP>
      </LegalSection>

      <LegalSection id="use" n={3} title="How we use your data">
        <LegalP>We process your personal data for the following purposes:</LegalP>
        <LegalP>
          <LegalEmph>Service delivery.</LegalEmph> To authenticate you, generate area reports, track your usage against plan limits, and maintain your report history. Legal basis: performance of a contract.
        </LegalP>
        <LegalP>
          <LegalEmph>Payment processing.</LegalEmph> To manage subscriptions, process payments, and handle billing queries through Stripe. Legal basis: performance of a contract.
        </LegalP>
        <LegalP>
          <LegalEmph>Product improvement.</LegalEmph> To understand how the Service is used, identify issues, and improve features. Legal basis: legitimate interest.
        </LegalP>
        <LegalP>
          <LegalEmph>Communication.</LegalEmph> To send account-related emails, including verification, password resets, and material changes to the Service or terms. Legal basis: performance of a contract and legitimate interest.
        </LegalP>
        <LegalP>
          We do not sell your personal data to third parties. We do not use your data for advertising or profiling.
        </LegalP>
      </LegalSection>

      <LegalSection id="third" n={4} title="Third-party services">
        <LegalP>We share data with the following third-party processors, each acting under data processing agreements:</LegalP>
        <div style={{
          marginTop: 16, marginBottom: 16,
          border: "1px solid var(--border)",
        }}>
          {PROCESSORS.map((p, i) => (
            <div key={p.name} style={{
              padding: "14px 18px",
              borderBottom: i === PROCESSORS.length - 1 ? "none" : "1px solid var(--border-dim)",
              background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
            }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
                letterSpacing: "-0.01em", color: "var(--ink-deep)",
                marginBottom: 3,
              }}>{p.name}</div>
              <div style={{
                fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
                color: "var(--text-2)", lineHeight: 1.5, marginBottom: 3,
              }}>{p.purpose}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                letterSpacing: "0.06em", color: "var(--text-3)",
              }}>
                Data shared: {p.data}
              </div>
            </div>
          ))}
        </div>
        <LegalP>
          Postcodes.io, Police.uk, the IMD 2025 dataset, OpenStreetMap, HM Land Registry, the Environment Agency, and Ofsted are queried server-side using only postcode or coordinate data. No personal information is sent to these government or open data sources.
        </LegalP>
      </LegalSection>

      <LegalSection id="cookies" n={5} title="Cookies and session data">
        <LegalP>
          OneGoodArea uses a single session cookie managed by NextAuth.js. This cookie is essential for authentication and does not track you across other websites. It contains a signed JWT token with your user ID and session expiry.
        </LegalP>
        <LegalP>
          We do not use third-party tracking cookies, advertising pixels, or external analytics such as Google Analytics. All usage tracking is first-party and internal.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention" n={6} title="Data retention">
        <LegalP>
          <LegalEmph>Account data</LegalEmph> is retained for as long as your account is active. If you request account deletion, we will erase your personal data within 30 days, except where retention is required by law (for example, financial records for tax purposes, which are retained for up to 7 years).
        </LegalP>
        <LegalP>
          <LegalEmph>Report data</LegalEmph> is retained with your account. Shared report URLs remain accessible unless the associated account is deleted.
        </LegalP>
        <LegalP>
          <LegalEmph>Email verification tokens</LegalEmph> expire and are deleted after 24 hours.
        </LegalP>
        <LegalP>
          <LegalEmph>Payment records</LegalEmph> in Stripe are retained in accordance with Stripe&apos;s data retention policies and UK financial regulations.
        </LegalP>
      </LegalSection>

      <LegalSection id="rights" n={7} title="Your rights under UK GDPR">
        <LegalP>Under the UK General Data Protection Regulation, you have the following rights:</LegalP>
        <LegalP>
          <LegalEmph>Right of access.</LegalEmph> You can request a copy of all personal data we hold about you.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to rectification.</LegalEmph> You can ask us to correct inaccurate or incomplete data.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to erasure.</LegalEmph> You can request deletion of your personal data. We will comply within 30 days, subject to legal retention obligations.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to data portability.</LegalEmph> You can request your data in a structured, machine-readable format (JSON).
        </LegalP>
        <LegalP>
          <LegalEmph>Right to restrict processing.</LegalEmph> You can ask us to limit how we use your data in certain circumstances.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to object.</LegalEmph> You can object to processing based on legitimate interest. We will stop unless we have compelling grounds to continue.
        </LegalP>
        <LegalP>
          To exercise any of these rights, email <LegalMail /> with the subject line &quot;Data Request&quot;. We will respond within 30 days.
        </LegalP>
        <LegalP>
          If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at{" "}
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{
            color: "var(--ink-deep)", textDecoration: "none",
            borderBottom: "1px solid var(--ink-deep)", paddingBottom: 1,
            fontFamily: "var(--mono)", fontSize: 14,
          }}>ico.org.uk</a>.
        </LegalP>
      </LegalSection>

      <LegalSection id="security" n={8} title="Data security">
        <LegalP>
          We implement appropriate technical and organisational measures to protect your personal data, including: encrypted connections (HTTPS) for all traffic, hashed passwords using the Web Crypto API, encrypted database connections to Neon Postgres, hashed API keys, and environment-variable-based secret management on Vercel.
        </LegalP>
        <LegalP>
          While we take reasonable precautions, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
        </LegalP>
      </LegalSection>

      <LegalSection id="transfers" n={9} title="International data transfers">
        <LegalP>
          Some of our third-party processors (Vercel, Stripe, Anthropic) may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) or equivalent mechanisms approved under UK data protection law.
        </LegalP>
      </LegalSection>

      <LegalSection id="children" n={10} title="Children's privacy">
        <LegalP>
          OneGoodArea is not directed at individuals under the age of 16. We do not knowingly collect personal data from children. If we become aware that a user is under 16, we will delete their account and associated data promptly.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" n={11} title="Changes to this policy">
        <LegalP>
          We may update this Privacy Policy from time to time. Material changes will be communicated to registered users via email. The &quot;Last updated&quot; date at the top of this page indicates the most recent revision.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" n={12} title="Contact">
        <LegalP>
          For any privacy-related questions or data requests, contact us at <LegalMail />.
        </LegalP>
        <LegalP>
          See also our{" "}
          <Link href="/terms" style={{ color: "var(--ink-deep)", textDecoration: "underline" }}>Terms of Service</Link>
          {" "}for the full terms governing use of the platform.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
