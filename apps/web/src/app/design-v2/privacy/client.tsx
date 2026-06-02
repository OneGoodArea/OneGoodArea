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

/* /privacy — Brand v3 rewrite + content refresh (AR-204 PR).

   Content audited against current product state on 2026-06-02:
   - API key reference no longer mentions specific paid tiers (the
     legacy "Developer / Business / Growth" rename); API is on
     every tier.
   - Data source list refreshed to match /methodology (adds the
     three deprivation methodologies separately + ONS NSPL spine +
     Companies House).
   - Render listed alongside Vercel as a processor (apps/api is
     deployed on Render per Plan 008 / ADR 0035). */

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

const PROCESSORS = [
  {
    name: "Stripe",
    purpose: "Payment processing and subscription management",
    data: "Email, billing details, payment method",
  },
  {
    name: "Vercel",
    purpose: "Web application hosting and edge delivery",
    data: "Request logs, IP addresses",
  },
  {
    name: "Render",
    purpose: "API host (apps/api Fastify service)",
    data: "Request logs, IP addresses",
  },
  {
    name: "Neon",
    purpose: "PostgreSQL database hosting",
    data: "Account data, usage records, audit trail",
  },
  {
    name: "Anthropic",
    purpose: "Intelligence query plane (planner only; never sees the rows)",
    data: "Natural-language question text; no personal data is sent",
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
  {
    name: "GitHub OAuth",
    purpose: "Authentication provider",
    data: "Name, email, profile image (provided by GitHub)",
  },
];

export default function PrivacyClient() {
  return (
    <LegalShell
      eyebrow="Legal · Privacy Policy"
      title="Privacy Policy"
      lastUpdated="2 June 2026"
      intro="This policy explains what personal data OneGoodArea collects, how we use it, and your rights under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018."
      sections={SECTIONS}
    >
      <LegalSection id="controller" n={1} title="Data controller">
        <LegalP>
          OneGoodArea is operated as a sole trader based in the United
          Kingdom. For data protection enquiries, contact us at{" "}
          <LegalMail />.
        </LegalP>
      </LegalSection>

      <LegalSection id="collect" n={2} title="What data we collect">
        <LegalP>We collect the following categories of personal data:</LegalP>
        <LegalP>
          <LegalEmph>Account information.</LegalEmph> Name, email address,
          and hashed password (for email/password accounts). For OAuth
          users, we receive your name, email, and profile image from the
          provider.
        </LegalP>
        <LegalP>
          <LegalEmph>API usage history.</LegalEmph> The endpoints you
          call, the postcodes and area codes you query, the request
          counts, and the timestamps of each request. Stored against your
          account and used for billing and usage analytics.
        </LegalP>
        <LegalP>
          <LegalEmph>Usage analytics.</LegalEmph> Page views, feature
          usage events, and dashboard interactions. Tracked internally for
          product improvement and associated with your account.
        </LegalP>
        <LegalP>
          <LegalEmph>Payment information.</LegalEmph> Billing details are
          collected and processed by Stripe. We do not store your card
          number, CVC, or full payment details. We retain your Stripe
          customer ID and subscription status.
        </LegalP>
        <LegalP>
          <LegalEmph>API keys.</LegalEmph> Every account can generate API
          keys (Sandbox included). We store the key fingerprint plus a
          hashed form of the secret; the raw secret is shown to you once
          at generation and never persisted in plaintext.
        </LegalP>
        <LegalP>
          <LegalEmph>Email verification tokens.</LegalEmph> Temporary
          tokens generated during account verification, stored until used
          or expired (24-hour window).
        </LegalP>
      </LegalSection>

      <LegalSection id="use" n={3} title="How we use your data">
        <LegalP>We process your personal data for the following purposes:</LegalP>
        <LegalP>
          <LegalEmph>Service delivery.</LegalEmph> To authenticate you,
          execute API requests, track your usage against plan limits, and
          maintain your audit trail. Legal basis: performance of a contract.
        </LegalP>
        <LegalP>
          <LegalEmph>Payment processing.</LegalEmph> To manage
          subscriptions, process payments, and handle billing queries
          through Stripe. Legal basis: performance of a contract.
        </LegalP>
        <LegalP>
          <LegalEmph>Product improvement.</LegalEmph> To understand how
          the Service is used, identify issues, and improve features.
          Legal basis: legitimate interest.
        </LegalP>
        <LegalP>
          <LegalEmph>Communication.</LegalEmph> To send account-related
          emails, including verification, password resets, and material
          changes to the Service or terms. Legal basis: performance of a
          contract and legitimate interest.
        </LegalP>
        <LegalP>
          We do not sell your personal data to third parties. We do not
          use your data for advertising or profiling.
        </LegalP>
      </LegalSection>

      <LegalSection id="third" n={4} title="Third-party services">
        <LegalP>
          We share data with the following third-party processors, each
          acting under data processing agreements:
        </LegalP>
        <ul className="oga-legal-processors">
          {PROCESSORS.map((p) => (
            <li key={p.name} className="oga-legal-processors__item">
              <span className="oga-legal-processors__name">{p.name}</span>
              <span className="oga-legal-processors__purpose">
                {p.purpose}
              </span>
              <span className="oga-legal-processors__data">
                Data shared: {p.data}
              </span>
            </li>
          ))}
        </ul>
        <LegalP>
          Police.uk, the IMD 2025 / WIMD 2019 / SIMD 2020 deprivation
          datasets, HM Land Registry, Ofsted, Companies House,
          OpenStreetMap, the Environment Agency, the ONS National
          Statistics Postcode Lookup, and Postcodes.io are queried
          server-side using only postcode or area-code data. No personal
          information is sent to these government or open data sources.
        </LegalP>
      </LegalSection>

      <LegalSection id="cookies" n={5} title="Cookies and session data">
        <LegalP>
          OneGoodArea uses a single session cookie for authentication.
          This cookie is essential and does not track you across other
          websites. It contains a signed JWT token with your user ID and
          session expiry.
        </LegalP>
        <LegalP>
          We do not use third-party tracking cookies, advertising pixels,
          or external analytics such as Google Analytics. All usage
          tracking is first-party and internal.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention" n={6} title="Data retention">
        <LegalP>
          <LegalEmph>Account data</LegalEmph> is retained for as long as
          your account is active. If you request account deletion we will
          erase your personal data within 30 days, except where retention
          is required by law (for example, financial records for tax
          purposes are retained for up to 7 years).
        </LegalP>
        <LegalP>
          <LegalEmph>API usage data</LegalEmph> is retained with your
          account for as long as the account is active, then deleted with
          the account.
        </LegalP>
        <LegalP>
          <LegalEmph>Email verification tokens</LegalEmph> expire and are
          deleted after 24 hours.
        </LegalP>
        <LegalP>
          <LegalEmph>Payment records</LegalEmph> in Stripe are retained in
          accordance with Stripe&apos;s data retention policies and UK
          financial regulations.
        </LegalP>
      </LegalSection>

      <LegalSection id="rights" n={7} title="Your rights under UK GDPR">
        <LegalP>
          Under the UK General Data Protection Regulation, you have the
          following rights:
        </LegalP>
        <LegalP>
          <LegalEmph>Right of access.</LegalEmph> You can request a copy
          of all personal data we hold about you.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to rectification.</LegalEmph> You can ask us to
          correct inaccurate or incomplete data.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to erasure.</LegalEmph> You can request
          deletion of your personal data. We will comply within 30 days,
          subject to legal retention obligations.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to data portability.</LegalEmph> You can
          request your data in a structured, machine-readable format (JSON).
        </LegalP>
        <LegalP>
          <LegalEmph>Right to restrict processing.</LegalEmph> You can ask
          us to limit how we use your data in certain circumstances.
        </LegalP>
        <LegalP>
          <LegalEmph>Right to object.</LegalEmph> You can object to
          processing based on legitimate interest. We will stop unless we
          have compelling grounds to continue.
        </LegalP>
        <LegalP>
          To exercise any of these rights, email <LegalMail /> with the
          subject &quot;Data Request&quot;. We will respond within 30 days.
        </LegalP>
        <LegalP>
          If you are not satisfied with our response, you have the right
          to lodge a complaint with the Information Commissioner&apos;s
          Office (ICO) at{" "}
          <LegalLink href="https://ico.org.uk" external>
            ico.org.uk
          </LegalLink>
          .
        </LegalP>
      </LegalSection>

      <LegalSection id="security" n={8} title="Data security">
        <LegalP>
          We implement appropriate technical and organisational measures
          to protect your personal data, including: encrypted connections
          (HTTPS) for all traffic, hashed passwords using the Web Crypto
          API, encrypted database connections to Neon Postgres, fingerprint
          + salted-hash storage for API keys (raw secret shown once and
          never persisted), and environment-variable-based secret
          management on Vercel and Render.
        </LegalP>
        <LegalP>
          While we take reasonable precautions, no method of transmission
          over the internet or electronic storage is 100 percent secure.
          We cannot guarantee absolute security.
        </LegalP>
      </LegalSection>

      <LegalSection id="transfers" n={9} title="International data transfers">
        <LegalP>
          Some of our third-party processors (Vercel, Stripe, Anthropic)
          may process data outside the UK. Where this occurs we ensure
          appropriate safeguards are in place, including Standard
          Contractual Clauses (SCCs) or equivalent mechanisms approved
          under UK data protection law.
        </LegalP>
      </LegalSection>

      <LegalSection id="children" n={10} title="Children's privacy">
        <LegalP>
          OneGoodArea is not directed at individuals under the age of 16.
          We do not knowingly collect personal data from children. If we
          become aware that a user is under 16 we will delete their
          account and associated data promptly.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" n={11} title="Changes to this policy">
        <LegalP>
          We may update this Privacy Policy from time to time. Material
          changes will be communicated to registered users via email. The
          &quot;Last updated&quot; date at the top of this page indicates
          the most recent revision.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" n={12} title="Contact">
        <LegalP>
          For any privacy-related questions or data requests, contact us
          at <LegalMail />.
        </LegalP>
        <LegalP>
          See also our{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink> for the
          full terms governing use of the platform.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
