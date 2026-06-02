# Plan 012: API Environment Variable Audit & Centralisation (AR-205)

## 1. JIRA Integration

- **Jira Issue:** AR-205
- **Plan File:** `plan/012_api_env_audit_ar205.md`
- **Branch:** `feat/AR-205-api-env-audit`

---

## 2. Objective

Perform a full audit of every environment variable that `apps/api` reads from
`process.env`. Fix all gaps and risks found, and centralise all env reads through
`apps/api/src/infrastructure/config/index.ts` so no module reaches into
`process.env` directly.

---

## 3. Audit Findings

A grep across `apps/api/src/**/*.ts` for `process.env.` revealed **~35 distinct
environment variable reads** across 10 source files. The current env examples
(`env/local/api.env.example`, `env/dev/api.env.example`, `env/prod/api.env.example`)
document only **15** of them.

### 3.1 CRITICAL — bugs in production

| Variable | File | Issue |
|---|---|---|
| `STRIPE_STARTER_PRICE_ID` | `modules/billing/plans.ts:26` | Non-null asserted (`!`), **no fallback**. If unset, Stripe receives `undefined` — billing silently broken for V1 legacy `starter` plan. |
| `STRIPE_PRO_PRICE_ID` | `modules/billing/plans.ts:36` | Same — V1 legacy `pro` plan. |

> **Neither var appears in any env example file.** Any deployment that hasn't set
> them explicitly will silently pass `undefined` to Stripe at runtime.

### 3.2 HIGH — completely missing from env examples

All 13 Stripe price IDs below exist in `plans.ts` with hardcoded **live-prod** fallbacks
but are undocumented, so operators don't know to override them for TEST/DEV:

| Variable | Plan | Has fallback? |
|---|---|---|
| `STRIPE_STARTER_PRICE_ID` | starter (v1) | ❌ |
| `STRIPE_PRO_PRICE_ID` | pro (v1) | ❌ |
| `STRIPE_DEVELOPER_PRICE_ID` | developer (v1) | ✅ live fallback |
| `STRIPE_BUSINESS_PRICE_ID` | business (v1) | ✅ live fallback |
| `STRIPE_GROWTH_PRICE_ID` | growth (v1) | ✅ live fallback |
| `STRIPE_STARTER_V2_PRICE_ID` | starter_v2 | ✅ live fallback |
| `STRIPE_BUILD_PRICE_ID` | build | ✅ live fallback |
| `STRIPE_BUILD_ANNUAL_PRICE_ID` | build annual | ✅ live fallback |
| `STRIPE_SCALE_PRICE_ID` | scale | ✅ live fallback |
| `STRIPE_SCALE_ANNUAL_PRICE_ID` | scale annual | ✅ live fallback |
| `STRIPE_GROWTH_V2_PRICE_ID` | growth_v2 | ✅ live fallback |
| `STRIPE_GROWTH_V2_ANNUAL_PRICE_ID` | growth_v2 annual | ✅ live fallback |
| `STRIPE_ENTERPRISE_PRICE_ID` | enterprise | ✅ live fallback |
| `STRIPE_MCP_ADDON_PRICE_ID` | MCP add-on | ✅ live fallback |

### 3.3 MEDIUM — valid vars, undocumented

| Variable | File | Default | Notes |
|---|---|---|---|
| `HOST` | `server.ts:7` | `"0.0.0.0"` | Server bind host; absent from all env examples |
| `OGA_LOG_LEVEL` | `modules/tracking/structured-logger.ts:21` | derived from `OGA_LOCAL_RUNTIME_ENABLED` | Only appears in root `.env.local`; not in `env/*/api.env.example` |
| `OGA_LOCAL_RUNTIME_ENABLED` | `modules/tracking/structured-logger.ts:26` | `false` | Same; drives debug logging mode |
| `OGA_MOCK_AI_FORCE_FAILURE` | `modules/reports/ai/mock-provider.ts:79` | `false` | Undocumented test knob |
| `OGA_MOCK_AI_LATENCY_MS` | `modules/reports/ai/mock-provider.ts:80` | `0` | Undocumented test knob |
| `OGA_MOCK_AI_TOKEN_LIMIT` | `modules/reports/ai/mock-provider.ts:81` | `4096` | Undocumented test knob |
| `OGA_MOCK_AI_RATE_LIMIT_EVERY_N` | `modules/reports/ai/mock-provider.ts:82` | `0` | Undocumented test knob |
| `OGA_EVAL_PLAN` | `modules/intelligence/eval/run.ts:62` | `false` | Script-only gate; undocumented |

