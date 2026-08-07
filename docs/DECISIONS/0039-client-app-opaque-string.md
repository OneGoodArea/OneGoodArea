# ADR 0039 — `client_app` as an opaque string (drop the `ClientApp` enum)

- **Status:** Accepted
- **Date:** 2026-08-07
- **Context refs:** AR-759. Builds on ADR 0035-era AR-375 (per-request
  `{source, client_app}` stamping via AsyncLocalStorage) and AR-755/756/757 +
  AR-758 (attributable demo UAs). Supersedes the closed-union treatment of
  `client_app` introduced with AR-375.

## Context

The API stamps every request with `{source, client_app}` in a Fastify
`onRequest` hook (`app.ts`), derived from the User-Agent by `classifyClientApp()`
(`shared/http.ts`), and stashed in AsyncLocalStorage (`shared/request-context.ts`).
Since AR-375, `client_app` has been a **closed union**:

```ts
type ClientApp = "claude-desktop" | "cursor" | "claude-code"
               | "estate-agents" | "proptech" | "other";
```

Every consumer is **analytics-only**: `tracking/activity.ts` (event metadata),
`training/planner-logs.ts` + `brief-composer-logs.ts` (TEXT columns), and the
admin `by_client_app` aggregate (COALESCE to `"other"`). Nothing makes a
business decision on it. The closed union caused two problems:

1. **Adding a client forced a type change.** Each new wrapping client or demo
   UA (Claude Desktop, Cursor, Claude Code, estate-agents, proptech) required
   editing the type in `request-context.ts` before the classifier rule could
   compile. The type was coupled to the growth of the sniffing rules.
2. **The union implied exhaustiveness that never existed.** `client_app` is
   derived from a free-form User-Agent, so "other" was always reachable and
   every future UA needed a rule or fell through. A closed union suggested a
   value set the system could not actually guarantee.

The question this ADR records the answer to: should `client_app` remain a
closed enum, or become an opaque string?

## Decision

### 1. `client_app` becomes an opaque `string`

- `RequestContext.client_app: string` — delete the `ClientApp` union.
- `classifyClientApp()` keeps returning `{source, client_app}`; the return
  type and local are `client_app: string`, defaulting to `"other"`.
- Server-side User-Agent sniffing is **kept** for both `source` and
  `client_app`. The earlier candidate of a client-declared `X-Client-App`
  header is rejected (see Alternatives). No client (MCP api-client, showcase
  lib) changes its UA stamps.
- `source: "mcp" | "api"` stays a closed union — it has a true binary
  discriminant and no third value is expected.

### 2. Delete the dead `isFromMcpServer` helper

`isFromMcpServer` (detect the `onegoodarea-mcp-server` UA stamp) has had zero
callers since the app.ts split. It is removed; nothing regains it unless a real
caller appears.

### 3. Semantic contract unchanged

Persisted columns and reporting behave identically: `activity.client_app`,
the training-log TEXT columns, and the admin `by_client_app` aggregate keep
their string values and `"other"` fallback. This is a type-level refactor with
no SQL migration.

## Consequences

### Enables

- **Zero-touch onboarding of new clients.** A new wrapping client or demo needs
  only a classifier rule (and its test), never a type edit — the loop closed
  by AR-757 tests keeps growing freely.
- **Honest typing.** The type no longer claims a value set the system cannot
  enforce from a free-form UA.

### Costs

- **Loss of exhaustiveness checks.** A typo in a classifier rule can no longer
  be caught by the compiler. Mitigated by the classifier's test suite
  (`tests/shared/http.test.ts`), which pins every rule, and by the fact that
  `client_app` is analytics-only — a wrong label has no functional impact.
- **Docs/type references to update.** Historical PLAN docs (029, 074) mention
  the enum; those are `_DONE_` records and are left as historical trail rather
  than rewritten.

### Future supersession criteria

This ADR is superseded when:

- A consumer starts making a **business decision** on `client_app` — then a
  real validation domain (and possibly a new enum or a dedicated header) is
  warranted, and a new ADR records it.
- `source` gains a third value, which would replace its closed union.

## Alternatives considered

### A. Keep the closed enum

Rejected. It forced a type edit on every new client and implied exhaustiveness
the data cannot guarantee. The compiler check it provided was weak — the type
was only ever compared against string literals produced by the same file that
defined it.

### B. Client-declared `X-Client-App` header (drop UA sniffing)

Rejected (user decision). Moving attribution to the client lets any caller
claim any label, weakening trust in analytics for zero upside here; UA sniffing
is server-owned and already works for MCP + both demos. A future first-party
header could complement sniffing if a real need appears, but not replace it.

### C. Keep `isFromMcpServer`

Rejected. Zero callers since the app.ts split; keeping a dead exported function
is a maintenance trap with no current consumer.
