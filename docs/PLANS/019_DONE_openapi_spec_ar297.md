# Plan 019: OpenAPI/Swagger Spec for API Container

## Purpose

Add auto-generated OpenAPI 3.x documentation to `apps/api`, exposed at `/docs` (Swagger
UI) and `/openapi.json` (raw spec). Consumers (web BFF, external integrators, internal
devs) get a browsable, always-up-to-date API reference generated from the live code.

## JIRA

[AR-297](https://podnex.atlassian.net/browse/AR-297) — OpenAPI/Swagger Spec for API Container

## Decisions (from planning session)

| Decision | Choice |
|---|---|
| Scope | Public-facing v1 routes first, top-down. Non-v1 routes (auth, settings, Stripe, admin, cron) deferred to Step 2.2 |
| Schema location | `@onegoodarea/contracts` — shared with web, browser-safe |
| Thoroughness | **Minimal** for routes without existing Zod schemas (tags + summaries + param descriptions only). **Full Zod request-body schemas** for routes that already have manual validation. |
| Timing | **Before Plan 018** (app.ts split). OpenAPI lands on current monolithic app.ts. |
| Annotation depth | Tags + summaries + full request/response examples |

## Scope snapshot

- **85 routes** in `apps/api/src/app.ts` (Fastify 5.2)
- **13 Zod request schemas** already exist in `@onegoodarea/contracts` (org, bundle, preset, cohort, member, invitation CRUD)
- **0** existing OpenAPI/Swagger plugins or decorators
- **1** monolith file (`app.ts`, ~3,979 lines)

---

## Phase 1: v1 public routes (~38 routes)

### Step 1.1: Install `@fastify/swagger` + `@fastify/swagger-ui`

**Dependencies to add to `apps/api/package.json`:**
- `@fastify/swagger` — generates `/openapi.json` from route `.schema`
- `@fastify/swagger-ui` — serves Swagger UI at `/docs`

**Changes to `apps/api/src/app.ts`:**
```typescript
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

// Before any routes:
export async function buildApp() {
  const app = Fastify({...});

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "OneGoodArea API",
        version: "1.0.0",
        description: "Area intelligence API — scores, signals, reports, and org management.",
      },
      servers: [{ url: process.env.API_PUBLIC_URL || "http://localhost:4000" }],
      tags: [
        { name: "Meta", description: "Health and version endpoints" },
        { name: "Reports", description: "Generate and retrieve area reports" },
        { name: "Signals", description: "Signal-first area profiles" },
        { name: "Scores", description: "Scoring engine" },
        { name: "Portfolios", description: "Portfolio management" },
        { name: "Orgs", description: "Organization and member management" },
        { name: "Invitations", description: "Org invitations" },
        { name: "Bundles", description: "Signal bundles" },
        { name: "Presets", description: "Scoring presets" },
        { name: "Methodology", description: "Engine version pins" },
        { name: "Cohorts", description: "Area cohorts" },
        { name: "Intelligence", description: "Query, peers, insights, forecast" },
        { name: "Webhooks", description: "Outbound webhook subscriptions" },
        { name: "Usage", description: "Plan and quota endpoints" },
        { name: "Keys", description: "API key management" },
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Stripe", description: "Billing and subscriptions" },
        { name: "Settings", description: "Account settings" },
        { name: "Dashboard", description: "Dashboard composite data" },
        { name: "Tracking", description: "Analytics and pageview tracking" },
        { name: "Watchlist", description: "Saved areas watchlist" },
        { name: "Admin", description: "Admin analytics (superuser only)" },
        { name: "Cron", description: "Scheduled jobs" },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });
```

**Commit:** `Add @fastify/swagger + @fastify/swagger-ui — /docs and /openapi.json`

**Validation:** `curl localhost:4000/openapi.json` returns a valid OpenAPI 3.x spec (initially empty routes array). `curl localhost:4000/docs` returns the Swagger UI HTML page.

---

### Step 1.2: Add Zod schemas for v1 routes WITHOUT existing validation + `zodToJsonSchema` utility

Create new Zod request schemas in `packages/contracts/src/` for the v1 routes that have ad-hoc manual validation today but no Zod schema.

| File | Schema | Used by |
|---|---|---|
| `contracts/src/scores.ts` (existing, extend) | `ScoreRequestSchema` | `POST /v1/score` |
| `contracts/src/intelligence.ts` (existing, extend) | `QueryRequestSchema`, `PeersRequestSchema`, `InsightsRequestSchema`, `ForecastRequestSchema` | `POST /v1/query`, `/v1/peers`, `/v1/insights`, `/v1/forecast` |
| `contracts/src/portfolios.ts` (existing, extend) | `CreatePortfolioRequestSchema`, `AddAreaRequestSchema` | `POST /v1/portfolios`, `POST /v1/portfolios/:id/areas` |
| `contracts/src/signals.ts` (existing, extend) | `AreaRequestSchema` (area + postcode union) | `GET /v1/area`, `GET /v1/signals/:category` |

Each schema mirrors the existing manual `typeof`/`if` checks in the route handler — no behavior change, just structural.

**`zodToJsonSchema` utility:** A small utility in `apps/api/src/infrastructure/utils/zod-to-json-schema.ts` (or in `@onegoodarea/contracts`) that converts Zod schemas to JSON Schema for Fastify. Uses `zod-to-json-schema` npm package or manual `z.toJSONSchema()` if Zod 3.22+.

---

### Step 1.3: Wire schemas into app.ts v1 routes

For each v1 route, add Fastify's `.schema` property. Two patterns:

**Pattern A — route has Zod schema (org CRUD, new v1 schemas):**
```typescript
// BEFORE:
app.post("/v1/orgs", async (request, reply) => {
  const parsed = CreateOrgRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) { ... }
  ...
});

// AFTER:
app.post("/v1/orgs", {
  schema: {
    tags: ["Orgs"],
    summary: "Create an organization",
    description: "Creates a new organization. The caller becomes the owner.",
    body: zodToJsonSchema(CreateOrgRequestSchema),
    response: {
      201: zodToJsonSchema(OrgWithRoleSchema),
      400: { type: "object", properties: { error: { type: "string" } } },
      401: { type: "object", properties: { error: { type: "string" } } },
    },
  },
}, async (request, reply) => {
  // validateApiKey or authenticateEither unchanged
  const parsed = CreateOrgRequestSchema.safeParse(request.body ?? {});
  ...
});
```

**Pattern B — route has no Zod schema (v1/area, v1/meta, health):**
```typescript
app.get("/v1/area", {
  schema: {
    tags: ["Signals"],
    summary: "Get area profile with all signal categories",
    description: "Full signal profile for a UK postcode or place name. Returns geo metadata plus all signal categories with sources.",
    querystring: {
      type: "object",
      properties: {
        area: { type: "string", description: "UK postcode or place name" },
        postcode: { type: "string", description: "Alias for area" },
      },
    },
    response: {
      200: { type: "object" },  // dynamic shape, keep loose
      400: { type: "object", properties: { error: { type: "string" } } },
      404: { type: "object", properties: { error: { type: "string" } } },
    },
  },
}, async (request, reply) => { ... });
```

**Routes covered in Step 1.3 (~70 route entries):**

| # Routes | Tag | Schemas |
|---|---|---|
| 2 | Meta | health, v1/meta |
| 3 | Reports | me/reports, me/activity, v1/me |
| 2 | Reports (core) | v1/report POST, report/:id GET+DELETE (web-only) |
| 3 | Signals | v1/area, v1/signals/:category, v1/areas |
| 1 | Scores | v1/score |
| 7 | Portfolios | v1/portfolios/* (6 routes) |
| 23 | Orgs | v1/orgs/* (full CRUD — 13 schemas already exist) |
| 1 | Invitations | v1/invitations/:token/accept |
| 5 | Bundles | v1/orgs/:id/bundles/* |
| 5 | Presets | v1/orgs/:id/presets/* |
| 3 | Methodology | v1/orgs/:id/methodology (GET+PUT+DELETE) |
| 5 | Cohorts | v1/orgs/:id/cohorts/* |
| 4 | Intelligence | v1/query, v1/peers, v1/insights, v1/forecast |
| 1 | Webhooks | v1/batch (batch uses same gate as webhooks) |
| 3 | Webhooks | v1/webhooks (GET+POST+DELETE) |
| 1 | Webhooks | v1/webhooks/:id/rotate-secret |
| 1 | Watchlist | v1/watchlist (not v1-prefixed but functionally public) |

All 15 tag groups are wired in **one commit**.

---

### Step 1.4: Add request/response examples

For the 10 most-used v1 routes, add `examples` to the schema:

| Route | Example |
|---|---|
| `POST /v1/report` | `{ "area": "SW1A 1AA", "intent": "moving" }` |
| `POST /v1/score` | `{ "area": "M1 1AE", "intent": "business" }` |
| `GET /v1/area?area=SW1A+1AA` | Query example |
| `POST /v1/query` | `{ "query": "best areas for families in London" }` |
| `POST /v1/orgs` | `{ "name": "Acme Corp", "slug": "acme-corp" }` |
| `POST /v1/webhooks` | `{ "url": "https://example.com/hooks", "events": ["report.created"] }` |
| `GET /v1/portfolios` | N/A (GET) |
| `POST /v1/portfolios` | `{ "name": "London investments" }` |
| `POST /v1/peers` | `{ "area": "SW1A 1AA", "radius_km": 5 }` |
| `POST /v1/batch` | `{ "items": [{ "area": "SW1A 1AA", "intent": "moving" }] }` |

**Commit:** `Add request/response examples for top 10 v1 routes`

---

## Phase 2: Remaining routes + auth security (single commit)

### Step 2: Non-v1 routes + auth security schemes

| Routes | Tag |
|---|---|
| auth/register, auth/resend-verification, auth/forgot-password, auth/reset-password | Auth |
| stripe/webhook, stripe/portal, stripe/cancel, stripe/checkout, stripe/addon-checkout | Stripe |
| settings/subscription, settings/password, settings/delete-account | Settings |
| usage, dashboard, keys/usage, keys, keys/:id | Usage / Keys |
| track, widget | Tracking |
| admin/analytics, admin/traffic-analytics | Admin |
| cron/rescore | Cron |
| report (web), watchlist | Reports / Watchlist |

**Auth security schemes** — document the two auth patterns in `components.securitySchemes`:

```yaml
components:
  securitySchemes:
    bearerAuth:        # API keys
      type: http
      scheme: bearer
      description: "API key from /keys. Header: Authorization: Bearer oga_live_..."
    bridgeToken:       # NextAuth bridge (internal)
      type: http
      scheme: bearer
      description: "Bridge token minted by the web BFF. Internal use only."
```

Tag each route with the appropriate security scheme. Routes using `authenticateEither` (org CRUD) get both.

---

## Step 3: Verify

| Check | How |
|---|---|
| `/openapi.json` is valid OpenAPI 3.x | `curl -s localhost:4000/openapi.json \| python3 -c "import json,sys; json.load(sys.stdin); print('Valid')"` |
| Swagger UI renders | Open `localhost:4000/docs` in browser |
| All 85 routes appear | `curl -s localhost:4000/openapi.json \| python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['paths']))"` |
| Tags are grouped correctly | Visual check in Swagger UI |
| Body examples are displayed | Click "Try it out" on a POST route — example populates |

---

## Commit summary

| # | Layer | Description | Original count |
|---|---|---|---|
| **1** | Install + register | `@fastify/swagger` + `@fastify/swagger-ui`, register in `buildApp()` | 1 |
| **2** | Contracts + utility | New Zod schemas (scores, intelligence, portfolios, signals) + `zodToJsonSchema` helper | 6 |
| **3** | v1 route schemas | Wire all ~70 v1 route entries (15 tag groups) in app.ts | 15 |
| **4** | Examples | Request/response examples for top 10 v1 routes | 1 |
| **5** | Phase 2 + security | Non-v1 routes (~25) + auth security schemes | 2 |
| | **Total** | | **25 → 5** |

---

## Non-goals (explicitly excluded)

- Zod validation *enforcement* on routes that don't already validate (Plan 019 is metadata-only for those)
- Splitting `app.ts` (Plan 018 owns that)
- Auto-generating client SDKs from the spec (separate future plan)
- Adding schemas to the Stripe webhook route (raw body forwarding, no schema possible)

---

## Risk

- **Risk:** `@fastify/swagger` 8.x dropped OpenAPI 2.0 support for Fastify 5. Need to verify version compatibility.
  - **Mitigation:** Pin compatible versions after testing in local dev.
- **Risk:** `zod-to-json-schema` package may not handle discriminated unions well.
  - **Mitigation:** Test with `CreateOrgRequestSchema` (simplest) first; escalate to manual JSON Schema if needed.
- **Risk:** 85 routes × schema additions = large diff, potential merge conflicts with other in-flight branches.
  - **Mitigation:** Commit from a clean fork of main. Merge sequentially after Plan 019 completes.
