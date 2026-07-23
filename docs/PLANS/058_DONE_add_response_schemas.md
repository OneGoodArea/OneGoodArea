# Plan 058: Add response schemas to all backend routes

## Purpose

Add Fastify `response` schemas to every backend route handler so the OpenAPI spec includes full response body definitions. This is the root cause of Scalar showing "No Body" for every operation — the spec has zero response schemas.

## JIRA

- **Epic:** AR-562 — Add response schemas to all backend routes
- **Stories** (one per module):

  | # | Story | Module | Routes |
  |---|---|---|---|
  | 58.1 | AR-572 | signals | /v1/area, /v1/scores, /v1/bundles, /v1/presets, signal endpoints |
  | 58.2 | AR-573 | scoring | /v1/score, score presets |
  | 58.3 | AR-574 | intelligence | /v1/query, /v1/peers, /v1/insights, /v1/forecast |
  | 58.4 | AR-575 | monitor | /v1/portfolios, portfolio items |
  | 58.5 | AR-576 | orgs | /v1/orgs, org members |
  | 58.6 | AR-577 | auth | login, signup, logout, sessions |
  | 58.7 | AR-578 | api-keys | /v1/keys CRUD |
  | 58.8 | AR-579 | billing | Stripe routes, subscriptions |
  | 58.9 | AR-580 | usage | /v1/usage, quota endpoints |
  | 58.10 | AR-581 | activity | /v1/activity |
  | 58.11 | AR-582 | tracking | analytics, pageviews |
  | 58.12 | AR-583 | webhooks | /v1/webhooks CRUD |
  | 58.13 | AR-584 | admin | admin analytics |
  | 58.14 | AR-585 | tiers | tier-related endpoints |
  | 58.15 | AR-586 | training | training endpoints |
  | 58.16 | AR-587 | developer-surface | openapi-spec endpoint |
  | 58.17 | AR-588 | dashboard | dashboard composite data |

- **Planning branch:** `plan/056-057-058-playground-openapi-response-schemas`
- **Implementation branches:** `feat/AR-562-response-schemas/module-{name}` per story
- **Sprint:** AR Sprint 7 — all 17 stories batched; parallel branches recommended

## Context

Every backend route handler registers a `schema` object with `@fastify/swagger` but none declares a `response` property. This means the generated OpenAPI spec has `responses: {}` on every path — Scalar renders "No Body" for all operations. The request schemas (`body`, `querystring`, `params`) exist from Plans 046/048, but response schemas were never backfilled.

Response schemas should use Zod objects from `@onegoodarea/contracts` where available, or inline `z.object()` for simple responses. The existing Zod type provider (Plan 048) makes this straightforward.

## Pattern

Each route handler typically looks like:

```typescript
schema: {
  tags: ["Signals"],
  body: areaBodySchema,           // exists
  querystring: areaQuerySchema,   // exists
  response: {                     // MISSING — add this
    200: areaResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    429: errorResponseSchema,
  },
}
```

Use existing schemas from `@onegoodarea/contracts` (or create shared error response schemas):

```typescript
// Shared error schemas — create once, import everywhere
export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number(),
});

export const PaginatedResponse = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });
```

## Steps (per module)

For each module:

1. Create or identify the response schema Zod objects
2. Add `response` property to each route's schema object
3. Add common error responses (401, 403, 429, 500) — extract to shared file
4. Run typecheck
5. Run tests
6. Verify the generated spec includes response schemas

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Response shape diverges from actual handler output | Each schema must match the actual return type; run tests after each module |
| Large scope (17 modules) | Parallel worktrees per module; each is ~5-30 min of work |
| Shared error schemas need one place | Create `apps/api/src/shared/response-schemas.ts` once |

## Validation

- [x] Every route in `/api/openapi-spec` has non-empty `responses` for at least 200
- [x] `npm run typecheck -w @onegoodarea/api` passes
- [x] `npm test` passes (no regressions)
- [x] Scalar shows response body schemas for every operation at `/playground`
- [x] CI guard (from Plan 046) updated to assert response schemas exist
