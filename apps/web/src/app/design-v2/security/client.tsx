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

/* /security (AR-475) buyer-facing security overview.

   Every claim on this page is code-verified (audit under AR-475) or
   traces to an existing policy (/privacy, /legal/data-policy). Internal
   weaknesses are not published, but nothing here is claimed that the
   code does not do. Genuine gaps (SOC 2 / ISO, self-serve IP allowlist,
   org-level audit log) are labelled roadmap, never stated as present.

   Sub-processor list mirrors /privacy s4 minus GitHub OAuth (sign-in
   removed, AR-415). Contact uses the shared operation@onegoodarea.co.uk
   via <LegalMail />. */

const SECTIONS: LegalSectionType[] = [
  { id: "overview",      label: "Overview" },
  { id: "data",          label: "Data we hold" },
  { id: "encryption",    label: "Encryption" },
  { id: "auth",          label: "Authentication + access" },
  { id: "appsec",        label: "Application security" },
  { id: "secrets",       label: "Secrets + infrastructure" },
  { id: "subprocessors", label: "Sub-processors" },
  { id: "retention",     label: "Handling + retention" },
  { id: "compliance",    label: "Compliance + roadmap" },
  { id: "reporting",     label: "Reporting a vulnerability" },
  { id: "contact",       label: "Contact" },
];

const PROCESSORS = [
  { name: "Stripe",    purpose: "Payments and subscription management" },
  { name: "Vercel",    purpose: "Web application hosting and edge delivery" },
  { name: "Render",    purpose: "API service hosting" },
  { name: "Neon",      purpose: "PostgreSQL database hosting" },
  { name: "Anthropic", purpose: "Natural-language query planning (no personal data sent)" },
  { name: "Resend",    purpose: "Transactional email delivery" },
  { name: "Google",    purpose: "Sign-in with Google (optional)" },
];

