"use client";

import { ErrorShell } from "../_shared/error-shell";

export default function ErrorClient() {
  return (
    <ErrorShell
      code="500"
      title="Our engine tripped."
      sub="Something on our side went wrong. We've logged it. Try again in a moment, or head back to a known route."
      primaryCta={{ label: "Try again", onClick: () => window.location.reload() }}
      secondaryCta={{ label: "Go home", href: "/" }}
      quickLinks={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Help",      href: "/help" },
        { label: "Contact",   href: "mailto:operation@onegoodarea.co.uk" },
      ]}
    />
  );
}
