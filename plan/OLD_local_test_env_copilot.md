# Local Test Environment Plan (OneGoodArea)

## 1) Scope, Goal, and Hard Constraints
- Build a **local test environment** runnable with one simple command.
- Primary DB mode: **Neon test database**; fallback DB mode: **local Postgres container**.
- Support local containers on:
  - **Windows**: Docker / Docker Compose
  - **Linux**: Podman / podman-compose (or `podman compose`)
- **Strict rule confirmed**: do **not edit existing JS/TS code files**. Add-only approach (new files, scripts, config, docs).

## 2) Upfront Conflict Warnings (Important)
Given the strict “no existing code edits” rule, these items may be partially constrained:

1. **AI provider runtime swapping (Claude vs mocked AI)**
   - Current AI client is hardwired in existing code (`src/lib/anthropic.ts`) without a pluggable provider abstraction.
   - Without code edits, full runtime provider switching is limited to environment-level tricks and test-time mocking.

2. **Email capture fallback (MailHog)**
   - Existing mail flow uses Resend SDK directly.
   - Without code edits, switching SMTP transport to MailHog is not native; we can provide a local “mail sandbox mode” path via environment strategy and test harness, but true runtime transport substitution may need future code refactor.

3. **External API mocking in full app runtime**
   - Unit/integration tests already use MSW, but production-like app runtime mocking of external endpoints without code changes is limited.
   - We can still provide containerized mock services and test-focused execution paths.

## 3) Proposed Approach
- Use an **additive infra module** under a new folder (e.g., `local-env/`) containing:
  - Compose files
  - Env templates
  - Startup wrapper script
  - Health checks
  - Mock service containers
  - Optional seed scripts/wrappers
- Keep current app behavior unchanged by default.
- Add profiles/modes so switching is environment-driven, not code rewrite.

## 4) Step-by-Step Implementation Plan (Branch-Oriented)

### Step A — Foundation and Command UX
**Branch:** `feat/local-env-foundation`  
**Commits:** one per functionality

Deliverables:
- `local-env/compose.base.yml` with service skeletons and named networks.
- Cross-platform launcher script (`scripts/local-env-up.sh`) that:
  - detects Docker vs Podman
  - selects compose command
  - passes profile and env files
- Single-entry command documented as:
  - `./scripts/local-env-up.sh` (preferred)
  - internally runs compose up equivalent.

### Step B — Database Modes (Neon default, Postgres fallback)
**Branch:** `feat/local-env-db-modes`

Deliverables:
- `local-env/.env.localtest.example` with placeholders only (no real credentials).
- DB mode flags:
  - `DB_MODE=neon` (default)
  - `DB_MODE=postgres_local`
- Neon mode uses external Neon test credentials from env.
- Local Postgres mode includes:
  - `postgres` container
  - persistent volume
  - connection string exported to app container env.
- Compatibility notes to mirror Neon behavior where possible (extensions/settings checklist).

### Step C — Env and Secrets Management Module
**Branch:** `feat/local-env-env-management`

Deliverables:
- `local-env/env/` templates:
  - `.env.shared.example`
  - `.env.neon.example`
  - `.env.postgres-local.example`
  - `.env.providers.example`
- `scripts/local-env-validate-env.sh` to fail fast on missing required variables.
- Secrets policy:
  - no plaintext real secrets in repo
  - `.example` files only
  - local ignored override file for developers.

### Step D — Observability and Debug Tooling in Containers
**Branch:** `feat/local-env-debug-observability`

Deliverables:
- App/test utility image with troubleshooting tools:
  - `curl`, `iputils-ping`, `net-tools`, `dnsutils`, `jq`, `postgresql-client`
- DEBUG-first defaults:
  - `LOG_LEVEL=debug`
  - verbose service logs and structured log retention guidance.
- Optional log collector profile (lightweight) and container health endpoints.

### Step E — External Dependency Strategy (Real/Test/Mock)
**Branch:** `feat/local-env-provider-modes`

Deliverables:
- Provider mode matrix in config/env docs:
  - Stripe: test mode keys only
  - Resend: test/sandbox when available
  - Anthropic/Claude: real test key mode + test harness mock mode
  - Postcodes/other APIs: real mode + mock mode for tests
- Containerized mock services (where feasible) with explicit limits due no-code-edit rule.
- “When provider has test environment, use it” policy encoded in env templates and docs.

