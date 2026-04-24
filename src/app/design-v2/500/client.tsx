"use client";

import { ErrorShell } from "../_shared/error-shell";

export default function ErrorClient() {
  return (
    <ErrorShell
      code="500"
      title={<>Our engine <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>tripped.</em></>}
      sub="Something on our side went wrong while reading the postcode. We've logged it. Try again in a moment, or head back to a known route."
      primaryCta={{ label: "Try again", onClick: () => window.location.reload() }}
      secondaryCta={{ label: "Go home", href: "/" }}
      quickLinks={[
        { label: "Dashboard", href: "/" },
        { label: "Help",      href: "/help" },
        { label: "Contact",   href: "mailto:hello@area-iq.co.uk" },
      ]}
    />
  );
}
