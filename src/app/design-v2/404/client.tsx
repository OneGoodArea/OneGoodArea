"use client";

import { ErrorShell } from "../_shared/error-shell";

export default function NotFoundClient() {
  return (
    <ErrorShell
      code="404"
      title={<>That postcode doesn&apos;t <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>resolve.</em></>}
      sub="The page you requested isn't here. It might have been moved, renamed, or never existed. Head back to a known route below."
      primaryCta={{ label: "Go home", href: "/design-v2" }}
      secondaryCta={{ label: "Try a postcode", href: "/design-v2" }}
      quickLinks={[
        { label: "Pricing",       href: "/design-v2/pricing" },
        { label: "Business",      href: "/design-v2/business" },
        { label: "Docs",          href: "/design-v2/docs" },
        { label: "Help",          href: "/design-v2/help" },
      ]}
    />
  );
}
