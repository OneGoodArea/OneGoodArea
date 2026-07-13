import Link from "next/link";
import type { ReactNode } from "react";

/* Central "Book a demo" target + button. The pricing page, nav, hero and
   footer all point here so the demo destination lives in ONE place (AR-456).

   TODO(AR-456): DEMO_URL currently falls back to the /contact form. Swap it
   to the external scheduler (Cal.com / Calendly) once the link is confirmed.
   If the value starts with http, the button opens it in a new tab. */
export const DEMO_URL = "/contact";

export function BookDemo({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const external = DEMO_URL.startsWith("http");
  if (external) {
    return (
      <a
        href={DEMO_URL}
        className={className}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={DEMO_URL} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
