"use client";

import Link from "next/link";
import {
  LegalShell, LegalSection, LegalP, LegalEmph, LegalMail,
  type LegalSection as LegalSectionType,
} from "../_shared/legal-shell";

const SECTIONS: LegalSectionType[] = [
  { id: "acceptance",     label: "Acceptance" },
  { id: "account",        label: "Account registration" },
  { id: "subscriptions",  label: "Subscriptions + payments" },
  { id: "limits",         label: "Usage limits" },
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
      title={<>The <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>rules</em> of using OneGoodArea.</>}
      lastUpdated="10 March 2026"
      intro="These terms govern your use of OneGoodArea. By creating an account or using the service, you agree to be bound by them. Please read them carefully."
      sections={SECTIONS}
    >
      <LegalSection id="acceptance" n={1} title="Acceptance of terms">
        <LegalP>
          By accessing or using OneGoodArea (&quot;the Service&quot;), operated by OneGoodArea (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), a sole trader registered in the United Kingdom, you agree to these Terms of Service. If you do not agree, you must not use the Service.
        </LegalP>
        <LegalP>
          We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised terms. We will notify registered users of material changes via email.
        </LegalP>
      </LegalSection>

      <LegalSection id="account" n={2} title="Account registration">
        <LegalP>
          To use OneGoodArea, you must create an account using Google OAuth, GitHub OAuth, or email and password. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
        </LegalP>
        <LegalP>
          You must provide accurate, current information during registration. You must be at least 16 years old to create an account. We reserve the right to suspend or terminate accounts that violate these terms or contain false information.
        </LegalP>
      </LegalSection>

      <LegalSection id="subscriptions" n={3} title="Subscriptions and payments">
        <LegalP>
          OneGoodArea offers web report plans (Free at £0/month for 3 reports, Starter at £29/month for 20 reports, Pro at £79/month for 75 reports) and API plans (Developer at £49/month for 100 reports, Business at £249/month for 500 reports, Growth at £499/month for 1,500 reports). Enterprise pricing is available on request. All prices are in GBP and inclusive of applicable taxes.
        </LegalP>
        <LegalP>
          Paid subscriptions are billed monthly through Stripe. By subscribing to a paid plan, you authorise us to charge your payment method on a recurring basis until you cancel. You can cancel at any time through the Stripe billing portal. Cancellation takes effect at the end of your current billing period, and you retain access until then.
        </LegalP>
        <LegalP>
          We do not offer refunds for partial billing periods. If we change pricing, existing subscribers will be notified at least 30 days in advance and the new pricing will apply from the next billing cycle.
        </LegalP>
      </LegalSection>

      <LegalSection id="limits" n={4} title="Usage limits">
        <LegalP>
          Each plan includes a monthly report credit allowance. Credits reset on the 1st of each calendar month. Unused credits do not carry over. If you exceed your monthly limit, you will need to upgrade your plan to generate additional reports.
        </LegalP>
        <LegalP>
          We reserve the right to implement rate limiting or throttling to protect service stability. Automated abuse, including scripted requests outside the official API, may result in account suspension.
        </LegalP>
      </LegalSection>

      <LegalSection id="api" n={5} title="API usage">
        <LegalP>
          API access is available on the Developer, Business, and Growth plans. API keys are personal to your account and must not be shared or published publicly. You are responsible for all usage associated with your API keys.
        </LegalP>
        <LegalP>
          You may revoke API keys at any time from your dashboard. We reserve the right to revoke API keys that are used in violation of these terms, including excessive automated requests or reselling of report data.
        </LegalP>
        <LegalP>
          API usage counts towards your monthly report credit allowance, with the exception of cache hits (24-hour window) which are free. Full API documentation is available at{" "}
          <Link href="/docs" style={{ color: "var(--ink-deep)", textDecoration: "underline" }}>/docs</Link>.
        </LegalP>
      </LegalSection>

      <LegalSection id="ip" n={6} title="Intellectual property">
        <LegalP>
          All content, design, code, and branding on OneGoodArea are owned by OneGoodArea. You may not copy, modify, distribute, or reverse-engineer any part of the Service without written permission.
        </LegalP>
        <LegalP>
          Reports generated through OneGoodArea are licensed to you for personal or internal business use. You may share individual reports via their permanent URLs. You may not bulk-reproduce, resell, or redistribute report data as a competing product or dataset.
        </LegalP>
      </LegalSection>

      <LegalSection id="accuracy" n={7} title="Data accuracy and disclaimer">
        <LegalP>
          OneGoodArea aggregates data from publicly available UK government and open sources, including Postcodes.io, Police.uk, the Ministry of Housing, Communities and Local Government (IMD 2025), OpenStreetMap, HM Land Registry, the Environment Agency, and Ofsted. Scores are computed using transparent formulas applied to this data.
        </LegalP>
        <LegalP>
          <LegalEmph>Reports are for informational purposes only.</LegalEmph> They do not constitute professional advice, property valuations, investment recommendations, or any form of regulated financial guidance. You should not rely solely on OneGoodArea reports when making property, business, or investment decisions.
        </LegalP>
        <LegalP>
          We make reasonable efforts to ensure data accuracy but cannot guarantee completeness, timeliness, or correctness. Government data sources may contain delays, omissions, or inaccuracies that are outside our control.
        </LegalP>
      </LegalSection>

      <LegalSection id="acceptable-use" n={8} title="Acceptable use">
        <LegalP>
          You agree not to use the Service to: violate any applicable law or regulation; attempt to gain unauthorised access to other accounts or systems; interfere with or disrupt the Service or its infrastructure; scrape, crawl, or extract data outside of the official API; or use the Service for any unlawful, fraudulent, or harmful purpose.
        </LegalP>
      </LegalSection>

      <LegalSection id="termination" n={9} title="Termination">
        <LegalP>
          You may delete your account at any time by contacting us at <LegalMail />. We will process deletion requests within 48 hours.
        </LegalP>
        <LegalP>
          We may suspend or terminate your account immediately if you violate these terms, engage in abusive behaviour, or if required by law. On termination, your right to use the Service ceases immediately. We may retain anonymised, aggregated data for analytical purposes.
        </LegalP>
      </LegalSection>

      <LegalSection id="liability" n={10} title="Limitation of liability">
        <LegalP>
          To the maximum extent permitted by law, OneGoodArea and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising out of or related to your use of the Service.
        </LegalP>
        <LegalP>
          Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim. The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied.
        </LegalP>
        <LegalP>
          Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under English law.
        </LegalP>
      </LegalSection>

      <LegalSection id="law" n={11} title="Governing law">
        <LegalP>
          These terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or in connection with these terms or the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" n={12} title="Contact">
        <LegalP>
          If you have questions about these terms, contact us at <LegalMail />.
        </LegalP>
        <LegalP>
          See also our{" "}
          <Link href="/privacy" style={{ color: "var(--ink-deep)", textDecoration: "underline" }}>Privacy Policy</Link>
          {" "}for details on how we handle your data.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
