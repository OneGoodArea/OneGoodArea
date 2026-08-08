# Plan 014: Web Environment Variable Audit (AR-206)

## 1. JIRA Integration

- **Jira Issue:** AR-206
- **Plan File:** `plan/014_web_env_audit_ar206.md`
- **Branch:** `AR-206-review-web-env-vars`

---

## 2. Objective

Audit and fix the environment variable definitions for `apps/web` across all environments (local, dev, prod) so that:
- Example files are complete — no vars used in code are missing
- No zombie vars in examples that nothing reads
- Naming is consistent and clear

---

## 3. Audit Findings

### 3.1 Missing vars from all `web.env.example` files

| Variable | Used in | Status |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `src/lib/auth.ts` | ❌ Missing |
| `GOOGLE_CLIENT_SECRET` | `src/lib/auth.ts` | ❌ Missing |
| `GITHUB_CLIENT_ID` | `src/lib/auth.ts` | ❌ Missing |
| `GITHUB_CLIENT_SECRET` | `src/lib/auth.ts` | ❌ Missing |
| `CRON_SECRET` | `src/app/api/cron/rescore/route.ts` | ❌ Missing |
| `STRIPE_STARTER_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (no fallback) |
| `STRIPE_PRO_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (no fallback) |
| `STRIPE_DEVELOPER_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_BUSINESS_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_GROWTH_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_STARTER_V2_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_BUILD_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_BUILD_ANNUAL_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_SCALE_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_SCALE_ANNUAL_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_GROWTH_V2_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_GROWTH_V2_ANNUAL_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_ENTERPRISE_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `STRIPE_MCP_ADDON_PRICE_ID` | `src/lib/stripe.ts` | ❌ Missing (has fallback) |
| `OGA_SERVICE_MODE` | `src/lib/runtime/env/index.ts` | ❌ Missing from web examples |
| `OGA_LOG_LEVEL` | `src/lib/runtime/env/index.ts` | ❌ Missing from web examples |
| `OGA_AI_PROVIDER` | `src/lib/runtime/env/index.ts` | ❌ Missing from web examples |
| `OGA_EMAIL_PROVIDER` | `src/lib/runtime/env/index.ts` | ❌ Missing from web examples |
| `OGA_LOCAL_RUNTIME_ENABLED` | `src/lib/runtime/env/index.ts` | ❌ Missing from local web example only |
| `POSTCODES_API_BASE_URL` | `src/lib/runtime/env/index.ts` | ❌ Missing from all web examples (has fallback `https://api.postcodes.io`) |

### 3.2 Dead vars to remove from all env examples

| Variable | Reason |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | Never referenced in any source file |
| `NEXT_PUBLIC_APP_URL` | Never referenced in any source file (code uses `NEXTAUTH_URL`) |

### 3.3 Vars to investigate before implementation

`env/dev/web.env.example` and `env/prod/web.env.example` carry `ANTHROPIC_API_KEY` and `RESEND_API_KEY`. The web app has moved to a BFF pattern (web calls the API service, which owns AI and email). Verify whether these vars are still read anywhere in `apps/web/src` before the implementation commits — if not, they should be removed as zombie vars.

---

## 4. Decisions

| Topic | Decision |
|---|---|
| Startup validation | **Out of scope** for this ticket |
| `NEXT_PUBLIC_APP_URL` | **Remove** from all env examples |
| `STRIPE_PUBLISHABLE_KEY` | **Remove** from all env examples |
| All Stripe price IDs | **Add** all ~15 to all env examples with test/prod labels |
| OGA runtime vars (incl. `POSTCODES_API_BASE_URL`) | **Add** to all web env examples |
| `NEXTAUTH_SECRET` fallback in test auth route | **Leave as-is** |
| `CRON_SECRET` | **Add** to all environments |
| OAuth providers | **Both** Google + GitHub in all envs |

---

## 5. Files to Change

- `env/local/web.env.example`
- `env/dev/web.env.example`
- `env/prod/web.env.example`

---

## 6. Commit Strategy

One commit per file:
1. `Update env/local/web.env.example — add missing vars, remove dead vars (AR-206)`
2. `Update env/dev/web.env.example — add missing vars, remove dead vars (AR-206)`
3. `Update env/prod/web.env.example — add missing vars, remove dead vars (AR-206)`