### 3.4 LOW — architectural: config boundary not enforced

`infrastructure/config/index.ts` has a clear comment:
> *"Add fields here as modules need them."*

But only 4 vars are routed through it (`OGA_AI_PROVIDER`, `OGA_EMAIL_PROVIDER`,
`OGA_SIGNALS_API`, `OGA_SIGNALS_STORE_READ`). The remaining ~30 vars are read
directly from `process.env.*` scattered across 8 modules, bypassing the typed
boundary entirely.

---

## 4. Complete Env Variable Registry (post-plan target)

| Variable | Type | Required? | Default | Env (local/dev/prod) |
|---|---|---|---|---|
| `NODE_ENV` | Runtime | Yes | — | all |
| `PORT` | Runtime | No | `8080` | all |
| `HOST` | Runtime | No | `0.0.0.0` | all |
| `DATABASE_URL` | Secret | Yes | — | all |
| `AUTH_SECRET` | Secret | Yes | — | all |
| `NEXTAUTH_URL` | Config | No | `https://www.onegoodarea.com` | all |
| `CRON_SECRET` | Secret | Yes (prod) | — | all |
| `OGA_AI_PROVIDER` | Config | No | `anthropic` | all |
| `OGA_EMAIL_PROVIDER` | Config | No | `resend` | all |
| `OGA_SIGNALS_API` | Feature flag | No | `false` | all |
| `OGA_SIGNALS_STORE_READ` | Feature flag | No | `false` | all |
| `OGA_LOG_LEVEL` | Config | No | `info` (or `debug` if local) | local only |
| `OGA_LOCAL_RUNTIME_ENABLED` | Config | No | `false` | local only |
| `ANTHROPIC_API_KEY` | Secret | When `OGA_AI_PROVIDER=anthropic` | — | dev/prod |
| `STRIPE_SECRET_KEY` | Secret | Yes | — | all |
| `STRIPE_WEBHOOK_SECRET` | Secret | Yes | — | all |
| `RESEND_API_KEY` | Secret | When `OGA_EMAIL_PROVIDER=resend` | — | dev/prod |
| `STRIPE_STARTER_PRICE_ID` | Config | Yes (V1 billing) | — | all |
| `STRIPE_PRO_PRICE_ID` | Config | Yes (V1 billing) | — | all |
| `STRIPE_DEVELOPER_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_BUSINESS_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_GROWTH_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_STARTER_V2_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_BUILD_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_BUILD_ANNUAL_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_SCALE_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_SCALE_ANNUAL_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_GROWTH_V2_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_GROWTH_V2_ANNUAL_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_ENTERPRISE_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `STRIPE_MCP_ADDON_PRICE_ID` | Config | No | hardcoded live fallback | all |
| `OGA_MOCK_AI_FORCE_FAILURE` | Test knob | No | `false` | local only |
| `OGA_MOCK_AI_LATENCY_MS` | Test knob | No | `0` | local only |
| `OGA_MOCK_AI_TOKEN_LIMIT` | Test knob | No | `4096` | local only |
| `OGA_MOCK_AI_RATE_LIMIT_EVERY_N` | Test knob | No | `0` | local only |
| `OGA_EVAL_PLAN` | Script gate | No | `false` | local only |

---

## 5. Implementation Plan

### 5.1 Commit 1 — Fix CRITICAL: `STRIPE_STARTER_PRICE_ID!` and `STRIPE_PRO_PRICE_ID!`

**File:** `apps/api/src/modules/billing/plans.ts`

Remove the TypeScript non-null assertion (`!`) and add safe fallbacks with an
empty string, consistent with the other V1 legacy price IDs that aren't required
for billing resolution but still need to be non-crashing:

```typescript
// BEFORE (BROKEN — undefined silently passed to Stripe):
priceId: process.env.STRIPE_STARTER_PRICE_ID!,

