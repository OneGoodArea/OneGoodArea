# Plan 013: Complete Environment Variable Centralisation (AR-205b)

## Context

Plan 012 (AR-205) partially completed the env centralisation refactor:
- ✅ Fixed critical STRIPE_STARTER_PRICE_ID! and STRIPE_PRO_PRICE_ID! non-null assertions
- ✅ Centralised config interface with all 37 env vars in `infrastructure/config/index.ts`
- ✅ Updated key entry-point modules (server.ts, app.ts, db/client.ts)
- ✅ Updated env/local/api.env.example with complete inventory
- ⏳ **Remaining**: 12 modules still read `process.env` directly (business logic, providers, email)

**Current state**: `feat/AR-205-api-env-audit` branch has 4 commits, typecheck passes clean.

---

## 1. Remaining Modules (12 files)

### Infrastructure & Email (3 files)
| File | Env Vars | Impact |
|---|---|---|
| `infrastructure/email/providers/resend-provider.ts` | `RESEND_API_KEY` | Email delivery |
| `infrastructure/email/senders.ts` | `NODE_ENV` | Email configuration |
| `modules/auth/session-token.ts` | `AUTH_SECRET` | Auth flow |

### Billing (3 files)
| File | Env Vars | Impact |
|---|---|---|
| `modules/billing/stripe-client.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe SDK init |
| `modules/billing/webhook-handler.ts` | `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `modules/billing/plans.ts` | Already updated in AR-205 Commit 1 | — |

### AI & Reporting (2 files)
| File | Env Vars | Impact |
|---|---|---|
| `modules/reports/ai/anthropic-provider.ts` | `ANTHROPIC_API_KEY`, `OGA_MOCK_AI_*` | AI generation |
| `modules/reports/ai/mock-provider.ts` | `OGA_MOCK_AI_*` (4 test knobs) | Mock AI testing |

### Utilities & Scripts (2 files)
| File | Env Vars | Impact |
|---|---|---|
| `modules/tracking/structured-logger.ts` | `OGA_LOG_LEVEL`, `OGA_LOCAL_RUNTIME_ENABLED` | Logging config |
| `modules/usage/index.ts` | `OGA_AI_PROVIDER` | Provider routing |
| `modules/intelligence/eval/run.ts` | `OGA_EVAL_PLAN` | Eval script gate |
| `scripts/bootstrap-test-key.ts` | `DATABASE_URL` | Setup script |

---

## 2. Implementation Plan (1 commit)

### Commit: Update remaining 12 modules to use getConfig()

For each module:
1. Add `import { getConfig } from '../../infrastructure/config'` (adjust path depth)
2. Replace `process.env.VAR_NAME` with `config.fieldName` calls
3. Ensure path is to centralized `infrastructure/config/index.ts`

**Module-by-module checklist:**

- [ ] `infrastructure/email/providers/resend-provider.ts` → `config.resendApiKey`
- [ ] `infrastructure/email/senders.ts` → `config.nodeEnv`
- [ ] `modules/auth/session-token.ts` → `config.authSecret`
- [ ] `modules/billing/stripe-client.ts` → `config.stripe*`
- [ ] `modules/billing/webhook-handler.ts` → `config.stripeWebhookSecret`
- [ ] `modules/reports/ai/anthropic-provider.ts` → `config.anthropicApiKey`, `config.mockAi.*`
- [ ] `modules/reports/ai/mock-provider.ts` → `config.mockAi.*`
- [ ] `modules/tracking/structured-logger.ts` → `config.logLevel`, `config.localRuntimeEnabled`
- [ ] `modules/usage/index.ts` → `config.aiProvider`
- [ ] `modules/intelligence/eval/run.ts` → `config.evalPlanEnabled`
- [ ] `scripts/bootstrap-test-key.ts` → `config.databaseUrl`

---

## 3. Branch & Commit Sequence

```
feat/AR-205-api-env-audit
├── ca67a84 fix(billing): remove non-null assertions on V1 legacy plan priceIds
├── 7cab390 refactor(config): centralise all API environment variable reads
├── c2e2d66 docs(env): update env/local/api.env.example with complete 37-var inventory
├── bfa60ce refactor(config): update consuming modules to use getConfig()
└── [NEW] refactor(config): update remaining 12 modules to use getConfig()
```

---

## 4. Remaining Work After This Plan

- **Commit 4**: Update `env/dev/api.env.example` with Stripe TEST IDs and dev-specific config
- **Commit 5**: Update `env/prod/api.env.example` with production config template
- **Commit 6** (optional): Add startup validation guard in `server.ts` to fail fast on missing critical vars

---

## 5. Success Criteria

- [ ] All 12 remaining modules updated to use `getConfig()`
- [ ] Zero `process.env.*` reads outside `infrastructure/config/index.ts` (verify: `grep -r "process\.env\." apps/api/src --include="*.ts" | grep -v "config/index" | wc -l` = 0)
- [ ] `npm run typecheck -w @onegoodarea/api` passes clean
- [ ] `npm run build -w @onegoodarea/api` succeeds
- [ ] `npm test -w @onegoodarea/api` passes (no regressions)

---

## 6. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Import path errors (too many ../) | Compile failure | Copy correct paths from working modules (server.ts, app.ts) |
| Missed process.env reads | Incomplete centralisation | Run grep validation after commit |
| Breaking changes to module behavior | Runtime errors | Each module's logic unchanged, only env read source moves |

---

**Status**: Ready to implement  
**JIRA**: AR-205b (created separately)  
**Depends on**: AR-205 (current branch)  
**Est. time**: 15-20 mins
