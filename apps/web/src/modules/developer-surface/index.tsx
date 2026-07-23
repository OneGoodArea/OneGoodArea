"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ApiReferenceReact } from "@scalar/api-reference-react"
import "@scalar/api-reference-react/style.css"
import "./developer-surface.css"

export interface DeveloperSurfaceProps {
  /** URL to the OpenAPI spec JSON. Defaults to /api/openapi-spec */
  specUrl?: string
}

/**
 * Branded Scalar API reference wrapper.
 * Renders the full API playground at /playground.
 *
 * Lockdown (Plan 049):
 * - hideClientButton: removes Generate Client/SDK/MCP/Deploy modal
 * - hideTestRequestButton: no inline "Try it" forms
 * - hideSearch: removes search bar
 * - hideDownloadButton, hideModels, hideDarkModeToggle
 * - showDeveloperTools: "never"
 * - telemetry: false, persistAuth: false, isEditable: false
 * - customCss: hides Scalar branding links as defense-in-depth
 *
 * Tier-aware auth (AR-598, Plan 059.6):
 * - Anonymous visitor: no security scheme preselected. Try-It still works
 *   with no auth header on the routes allow-listed for the `anonymous`
 *   tier (AR-594, Plan 059.2) — everything else 401s same as before.
 * - Logged-in visitor: on mount, asks the web BFF for a working API key
 *   (the caller's own, or a fresh end-of-day one if they have none — AR-595,
 *   Plan 059.3) and preloads it into Scalar's bearerAuth field so Try-It
 *   works without the visitor copy-pasting anything. If they already have
 *   a real key, the BFF returns none (its plaintext can't be retrieved) and
 *   the bearerAuth field is just selected, empty, ready for them to paste
 *   their own.
 */
export function DeveloperSurface({
  specUrl = "/api/openapi-spec",
}: DeveloperSurfaceProps) {
  const { status } = useSession()
  const [apiKey, setApiKey] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    fetch("/api/keys/playground", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { key?: string | null } | null) => {
        if (!cancelled && data?.key) setApiKey(data.key)
      })
      .catch(() => {
        // Best-effort: Try-It still works with the visitor pasting their own key.
      })
    return () => {
      cancelled = true
    }
  }, [status])

  return (
    <div className="oga-root developer-surface">
      {/* 49.1 — Branded home button / shell */}
      <header className="developer-surface__header">
        <Link href="/" className="developer-surface__home" aria-label="Back to OneGoodArea home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>OneGoodArea</span>
        </Link>
        <span className="developer-surface__label">API Playground</span>
      </header>

      {/* 49.2 + 49.3 — Brand CSS + CTA lockdown via config */}
      <div className="developer-surface__scalar">
        <ApiReferenceReact
          configuration={{
            spec: { url: specUrl },
            theme: "none",
            withDefaultFonts: false,
            hideClientButton: true,
            hideTestRequestButton: false,
            hideSearch: true,
            hideDownloadButton: true,
            hideModels: true,
            hideDarkModeToggle: true,
            showDeveloperTools: "never",
            documentDownloadType: "none",
            telemetry: false,
            persistAuth: false,
            isEditable: false,
            showSidebar: true,
            layout: "modern",
            authentication: status === "authenticated"
              ? {
                  preferredSecurityScheme: "bearerAuth",
                  ...(apiKey ? { securitySchemes: { bearerAuth: { token: apiKey } } } : {}),
                }
              : { preferredSecurityScheme: null },
            customCss: `
              /* 49.4 — Defense-in-depth: hide Scalar branding links */
              a[href*="scalar.com"],
              a[href*="github.com/scalar"],
              .references-renderer-footer,
              .references-footer,
              [class*="info-block"] a { display: none !important; }
            `,
          }}
        />
      </div>
    </div>
  )
}