### Step F — Email Testing Path
**Branch:** `feat/local-env-email-testing`

Deliverables:
- Decision tree:
  - If Resend local test capture is sufficient, use it by default.
  - Else provide MailHog profile + documented integration boundary.
- Test checklist for “send + receive visibility” validation with safe test credentials.

### Step G — Data Seeding and Prepopulation Investigation
**Branch:** `feat/local-env-db-seeding-plan`

Deliverables:
- Investigation report file in `local-env/docs/` covering:
  - whether prepopulation is required for useful local testing
  - minimal seed dataset candidates
  - additive-only seed execution options (new scripts only)
- Seed strategy (if needed):
  - idempotent scripts
  - run after DB health check
  - no schema refactor and no modifications to existing code.

### Step H — Docs, Runbook, and Adoption
**Branch:** `feat/local-env-docs-runbook`

Deliverables:
- `local-env/README.md` with:
  - one-command startup
  - mode switching (Neon/local Postgres)
  - troubleshooting matrix
  - provider test creds setup
  - known limitations from no-edit constraint
- branch/commit discipline guidance:
  - one branch per step
  - one commit per functionality.

## 5) Proposed File/Folder Additions (No Existing Code Edits)
- `local-env/compose.base.yml`
- `local-env/compose.providers.yml`
- `local-env/compose.debug.yml`
- `local-env/env/*.example`
- `local-env/docs/*.md`
- `scripts/local-env-up.sh`
- `scripts/local-env-validate-env.sh`
- optional `scripts/local-env-seed.sh`

## 6) Operational Best Practices
- Keep prod and local clearly separated by env profiles and credentials.
- Use least-privilege test keys only.
- Add health checks to all containers and hard fail on missing env.
- Prefer deterministic startup ordering with explicit dependency checks.
- Log at debug by default; allow override via `LOG_LEVEL`.
- Keep mock modes explicit and traceable in logs.

## 7) Risks and Mitigations
- **Risk:** No-code-edit rule blocks true runtime provider swapping.  
  **Mitigation:** document boundaries, provide test-harness mocking, schedule future abstraction refactor.

- **Risk:** Neon vs local Postgres behavior drift.  
  **Mitigation:** maintain compatibility checklist and smoke tests against both modes.

- **Risk:** Credentials leakage.  
  **Mitigation:** template-only env files, gitignored local overrides, validation script.

- **Risk:** Podman/Docker differences.  
  **Mitigation:** wrapper script with runtime detection and explicit compatibility notes.

## 8) SMART Success Metrics
1. Setup time from fresh clone to running environment: **<= 20 minutes** for 90% of developers within first 2 weeks of rollout.
2. Startup reliability: **>= 95% successful first-run starts** (`local-env-up`) over first 30 team runs.
3. Functional parity coverage: **>= 85% of core local test scenarios** pass in Neon mode and **>= 80%** in Postgres-fallback mode within first release cycle.
4. Mock readiness: external dependency mock/test modes available for **100% of non-essential providers** in local testing within first implementation cycle.
5. Debug efficiency: median time to diagnose local startup/runtime issue reduced to **< 15 minutes** after runbook publication.
6. Usage adoption: at least **70% of active contributors** use local test env flow at least once per week by week 4.
7. Provider switching friction: switch between provider modes (real test vs mock where supported) in **<= 5 minutes** using env/profile changes only.

## 9) Decision Log Captured from You
- Existing JS/TS code files must **not** be edited; if such need appears during implementation, it must be explicitly raised with rationale first.
- Database default for local plan is **Neon test DB**, with **local Postgres fallback**.

## 10) Carry-Forward Work After the Environment Is Stable
These items were not practical under the current no-edit/additive-only constraint, but should be revisited once the local environment is up and working:

1. Add a real provider abstraction for AI, email, and other external services so runtime swapping no longer depends on env tricks or test-only mocks.
2. Wire MailHog or another local SMTP sink directly into the app so email capture works end-to-end without special harnesses.
3. Add first-class runtime mock toggles for external APIs in the app itself, not just in tests or containerized helpers.
4. Add native seed/bootstrap hooks in the app startup path so local data prepopulation is automatic and idempotent.
5. Reduce reliance on wrapper scripts by moving the environment selection logic into a supported app/config layer.