export default function SecurityClient() {
  return (
    <LegalShell
      eyebrow="Legal · Security"
      title="Security"
      lastUpdated="14 July 2026"
      intro="How OneGoodArea protects your data and ours: the technical and organisational measures in place today, the sub-processors we rely on, and what is on our roadmap. It sits alongside our Privacy Policy and Data Policy."
      sections={SECTIONS}
    >
      <LegalSection id="overview" n={1} title="Overview">
        <LegalP>
          <LegalEmph>Our approach.</LegalEmph> OneGoodArea is UK
          area-intelligence infrastructure used by property and risk
          teams. We are a UK sole trader and we process personal data in
          line with the UK GDPR and the Data Protection Act 2018.
        </LegalP>
        <LegalP>
          <LegalEmph>Where we are.</LegalEmph> We are an early-stage
          company and are not yet SOC 2 or ISO 27001 certified (both are
          on our roadmap). In the meantime, this page documents the
          controls we have in place today, and we are happy to sign a
          data processing agreement (DPA) and complete your security
          questionnaire. For the underlying detail, see our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> and{" "}
          <LegalLink href="/legal/data-policy">Data Policy</LegalLink>.
        </LegalP>
      </LegalSection>

      <LegalSection id="data" n={2} title="Data we hold">
        <LegalP>
          <LegalEmph>Area data, not your customers&apos; data.</LegalEmph>{" "}
          Our core product returns area-level intelligence computed from
          public datasets (crime, deprivation, prices, schools, flood
          risk, and more), queried using only a postcode or area code. We
          do not receive or store your customers&apos; personal data to
          produce it.
        </LegalP>
        <LegalP>
          <LegalEmph>Account data.</LegalEmph> The personal data we do
          hold is account and usage data: your name, email, a hashed
          password, API keys, and a record of the API requests you make.
          This is described in full in our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> and{" "}
          <LegalLink href="/legal/data-policy">Data Policy</LegalLink>.
        </LegalP>
      </LegalSection>

      <LegalSection id="encryption" n={3} title="Encryption">
        <LegalP>
          <LegalEmph>In transit.</LegalEmph> All traffic is served over
          HTTPS/TLS. Our web application sends HTTP Strict Transport
          Security (HSTS) so browsers only ever connect to it over HTTPS.
        </LegalP>
        <LegalP>
          <LegalEmph>At rest.</LegalEmph> Application data is stored in
          Neon Postgres, which encrypts data at rest. Passwords and API
          keys are additionally hashed (see below), so they are never
          stored in a readable form.
        </LegalP>
      </LegalSection>

      <LegalSection id="auth" n={4} title="Authentication and access">
        <LegalP>
          <LegalEmph>Passwords.</LegalEmph> User passwords are hashed with
          PBKDF2-SHA256 using 600,000 iterations and a unique per-password
          salt, and compared in constant time. We never store passwords
          in plaintext.
        </LegalP>
        <LegalP>
          <LegalEmph>Sessions.</LegalEmph> Authenticated sessions use
          short-lived signed tokens. Entitlements are always read live
          from the database and never trusted from the token.
        </LegalP>
        <LegalP>
          <LegalEmph>Roles.</LegalEmph> Organisations have owner, admin,
          and member roles. Membership and role are checked on every
          organisation action, and the last owner of an organisation
          cannot be removed.
        </LegalP>
        <LegalP>
          <LegalEmph>API keys.</LegalEmph> API keys are shown once at
          creation and stored only as a SHA-256 hash; the raw key is never
          persisted. Keys are scoped to your account and organisation, and
          can be restricted to an IP allowlist on request.
        </LegalP>
      </LegalSection>

      <LegalSection id="appsec" n={5} title="Application security">
        <LegalP>
          <LegalEmph>Rate limiting.</LegalEmph> API requests are rate
          limited. The standard limit is 30 requests per minute per API
          key on a 60-second sliding window.
        </LegalP>
        <LegalP>
          <LegalEmph>Webhooks.</LegalEmph> Outbound webhooks are signed
          with HMAC-SHA256 so you can verify every payload, support secret
          rotation, and only deliver to HTTPS destinations.
        </LegalP>
        <LegalP>
          <LegalEmph>Input and database.</LegalEmph> Requests are
          validated at the API boundary, and all database access uses
          parameterised queries.
        </LegalP>
        <LegalP>
          <LegalEmph>Browser protections.</LegalEmph> The web application
          sends a Content-Security-Policy and standard security headers,
          including X-Frame-Options, X-Content-Type-Options,
          Referrer-Policy, and Permissions-Policy.
        </LegalP>
      </LegalSection>

      <LegalSection id="secrets" n={6} title="Secrets and infrastructure">
        <LegalP>
          <LegalEmph>Secrets.</LegalEmph> Credentials and secrets are
          injected through environment configuration and are never
          committed to source control. Logs redact credentials before
          they are written.
        </LegalP>
        <LegalP>
          <LegalEmph>Hosting.</LegalEmph> The web application runs on
          Vercel, the API on Render, and the database on Neon. Each is a
          reputable provider that maintains its own security programme.
        </LegalP>
      </LegalSection>

      <LegalSection id="subprocessors" n={7} title="Sub-processors">
        <LegalP>
          We rely on the following sub-processors, each operating under a
          data processing agreement. Our core infrastructure providers
          maintain their own security certifications.
        </LegalP>
        <ul className="oga-legal-processors">
          {PROCESSORS.map((p) => (
            <li key={p.name} className="oga-legal-processors__item">
              <span className="oga-legal-processors__name">{p.name}</span>
              <span className="oga-legal-processors__purpose">
                {p.purpose}
              </span>
            </li>
          ))}
        </ul>
        <LegalP>
          For the specific data shared with each processor, see the
          third-party services section of our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention" n={8} title="Data handling and retention">
        <LegalP>
          <LegalEmph>Retention.</LegalEmph> Account data is kept while
          your account is active and erased within 30 days of a deletion
          request, except where the law requires longer (for example,
          financial records for up to 7 years). Model-training logs,
          where you have not opted out, roll off automatically after 365
          days.
        </LegalP>
        <LegalP>
          <LegalEmph>Training opt-out.</LegalEmph> You can opt out of your
          API queries being used to improve our models, per API key, at
          any time.
        </LegalP>
        <LegalP>
          We do not sell your personal data, and we do not use it for
          advertising or profiling. Full detail is in our{" "}
          <LegalLink href="/legal/data-policy">Data Policy</LegalLink>.
        </LegalP>
      </LegalSection>

      <LegalSection id="compliance" n={9} title="Compliance and roadmap">
        <LegalP>
          <LegalEmph>Today.</LegalEmph> We process personal data in line
          with the UK GDPR and the Data Protection Act 2018. We will sign
          a DPA and complete your security questionnaire on request. Where
          sub-processors handle data outside the UK, transfers are covered
          by Standard Contractual Clauses or equivalent safeguards.
        </LegalP>
        <LegalP>
          <LegalEmph>Roadmap.</LegalEmph> We are not currently SOC 2 or
          ISO 27001 certified. Formal certification (SOC 2 Type II and ISO
          27001), a self-serve IP-allowlist interface, and expanded
          organisation-level audit logs are on our roadmap as we grow into
          larger regulated deployments.
        </LegalP>
      </LegalSection>

      <LegalSection id="reporting" n={10} title="Reporting a vulnerability">
        <LegalP>
          If you believe you have found a security vulnerability, email{" "}
          <LegalMail /> with the subject &quot;Security&quot;. We
          investigate every report and aim to acknowledge within two
          business days. Please give us reasonable time to remediate
          before any public disclosure.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" n={11} title="Contact">
        <LegalP>
          For any security questions, contact us at <LegalMail />.
        </LegalP>
        <LegalP>
          See also our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>,{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink>, and{" "}
          <LegalLink href="/legal/data-policy">Data Policy</LegalLink>.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
