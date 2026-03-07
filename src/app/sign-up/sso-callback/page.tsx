"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grid">
      <div className="text-center">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--border-active)", borderTopColor: "transparent" }} />
        <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Creating account...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
