"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/logo";

export function FullNavbar({ breadcrumb }: { breadcrumb?: string } = {}) {
  const { data: session } = useSession();
  const isSignedIn = !!session;

  return (
    <header role="banner" className="border-b" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo href="/" />
          <span className="text-[10px] font-mono px-1.5 py-0.5 border" style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            BETA
          </span>
          {breadcrumb && (
            <>
              <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {breadcrumb}
              </span>
            </>
          )}
        </div>
        <nav className="flex items-center gap-4 md:gap-6" aria-label="Main">
          <Link href="/business" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80 py-2" style={{ color: "var(--text-tertiary)" }}>Business</Link>
          <Link href="/docs" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80 py-2" style={{ color: "var(--text-tertiary)" }}>API</Link>
          <Link href="/pricing" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80 py-2" style={{ color: "var(--text-tertiary)" }}>Pricing</Link>
          <Link href="/about" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80 py-2" style={{ color: "var(--text-tertiary)" }}>About</Link>
          <Link href={isSignedIn ? "/dashboard" : "/sign-in"} className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide" style={{ background: "var(--text-primary)", color: "var(--bg)" }}>
            {isSignedIn ? "Dashboard" : "Sign In"} <ArrowRight size={12} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