// AFTER (safe empty-string fallback, documented in env examples):
priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
```

> **Note:** Empty string will still produce a Stripe error if these plans are
> actively billed, but it will throw a clear Stripe API error rather than silently
> passing `undefined`. The permanent fix is to set the real price IDs in the env.
> These are V1 grandfathered plans — confirm with the team whether they still
> need billing support or are read-only display.

**Risk:** Low — no behaviour change for correctly-configured environments.

---

### 5.2 Commit 2 — Centralise env reads in `config/index.ts`

**File:** `apps/api/src/infrastructure/config/index.ts`

Extend `ApiConfig` and `getConfig()` to include ALL env vars currently scattered
in modules. Each module then imports from the config boundary instead of
reading `process.env` directly.

```typescript
export interface ApiConfig {
  // Runtime
  port: number;
  host: string;

  // AI
  aiProvider: string;
  anthropicApiKey: string | undefined;

  // Email
  emailProvider: string;
  resendApiKey: string | undefined;

  // Auth
  authSecret: string | undefined;

  // Database
  databaseUrl: string | undefined;

  // Feature flags
  signalsApiEnabled: boolean;
  signalsStoreRead: boolean;

  // Logging
  logLevel: string | undefined;
  localRuntimeEnabled: boolean;

  // Stripe
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripePriceIds: {
    // V1 legacy
    starter: string;
    pro: string;
    developer: string;
    business: string;
    growth: string;
    // V2 active
    starterV2: string;
    build: string;
    buildAnnual: string;
    scale: string;
    scaleAnnual: string;
    growthV2: string;
    growthV2Annual: string;
    enterprise: string;
    mcpAddon: string;
  };

  // Mock AI knobs (local/test only)
  mockAi: {
    forceFailure: boolean;
    latencyMs: number;
    tokenLimit: number;
    rateLimitEveryN: number;
  };

  // Cron
  cronSecret: string | undefined;

  // Eval (script gate)
  evalPlanEnabled: boolean;
}
```

Modules are updated to import `getConfig()` instead of reading `process.env.*`.

> **Scope note:** This commit is large but safe — it is a mechanical refactor.
> No logic changes; only the env read location moves. All existing defaults are
> preserved exactly.

---

### 5.3 Commit 3 — Update `env/local/api.env.example`

Add all previously missing vars. Group clearly:

```bash
# env/local/api.env.example

# --- runtime --------------------------------------------------------
NODE_ENV=development
PORT=8080
HOST=0.0.0.0

# --- database -------------------------------------------------------
DATABASE_URL=postgres://oga:change-me@host.containers.internal:5432/oga

# --- auth bridge (apps/web <-> apps/api JWT) ------------------------
AUTH_SECRET=replace-me
NEXTAUTH_URL=http://localhost:3000

# --- providers ------------------------------------------------------
OGA_AI_PROVIDER=mock
OGA_EMAIL_PROVIDER=mailhog

ANTHROPIC_API_KEY=              # Required only when OGA_AI_PROVIDER=anthropic
STRIPE_SECRET_KEY=              # Required for any Stripe operation
STRIPE_WEBHOOK_SECRET=          # Required for POST /webhooks/stripe
RESEND_API_KEY=                 # Required only when OGA_EMAIL_PROVIDER=resend

# --- Stripe price IDs (V1 legacy — grandfathered) -------------------
# Required if V1 plans (starter / pro) still have active Stripe subscriptions.
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
# V1 — safe to omit locally (hardcoded live fallbacks in plans.ts)
STRIPE_DEVELOPER_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=

# --- Stripe price IDs (V2 active) -----------------------------------
# Safe to omit locally; hardcoded live fallbacks in plans.ts are LIVE Stripe IDs.
# Override with TEST mode price IDs when running billing flows locally.
STRIPE_STARTER_V2_PRICE_ID=
STRIPE_BUILD_PRICE_ID=
STRIPE_BUILD_ANNUAL_PRICE_ID=
STRIPE_SCALE_PRICE_ID=
STRIPE_SCALE_ANNUAL_PRICE_ID=
STRIPE_GROWTH_V2_PRICE_ID=
STRIPE_GROWTH_V2_ANNUAL_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
STRIPE_MCP_ADDON_PRICE_ID=

# --- feature flags --------------------------------------------------
OGA_SIGNALS_API=true
OGA_SIGNALS_STORE_READ=true

# --- cron protection ------------------------------------------------
CRON_SECRET=replace-me

