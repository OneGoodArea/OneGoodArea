/* Social icons — monochrome silhouettes of the brand glyphs.
   X (X.com), LinkedIn, Email (envelope).

   Multicolor brand logos clash with the Plotted two-color system,
   so we use single-currentColor silhouettes. Users recognize the
   brand from the silhouette alone (this is the pattern Stripe,
   Linear, Vercel use in their footers).

   AR-204 PR 2 / commit 8. */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
};

export function XIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M20.45 20.45h-3.555v-5.569c0-1.328-.027-3.037-1.85-3.037-1.853 0-2.136 1.445-2.136 2.94v5.666H9.355V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.6 0 4.267 2.37 4.267 5.455v6.284zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.45H3.554V9h3.565v11.45zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.541C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function EmailIcon(props: IconProps) {
  /* Envelope silhouette — universally readable as "email."
     Gmail's multicolor M would clash w/ the brand's two-color system. */
  return (
    <svg {...baseProps} {...props}>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}
