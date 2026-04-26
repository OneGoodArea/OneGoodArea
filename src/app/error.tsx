"use client";

import { useEffect } from "react";
import { ErrorShell } from "@/app/design-v2/_shared/error-shell";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[OneGoodArea] Unhandled error:", error);
    Sentry.captureException(error);
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
