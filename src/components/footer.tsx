import { Logo } from "@/components/logo";

export function Footer({ maxWidth = "1200px" }: { maxWidth?: string }) {
  return (
    <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto px-6 h-10 flex items-center justify-between" style={{ maxWidth }}>
        <Logo size="sm" variant="footer" />
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          Area intelligence, instantly.
        </span>
      </div>
    </footer>
  );
}
