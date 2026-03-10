import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer({ maxWidth = "1200px" }: { maxWidth?: string }) {
  return (
    <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ maxWidth }}>
        <Logo size="sm" variant="footer" />
        <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/business" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Business
          </Link>
          <Link href="/docs" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            API Docs
          </Link>
          <Link href="/methodology" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Methodology
          </Link>
          <Link href="/pricing" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Pricing
          </Link>
          <Link href="/about" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            About
          </Link>
          <Link href="/changelog" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Changelog
          </Link>
          <Link href="/help" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Help
          </Link>
          <Link href="/terms" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Terms
          </Link>
          <Link href="/privacy" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
