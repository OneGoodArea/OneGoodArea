# 075 — client_app as an opaque string (drop the ClientApp enum)

**Purpose:** Keep server-side User-Agent sniffing for `source` and `client_app`, but stop treating `client_app` as a closed enum. `RequestContext.client_app` becomes an opaque `string` — analytics-only, never a business decision. See ADR 0039.

**Linked Jira:**
- Task: AR-759

**Dependency:** AR-755/756/757 (estate-agents UA + classifier, PR #499) and AR-758 (proptech UA, PR #517) are merged on `main` — the classifier keeps its `estate-agents` / `proptech` rules; only the *type* changes.

## Scope

### In scope
- `apps/api/src/shared/request-context.ts`: delete the `ClientApp` union; `client_app` becomes `string` (doc comment notes opaque + analytics-only).
- `apps/api/src/shared/http.ts`: delete the unused `isFromMcpServer` helper (zero callers since app.ts split); `classifyClientApp` return type + local now type `client_app: string`; update the AR-375 comment.
- `docs/DECISIONS/0039-client-app-opaque-string.md` (ADR) + `docs/PLAN/075_*` + DECISIONS index/log rows.
- Tests: none needed — `tests/shared/http.test.ts` asserts string literals and passes unchanged.

### Explicitly out of scope (user decisions)
- No `X-Client-App` header / client-declared design (earlier option dropped — keep UA sniffing).
- No client changes: `mcp/src/api-client.ts` and `apps/web/src/lib/showcase/api.ts` keep their UA stamps.
- `source: "mcp" | "api"` stays a closed union.
- Persisted semantics unchanged: `activity.client_app`, `training` TEXT columns, and the admin `by_client_app` aggregate (COALESCE to `"other"`) all behave identically.
- `me.ts:835-836` UA use (pageview device detection) untouched.

## Verification (containers — docker)
- `make build-api-test-image` (rebuilt from worktree — the api-test image bakes `src/`, tests only mount `tests/`).
- `make api-test-container` — 104 files / 1277 tests green.
- Container typecheck `tsc --noEmit` clean; lint 0 errors (warnings pre-existing, none in touched files).

## Rollback
- `git revert <sha>` of the commit; `client_app` was already stored as TEXT on events/training tables, so no data migration is required in either direction.

## Notes for reviewers
- The classifier's priority order and rules are untouched — this is a type-level refactor only.
- `isFromMcpServer` removal is safe: `rg isFromMcpServer apps mcp` returns nothing; only historical docs (PLANS 018/029) mention it.
