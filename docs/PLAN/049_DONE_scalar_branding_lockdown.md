# Plan 049: Scalar Branding & External-Link Lockdown (/playground)

## Purpose (one sentence)

Harden the `/playground` Scalar page with a branded home button, the project's
look-and-feel CSS, and disable every Scalar outbound/CTA feature (login,
generate-MCP/SDK/deploy, Scalar branding) so the page makes zero external calls.

## JIRA

- Epic parent: **AR-441** (Playground → /playground Scalar surface).
- Story: **AR-503** — "Scalar branding & external-link lockdown (/playground)".
  One branch `feat/AR-503-scalar-branding-lockdown`. Planning branch:
  `plan/scalar-branding-lockdown`.
- This plan is ONE story. Steps are subtasks of AR-503, each a commit on the
  branch (see Plan 047):

| Step | Subtask | Maps to |
|---|---|---|
| 49.1 | AR-530 | Branded home button / shell |
| 49.2 | AR-531 | Apply look-and-feel CSS |
| 49.3 | AR-532 | Kill external CTAs |
| 49.4 | AR-533 | CSP defense-in-depth (optional) |
| 49.5 | AR-534 | Tests |

## Execution

Develop in a git worktree (Plan 047). Wave 3b — after Plan 043 (surface exists)
+ Plan 050 (independent module). One branch; each step a commit. CI green before
merge.

---

## Context / current state (verified)

- `/playground` renders `<ApiReferenceReact configuration={{ url: '/api/openapi-spec' }}>`
  (`apps/web/src/app/playground/page.tsx`, after Plan 050). The component is
  **bundled locally** (`@scalar/api-reference-react/style.css` imported) → no CDN
  by default. Good baseline.
- Scalar config (verified against installed `@scalar/api-reference` 1.59.2)
  supports: `customCss` (string), CSS vars (`--scalar-background-1`,
  `--scalar-color-1`, `--scalar-color-accent`, …), `hideClientButton`,
  `documentDownloadType`, `hideScalarBranding`, `hideDefaultFooter`,
  `showDeveloperTools`, and an `authentication` block (omitting it disables Scalar
  login/community).
- Project brand tokens live in `styles/brand/components.css` (`.oga-*` classes,
  CSS vars, project fonts).

---

## Steps

### 49.1 — Branded home button / shell
Wrap `<ApiReferenceReact>` in the existing site shell (reuse `design-v2/_shared/nav`
/ header pattern) with a home control linking to `/`. Applies to `/playground`.

### 49.2 — Apply look-and-feel CSS
Inject `customCss` mapping Scalar CSS vars to brand tokens (`--scalar-color-accent`
→ brand primary, `--scalar-background-1` → surface, …); set `withDefaultFonts:
false` to use project fonts; mirror spacing/typography.

### 49.3 — Kill all external CTAs
Config: `hideClientButton: true` (removes Generate Client/SDK/**MCP**/deploy
modal), `documentDownloadType: 'none'`, `hideScalarBranding: true`,
`hideDefaultFooter: true`, `showDeveloperTools: false`, and **omit `authentication`**
(no Scalar login/community). No `proxyUrl` (we serve our own spec via BFF).

### 49.4 — Defense-in-depth (optional hardening)
Add a `Content-Security-Policy` / meta on the route blocking connections to
`scalar.com`/external origins, so even future CTA additions can't phone home.

### 49.5 — Tests (see Test Gates below)

---

## Safeguards & Execution Gates

**Where code may be written** — `main`: ❌ never edited directly. Implementation on
`feat/AR-503-scalar-branding-lockdown` inside a git worktree.

**Branch protection (via GitHub MCP)** — verify `main` protection before first PR;
own PR; CI green before merge.

**Test execution model** — unit + e2e in `web-test` container; tear down after.

**Rollback / abort** — independently revertible; no destructive action without confirm.

---

## Test Gates

**AFTER coding (must pass)**
- Home button present on `/playground` and links to `/`.
- Brand applied: a Scalar CSS var is overridden to a brand token; project font in use.
- **No external CTAs render:** assert absence of Login, Generate Client/SDK/**MCP**/
  Deploy, "Powered by Scalar", and any `scalar.com` link.
- **E2E network guard:** load `/playground` and assert **zero requests to
  non-same-origin hosts** (only `onegoodarea.com`/localhost) — proves no outbound
  Scalar calls.

---

## Risks
- `customCss` var names shift across Scalar versions → pin/verify against the
  installed version; `hideClientButton` must also kill the in-modal MCP generate
  (verified in 1.59.2).

## Out of scope
- Spec sync (046/048); developer surface content (043/050).
