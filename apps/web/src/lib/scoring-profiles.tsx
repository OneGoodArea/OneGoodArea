/* AR-251 [AR-248-C] Shared scoring-profile catalog.

   Single source of truth for the four scoring-profile cards used on
   the marketing surface (/products/scores) and the /welcome
   onboarding flow's intent picker. The marketing copy + glyphs lived
   inline in apps/web/src/app/design-v2/products/scores/client.tsx
   before AR-251; pulled out here so both consumers stay in sync.

   The four profiles are workflow-shaped, NOT consumer-shaped:
   - residential origination (not "moving")
   - commercial site selection (not "business")
   - investment underwrite (not "investing")
   - research baseline (not "research")

   These are the B2B framings already used on /products/scores. The
   `users.intent` column (AR-218) stores one of the four slugs; that
   slug also doubles as the default `preset_id` the user passes to
   /v1/score later. */

import type { ReactNode } from "react";

export type ProfileSlug = "moving" | "business" | "investing" | "research";

export interface ScoringProfile {
  slug: ProfileSlug;
  /** B2B workflow name. */
  name: string;
  /** One short paragraph describing the workflow the profile serves. */
  use: string;
  /** Render the 36×36 dot-and-hairline glyph for this profile. */
  Glyph: () => ReactNode;
}

export const SCORING_PROFILES: ScoringProfile[] = [
  {
    slug: "moving",
    name: "Residential origination",
    use: "How liveable is this area for a household. Drives the area-quality lens on listing detail pages, valuation flows, and relocation tools.",
    Glyph: GlyphMoving,
  },
  {
    slug: "business",
    name: "Commercial site selection",
    use: "Where to open. Foot traffic, competition density, transport access, spending power, occupancy cost. Drives shortlisting at portfolio scale.",
    Glyph: GlyphBusiness,
  },
  {
    slug: "investing",
    name: "Investment underwrite",
    use: "What this area looks like as an asset. Growth trajectory, yield, regeneration context, tenant demand, downside risk.",
    Glyph: GlyphInvesting,
  },
  {
    slug: "research",
    name: "Research baseline",
    use: "Analyst-friendly default. Balanced weights across safety, transport, amenities, demographics and environment. Survives FOI and procurement review.",
    Glyph: GlyphResearch,
  },
];

export function getProfile(slug: ProfileSlug): ScoringProfile {
  const found = SCORING_PROFILES.find((p) => p.slug === slug);
  if (!found) throw new Error(`Unknown scoring profile slug: ${slug}`);
  return found;
}

/* ============================================================
   Glyphs — 36×36 dot-and-hairline. Same vocabulary as
   product-icons.tsx + the Tabs-set bespoke icons.
   ============================================================ */

function GlyphMoving() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      {/* house silhouette: roof triangle + base */}
      <path d="M 6 18 L 18 8 L 30 18" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10" y="18" width="16" height="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="18" cy="23" r="1.6" fill="currentColor" />
    </svg>
  );
}

function GlyphBusiness() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      {/* storefront: 3 columns + awning */}
      <line x1="6" y1="10" x2="30" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="14" x2="30" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="14" x2="10" y2="28" stroke="currentColor" strokeWidth="1" />
      <line x1="18" y1="14" x2="18" y2="28" stroke="currentColor" strokeWidth="1" />
      <line x1="26" y1="14" x2="26" y2="28" stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="28" x2="30" y2="28" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function GlyphInvesting() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      {/* upward trend: 4 dots + ascending hairline */}
      <line x1="6" y1="28" x2="30" y2="28" stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="28" x2="6" y2="6" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="22" x2="30" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <g fill="currentColor">
        <circle cx="8" cy="22" r="1.6" />
        <circle cx="16" cy="18" r="1.6" />
        <circle cx="23" cy="13" r="1.6" />
        <circle cx="30" cy="8" r="1.6" />
      </g>
    </svg>
  );
}

function GlyphResearch() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      {/* balanced pentagon of dots — research, all weights equal */}
      <g fill="currentColor">
        <circle cx="18" cy="6" r="1.8" />
        <circle cx="30" cy="14" r="1.8" />
        <circle cx="26" cy="28" r="1.8" />
        <circle cx="10" cy="28" r="1.8" />
        <circle cx="6" cy="14" r="1.8" />
      </g>
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
        <path d="M 18 6 L 30 14 L 26 28 L 10 28 L 6 14 Z" />
      </g>
    </svg>
  );
}
