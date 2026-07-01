"use client";

import { useEffect, useRef } from "react";

/* Cloudflare Turnstile widget for /playground. Loads the api.js script
   once per page, renders a single widget, and calls back with the
   solved token. When NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset the
   parent should not mount this component — it treats missing script
   or missing sitekey as an error path.

   Managed mode is the default and gives Cloudflare full control over
   whether to show an interactive challenge or auto-solve invisibly. */

interface TurnstileGlobal {
  render: (
    el: HTMLElement,
    config: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: (code?: string) => void;
      "expired-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
    __ogaTurnstileOnload?: () => void;
  }
}

const SCRIPT_ID = "oga-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__ogaTurnstileOnload";

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: (code: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  /* Keep refs in sync with the latest callbacks so the render effect
     can capture them without listing the callbacks in its deps (which
     would tear down + rebuild the widget on every render). */
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    const renderWidget = () => {
      const el = containerRef.current;
      if (!el || widgetIdRef.current !== null) return;
      const t = window.turnstile;
      if (!t) return;
      try {
        widgetIdRef.current = t.render(el, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "error-callback": (code) => onErrorRef.current?.(code ?? "turnstile_error"),
          "expired-callback": () => {
            /* Session cookie is a full 24h so we don't refresh here;
               a page reload gets a fresh widget + token. */
          },
          theme: "auto",
          size: "flexible",
        });
      } catch (err) {
        onErrorRef.current?.(err instanceof Error ? err.message : "turnstile_render_failed");
      }
    };

    /* If the script is already loaded, render immediately. Otherwise
       set up the shared onload hook and inject the tag. */
    if (window.turnstile) {
      renderWidget();
    } else {
      window.__ogaTurnstileOnload = renderWidget;
      if (!document.getElementById(SCRIPT_ID)) {
        const s = document.createElement("script");
        s.id = SCRIPT_ID;
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        s.onerror = () => onErrorRef.current?.("turnstile_script_load_failed");
        document.head.appendChild(s);
      }
    }

    return () => {
      const id = widgetIdRef.current;
      if (id !== null && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* Fine — component unmounted before Cloudflare finished cleanup. */
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  return <div ref={containerRef} className="oga-play-turnstile" />;
}
