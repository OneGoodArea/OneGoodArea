# Plan 020 — Fix keys-usage-route test (AR-301)

## Purpose

Fix the broken CI typecheck caused by `tests/unit/keys-usage-route.test.ts` not being updated after the route handler was refactored to use `proxySession`.

**JIRA:** [AR-301](https://podnex.atlassian.net/browse/AR-301)

---

## Diagnosis

`apps/web/src/app/api/keys/usage/route.ts` now exports:

```ts
export async function GET(req: NextRequest) {
  return proxySession(req, "/keys/usage");
}
```

But the test still calls `GET()` **with no arguments** in 8 places, causing TS2554 errors. The test also mocks `@/lib/auth`, `@/lib/usage`, `@/lib/db`, `@/lib/logger` and asserts against `sql`/`hasApiAccess` calls — none of which the route touches anymore (it delegates entirely to `proxySession`).

---

## Steps (approved)

### Step 1 — Create branch `fix/AR-301-keys-usage-test`

Branch off `main` with the JIRA key in the name.

### Step 2 — Rewrite `tests/unit/keys-usage-route.test.ts`

Replace the entire file to follow the pattern established in `tests/unit/proxy.test.ts`:

- Mock `@/lib/auth` and `@/lib/server/api-client` (callApi) — remove old mocks for usage/db/logger
- Import `GET` from the route (unchanged)
- Use a `fakeReq()` helper to construct mock `NextRequest` objects
- Test that `proxySession` is called with path `/keys/usage`
- Test 401 when unauthenticated, 200 when authenticated, relay of status/body

### Step 3 — Verify locally

Run `npm run typecheck --workspace=@onegoodarea/web` — must pass clean.

### Step 4 — Commit and push

Small single commit with clear message.
