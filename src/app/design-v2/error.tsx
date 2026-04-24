"use client";

import { useEffect } from "react";
import { ErrorShell } from "./_shared/error-shell";

/* Next.js convention · fires when any /* route throws.
   Must be a client component; receives { error, reset } props. */

export default function DesignV2Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for Sentry / logger integration if available.
    // eslint-disable-next-line no-console
    console.error("[design-v2] unhandled error:", error);
  }, [error]);

  return (
    <ErrorShell
      code="500"
      title={<>Our engine <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>tripped.</em></>}
      sub="Something on our side went wrong while rendering this page. We've logged it. You can try again, or head back to a known route."
      primaryCta={{ label: "Try again", onClick: reset }}
      secondaryCta={{ label: "Go home", href: "/" }}
      quickLinks={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Help",      href: "/help" },
        { label: "Contact",   href: "mailto:hello@area-iq.co.uk" },
      ]}
    />
  );
}
