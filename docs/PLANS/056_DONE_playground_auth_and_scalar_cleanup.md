# Plan 056: Playground Auth & Scalar Cleanup

## Purpose

Enable interactive "Try it" API testing in the Scalar playground, fix the misnamed `sessionCookie` security scheme, and clean remaining Scalar UI clutter (MCP button, sidebar branding).

## JIRA

- **Epic:** AR-560 — Playground Auth & Scalar Cleanup
- **Stories** (one per step below):

  | Step | Story | Working title |
  |---|---|---|
  | 56.1 | AR-563 | Enable "Try it" button (hideTestRequestButton: false) |
  | 56.2 | AR-564 | Fix sessionCookie → bearerToken security scheme |
  | 56.3 | AR-565 | Hide MCP "Generate MCP" button via CSS |
  | 56.4 | AR-566 | Hide sidebar Scalar branding via CSS |
  | 56.5 | AR-567 | End-to-end auth flow test with Scalar auth panel |

- **Planning branch:** `plan/056-057-058-playground-openapi-response-schemas`
- **Implementation branches:** `feat/AR-560-playground-auth-cleanup` per story
- **Sprint:** AR Sprint 7

## Context

Scalar's native auth panel works automatically when the spec declares `securitySchemes` and `hideTestRequestButton` is `false`. Currently:

1. `hideTestRequestButton: true` — blocks all "Try it" functionality.
2. `sessionCookie` is declared as `type: apiKey, in: cookie` but the actual transport is `Authorization: Bearer <jwt>` — must be renamed to `bearerToken` with `type: http, scheme: bearer`.
3. Scalar renders a "Generate MCP" button that we don't want on our surface.
4. Scalar's sidebar contains Scalar-branded elements we need to suppress.

## Steps

### 56.1 — Enable "Try it" button

**File:** `apps/web/src/modules/developer-surface/index.tsx`

- Change `hideTestRequestButton: true` → `hideTestRequestButton: false`

### 56.2 — Fix sessionCookie → bearerToken

**File:** `apps/api/src/modules/developer-surface/openapi-config.ts`

- Rename `sessionCookie` scheme to `bearerToken`
- Change type from `apiKey` + `in: cookie` to `type: http, scheme: bearer`
- Update description to "JWT session token. Browser login. Authorization: Bearer \<jwt\>"
- Update all routes that reference `sessionCookie` in their `security` array to reference `bearerToken`

### 56.3 — Hide MCP button via CSS

**File:** `apps/web/src/modules/developer-surface/developer-surface.css`

- Add CSS selector to hide Scalar's "Generate MCP" button
- Target: `[class*="mcp"]`, `[class*="generate-mcp"]`, `[class*="code-mcp"]`

### 56.4 — Hide sidebar branding via CSS

**File:** `apps/web/src/modules/developer-surface/developer-surface.css`

- Add CSS selectors to hide Scalar-branded elements in the sidebar
- Target: sidebar footer, Scalar logo/name, any remaining external links

### 56.5 — End-to-end auth flow test

**File:** `apps/web/tests/unit/developer-surface.test.ts` (new or extended)

- Test that the Scalar configuration enables `hideTestRequestButton: false`
- Test that the spec declares both `bearerAuth` and `bearerToken` schemes
- Test that API key auth and session auth both produce the correct security panel in Scalar
- Add Vitest + RTL regression test for the CSS overrides

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Enabling "Try it" reveals endpoints we don't want public | All endpoints already have auth guards; Scalar sends real requests to the live backend |
| Renaming `sessionCookie` breaks route security | Grep all route files for `sessionCookie` references and update in lockstep |
| CSS selectors break on Scalar version bump | Pin Scalar version; add visual regression tests |

## Validation

- [x] `/playground` shows "Try it" button on all operations
- [x] API key auth works via Scalar auth panel → successful 200 response
- [x] Session auth works via Scalar auth panel → successful 200 response
- [x] No MCP button visible
- [x] No Scalar branding visible in sidebar
- [x] `npm run typecheck -w @onegoodarea/api` passes
- [x] `npm run typecheck -w @onegoodarea/web` passes
- [x] `npm test` passes (no regressions)
