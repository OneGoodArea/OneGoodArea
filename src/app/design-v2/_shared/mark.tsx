/* Logo mark — concentric rings + offset chartreuse dot ("the area locked in").
   Used in the Wordmark component. Accepts an optional tone for dark surfaces. */

type MarkProps = { size?: number; tone?: "light" | "dark" };

export function Mark({ size = 22, tone = "light" }: MarkProps) {
  const stroke     = tone === "dark" ? "#FFFFFF" : "var(--ink)";
  const dotStroke  = tone === "dark" ? "#FFFFFF" : "var(--ink-deep)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.3" />
      <circle cx="12" cy="12" r="5.5" stroke={stroke} strokeWidth="1.3" />
      <circle cx="15.4" cy="9.2" r="2.1" fill="var(--signal)" stroke={dotStroke} strokeWidth="1.1" />
    </svg>
  );
}
