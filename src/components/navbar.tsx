import Link from "next/link";
import { Logo } from "@/components/logo";

interface BreadcrumbItem {
  label: string;
  href?: string;
  hiddenOnMobile?: boolean;
}

interface NavbarProps {
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
  maxWidth?: string;
}

export function Navbar({ breadcrumbs, children, maxWidth = "1200px" }: NavbarProps) {
  return (
    <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto px-6 h-12 flex items-center justify-between" style={{ maxWidth }}>
        <div className="flex items-center gap-3">
          <Logo href="/" />
          {breadcrumbs?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className={`text-[10px] font-mono uppercase tracking-wider transition-colors hover:opacity-80 ${crumb.hiddenOnMobile ? "hidden sm:inline" : ""}`}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider ${crumb.hiddenOnMobile ? "hidden sm:inline" : ""}`}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>

        {children && (
          <div className="flex items-center gap-4">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