# --- logging --------------------------------------------------------
OGA_LOG_LEVEL=debug
OGA_LOCAL_RUNTIME_ENABLED=true

# --- mock AI knobs (only active when OGA_AI_PROVIDER=mock) ----------
OGA_MOCK_AI_FORCE_FAILURE=false
OGA_MOCK_AI_LATENCY_MS=0
OGA_MOCK_AI_TOKEN_LIMIT=4096
OGA_MOCK_AI_RATE_LIMIT_EVERY_N=0

# --- eval script gate -----------------------------------------------
OGA_EVAL_PLAN=false
```

---

### 5.4 Commit 4 — Update `env/dev/api.env.example` and `env/prod/api.env.example`

Same additions as Commit 3 but scoped appropriately:
- `dev`: include Stripe TEST price IDs, `OGA_LOG_LEVEL=info`, no mock AI knobs
- `prod`: include Stripe LIVE price IDs (blanked, commented "SET IN HOST PLATFORM"),
  no mock AI knobs, no `OGA_LOCAL_RUNTIME_ENABLED`

---

### 5.5 Commit 5 — Startup validation guard (optional but recommended)

Add a startup assertion in `server.ts` (or `app.ts`) that checks critical vars
and fails fast with a clear error at boot time rather than at first use:

```typescript
function assertRequiredEnv(): void {
  const required = ["DATABASE_URL", "AUTH_SECRET", "STRIPE_SECRET_KEY"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
```

This is a deliberate fail-fast: better to crash at startup with a clear message
than to crash mid-request after serving some traffic.

---

## 6. Branch & Commit Sequence

```
feat/AR-205-api-env-audit
├── Commit 1: Fix STRIPE_STARTER_PRICE_ID! and STRIPE_PRO_PRICE_ID! non-null assertions
├── Commit 2: Centralise all env reads in infrastructure/config/index.ts
├── Commit 3: Update env/local/api.env.example — complete var inventory
├── Commit 4: Update env/dev and env/prod api.env.example
└── Commit 5: Add startup env validation guard in server.ts
```

---

## 7. Verification Checklist

- [ ] `STRIPE_STARTER_PRICE_ID!` and `STRIPE_PRO_PRICE_ID!` no longer use `!`
- [ ] Zero direct `process.env.*` reads outside `infrastructure/config/index.ts`
  (verify: `grep -r "process\.env\." apps/api/src --include="*.ts" | grep -v "config/index"` returns empty)
- [ ] `env/local/api.env.example` documents all 37 vars
- [ ] `env/dev/api.env.example` and `env/prod/api.env.example` updated accordingly
- [ ] `npm run build -w @onegoodarea/api` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes (no regressions)
- [ ] Server fails fast with clear error if `DATABASE_URL` is unset

---

## 8. Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Commit 2 (config centralisation) breaks a module | HIGH | Full build + typecheck + test after each step |
| Stripe `!` fix masks a runtime failure | MEDIUM | Add the empty-string fallback AND document in env that STARTER/PRO must be set |
| Startup guard crashes existing valid deployments | LOW | Only guard vars that are already required by the code today |
| `OGA_EVAL_PLAN` inadvertently enabled in prod | LOW | Default is `false`; document as "scripts only" |

---

## 9. Success Criteria

- [ ] All ~35 API env vars documented in `env/{local,dev,prod}/api.env.example`
- [ ] Zero `process.env.*` reads outside `config/index.ts`
- [ ] No non-null assertions (`!`) on env var reads
- [ ] Server crashes fast with clear message when required vars are missing
- [ ] Build, typecheck, and tests green

---

## 10. CLAUDE.md Compliance

✓ **Rule 7:** Never modify main directly → branch `feat/AR-205-api-env-audit`  
✓ **Rule 8:** Small commits → 5 focused commits  
✓ **Rule 9:** Intent-based messages  
✓ **Rule 13:** Simple solutions → no new abstractions, use existing config pattern  
✓ **Rule 14:** Reuse patterns → extend existing `config/index.ts`  
✓ **Rule 15:** No premature abstraction — typed config shape, not a framework  

---

**Status:** Planning complete, ready to implement  
**JIRA:** [AR-205](https://podnex.atlassian.net/browse/AR-205)  
**Next Action:** Create branch `feat/AR-205-api-env-audit` and implement Commit 1 first (critical fix)
