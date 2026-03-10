import Link from "next/link";
import { Home, FileSearch, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <div
      className="bg-grid flex flex-col min-h-screen"
      style={{ background: "var(--bg)" }}
    >
      <Navbar breadcrumbs={[{ label: "404" }]} />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-[520px]">
          {/* Terminal window */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-elevated)",
            }}
          >
            {/* Terminal title bar */}
            <div
              className="flex items-center gap-2 px-4 h-9 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ background: "var(--neon-red)" }}
                />
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ background: "var(--neon-amber)" }}
                />
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ background: "var(--neon-green)" }}
                />
              </div>
              <span
                className="ml-2 text-[10px] font-mono uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                area-iq / route-resolver
              </span>
            </div>

            {/* Terminal body */}
            <div className="p-5 space-y-2">
              {/* Command */}
              <div className="font-mono text-[11px] flex items-center gap-2">
                <span style={{ color: "var(--neon-green)" }}>$</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  resolve --path /unknown
                </span>
              </div>

              {/* Spacer */}
              <div className="h-1" />

              {/* Error output */}
              <div className="font-mono text-[11px] space-y-1">
                <div className="flex items-start gap-2">
                  <span style={{ color: "var(--neon-red)" }}>ERR</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Route not found in application tree
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ color: "var(--neon-red)" }}>ERR</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Status: <span style={{ color: "var(--neon-red)" }}>404</span>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ color: "var(--neon-amber)" }}>WARN</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    The page you requested does not exist or has been moved.
                  </span>
                </div>
              </div>

              {/* Spacer */}
              <div className="h-1" />

              {/* Suggestion */}
              <div className="font-mono text-[11px] flex items-start gap-2">
                <span style={{ color: "var(--neon-green)" }}>TIP</span>
                <span style={{ color: "var(--text-tertiary)" }}>
                  Try one of the routes below, or head back to the homepage.
                </span>
              </div>

              {/* Blinking cursor */}
              <div className="font-mono text-[11px] flex items-center gap-2">
                <span style={{ color: "var(--neon-green)" }}>$</span>
                <span
                  className="inline-block w-[7px] h-[14px] animate-pulse"
                  style={{ background: "var(--neon-green)" }}
                />
              </div>
            </div>
          </div>

          {/* 404 heading */}
          <div className="mt-8 text-center">
            <h1
              className="font-mono text-[64px] font-bold leading-none tracking-tight neon-red-glow"
              style={{ color: "var(--neon-red)" }}
            >
              404
            </h1>
            <p
              className="mt-2 text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              This page could not be found.
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-10 rounded-md text-[12px] font-medium transition-all hover:brightness-110"
              style={{
                background: "var(--neon-green)",
                color: "var(--bg)",
              }}
            >
              <Home size={14} />
              Go Home
            </Link>
            <Link
              href="/report"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-10 rounded-md border text-[12px] font-medium transition-all hover:brightness-125"
              style={{
                borderColor: "var(--border-hover)",
                color: "var(--text-primary)",
                background: "var(--bg-elevated)",
              }}
            >
              <FileSearch size={14} />
              Generate Report
              <ArrowRight size={12} style={{ color: "var(--text-tertiary)" }} />
            </Link>
          </div>

          {/* Quick links */}
          <div
            className="mt-6 flex items-center justify-center gap-4 text-[10px] font-mono uppercase tracking-wider"
          >
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:opacity-80"
                style={{ color: "var(--text-tertiary)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
