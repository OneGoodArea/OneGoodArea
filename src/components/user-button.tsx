"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

export function UserButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!session?.user) return null;

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.user.email?.[0]?.toUpperCase() || "U";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 flex items-center justify-center text-[10px] font-mono font-semibold border transition-colors cursor-pointer"
        style={{
          background: open ? "var(--bg-active)" : "var(--bg-elevated)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 border z-50"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
        >
          <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {session.user.name || "User"}
            </div>
            <div className="text-[10px] font-mono truncate" style={{ color: "var(--text-tertiary)" }}>
              {session.user.email}
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="w-full px-3 py-2 flex items-center gap-2 text-[11px] font-mono transition-colors hover:brightness-110"
            style={{ color: "var(--text-secondary)" }}
          >
            <Settings size={12} />
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full px-3 py-2 flex items-center gap-2 text-[11px] font-mono transition-colors hover:brightness-110 cursor-pointer border-t"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
