/* The Plotted mark — 7x7 dot grid clipped to a circle, with the center
   dot enlarged. The "one good area" found in a field. AR-152 (brand v3).

   Backward-compatible signature: same MarkProps shape as the previous
   concentric-rings mark so every consumer keeps working without changes.
   `tone` selects an explicit color; omit it to let the mark inherit
   `currentColor` from the parent. */

type MarkProps = { size?: number; tone?: "light" | "dark"; className?: string };

/* The mark always renders the full 7x7 dot grid — the brand mark Pedro
   shipped, not a simplified fallback. Crisp from 28px upward; consumers
   that need it smaller should size the parent up to compensate. */

export function Mark({ size = 36, tone, className }: MarkProps) {
  const fill =
    tone === "dark" ? "var(--oga-white)" :
    tone === "light" ? "var(--oga-green)" :
    "currentColor";

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden className={className} style={{ display: "block" }}>
      <g fill={fill}>
        <circle cx="60" cy="18" r="2.6" />
        <circle cx="32" cy="32" r="2.6" /><circle cx="46" cy="32" r="2.6" /><circle cx="60" cy="32" r="2.6" /><circle cx="74" cy="32" r="2.6" /><circle cx="88" cy="32" r="2.6" />
        <circle cx="18" cy="46" r="2.6" /><circle cx="32" cy="46" r="2.6" /><circle cx="46" cy="46" r="2.6" /><circle cx="60" cy="46" r="2.6" /><circle cx="74" cy="46" r="2.6" /><circle cx="88" cy="46" r="2.6" /><circle cx="102" cy="46" r="2.6" />
        <circle cx="18" cy="60" r="2.6" /><circle cx="32" cy="60" r="2.6" /><circle cx="46" cy="60" r="2.6" /><circle cx="60" cy="60" r="5" /><circle cx="74" cy="60" r="2.6" /><circle cx="88" cy="60" r="2.6" /><circle cx="102" cy="60" r="2.6" />
        <circle cx="18" cy="74" r="2.6" /><circle cx="32" cy="74" r="2.6" /><circle cx="46" cy="74" r="2.6" /><circle cx="60" cy="74" r="2.6" /><circle cx="74" cy="74" r="2.6" /><circle cx="88" cy="74" r="2.6" /><circle cx="102" cy="74" r="2.6" />
        <circle cx="32" cy="88" r="2.6" /><circle cx="46" cy="88" r="2.6" /><circle cx="60" cy="88" r="2.6" /><circle cx="74" cy="88" r="2.6" /><circle cx="88" cy="88" r="2.6" />
        <circle cx="60" cy="102" r="2.6" />
      </g>
    </svg>
  );
}
