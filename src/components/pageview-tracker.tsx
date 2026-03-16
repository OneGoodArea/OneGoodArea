"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("aiq-sid");
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("aiq-sid", id);
  }
  return id;
}

export function PageviewTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    // Don't track the same path twice in a row (strict mode double-fire)
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const sessionId = getSessionId();

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        sessionId,
      }),
    }).catch(() => {}); // Fire and forget
  }, [pathname]);

  return null;
}
