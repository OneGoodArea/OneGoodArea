# Plan 022: Complete Environment Variable Centralisation (AR-205b)

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

## 2. Implementation Plan (12 commits, one per module)

Each module gets its own commit for maximum reviewability and granularity.

For each module:
1. Add `import { getConfig } from '../../infrastructure/config'` (adjust path depth)
2. Replace `process.env.VAR_NAME` with `config.fieldName` calls
3. Ensure path is to centralized `infrastructure/config/index.ts`
4. Typecheck passes before moving to next module

### Commit sequence:

**Infrastructure & Email (3 commits)**
- [ ] Commit 1: `refactor(email): use getConfig() for RESEND_API_KEY in resend-provider.ts`
- [ ] Commit 2: `refactor(email): use getConfig() for NODE_ENV in senders.ts`
- [ ] Commit 3: `refactor(auth): use getConfig() for AUTH_SECRET in session-token.ts`

**Billing (2 commits)**
- [ ] Commit 4: `refactor(billing): use getConfig() for Stripe keys in stripe-client.ts`
- [ ] Commit 5: `refactor(billing): use getConfig() for webhook secret in webhook-handler.ts`

**AI & Reporting (2 commits)**
- [ ] Commit 6: `refactor(ai): use getConfig() for Anthropic key and mock knobs in anthropic-provider.ts`
- [ ] Commit 7: `refactor(ai): use getConfig() for mock knobs in mock-provider.ts`

**Utilities & Scripts (3 commits)**
- [ ] Commit 8: `refactor(logging): use getConfig() for log level in structured-logger.ts`
- [ ] Commit 9: `refactor(usage): use getConfig() for AI provider in usage/index.ts`
- [ ] Commit 10: `refactor(eval): use getConfig() for eval plan gate in intelligence/eval/run.ts`
- [ ] Commit 11: `refactor(scripts): use getConfig() for database URL in bootstrap-test-key.ts`

---

## 3. Branch & Commit Sequence

```
fix/AR-317-complete-env-centralisation (from main, which includes AR-205 merged)
├── Commit 1: refactor(email): use getConfig() for RESEND_API_KEY in resend-provider.ts
├── Commit 2: refactor(email): use getConfig() for NODE_ENV in senders.ts
├── Commit 3: refactor(auth): use getConfig() for AUTH_SECRET in session-token.ts
├── Commit 4: refactor(billing): use getConfig() for Stripe keys in stripe-client.ts
├── Commit 5: refactor(billing): use getConfig() for webhook secret in webhook-handler.ts
├── Commit 6: refactor(ai): use getConfig() for Anthropic key and mock knobs in anthropic-provider.ts
├── Commit 7: refactor(ai): use getConfig() for mock knobs in mock-provider.ts
├── Commit 8: refactor(logging): use getConfig() for log level in structured-logger.ts
├── Commit 9: refactor(usage): use getConfig() for AI provider in usage/index.ts
├── Commit 10: refactor(eval): use getConfig() for eval plan gate in intelligence/eval/run.ts
└── Commit 11: refactor(scripts): use getConfig() for database URL in bootstrap-test-key.ts
```

**Why 11 commits instead of 12:**
- `modules/billing/plans.ts` was already updated in AR-205 (Commit 1), so only 11 remaining modules need updates

---

## 4. Future Work (after AR-317)

These can be addressed in separate plans if needed:
- Update `env/dev/api.env.example` with Stripe TEST IDs and dev-specific config
- Update `env/prod/api.env.example` with production config template
- (Optional) Add startup validation guard in `server.ts` to fail fast on missing critical vars

---

## 5. Success Criteria (per commit and final)

**Per-commit validation:**
- [ ] Each commit: `npm run typecheck -w @onegoodarea/api` passes clean
- [ ] Each commit: `npm run build -w @onegoodarea/api` succeeds
- [ ] Each commit: git status shows only the single modified file + package-lock.json (if touched)

**Final validation (after all 11 commits):**
- [ ] All 11 remaining modules updated to use `getConfig()`
- [ ] Zero `process.env.*` reads outside `infrastructure/config/index.ts` 
  - Verify: `grep -r "process\.env\." apps/api/src --include="*.ts" | grep -v "config/index" | wc -l` = 0
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

**Status**: Ready to implement (plan finalized)  
**JIRA**: [AR-317](https://podnex.atlassian.net/browse/AR-317) (To Do)  
**Branch**: `fix/AR-317-complete-env-centralisation` (created from main)  
**Depends on**: AR-205 (already merged to main)  
**Scope**: 11 commits, one per remaining module  
**Est. time**: 25-35 mins (3 mins per commit + typecheck/build validation)
