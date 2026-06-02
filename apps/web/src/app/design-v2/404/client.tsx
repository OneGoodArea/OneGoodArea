"use client";

import { ErrorShell } from "../_shared/error-shell";

export default function NotFoundClient() {
  return (
    <ErrorShell
      code="404"
      title="That route doesn't resolve."
      sub="The page you requested isn't here. It might have been moved, renamed, or never existed. Head back to a known route below."
      primaryCta={{ label: "Go home", href: "/" }}
      secondaryCta={{ label: "Read the methodology", href: "/methodology" }}
      quickLinks={[
        { label: "Pricing",  href: "/pricing" },
        { label: "Business", href: "/business" },
        { label: "Docs",     href: "/docs" },
        { label: "Help",     href: "/help" },
      ]}
    />
  );
}
