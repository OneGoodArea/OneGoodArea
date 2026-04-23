/* Logo mark — concentric rings + offset chartreuse dot ("the area locked in").
   Used in the Nav wordmark and the Footer brand block. */

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="var(--ink)" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="5.5" stroke="var(--ink)" strokeWidth="1.3" />
      <circle cx="15.4" cy="9.2" r="2.1" fill="var(--signal)" stroke="var(--ink-deep)" strokeWidth="1.1" />
    </svg>
  );
}
