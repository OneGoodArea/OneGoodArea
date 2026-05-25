# Technical Implementation Plan: Web Client & Server API Separation of Concerns

This document details the concrete, file-by-file developer migration plan to decouple the **OneGoodArea** Next.js monolith into an npm monorepo workspaces layout containing a Frontend Web Client (`apps/web`), a Standalone Backend API (`apps/api`), and a shared contracts library (`packages/contracts`).

For the high-level goals, system topology diagram, and success metrics, please refer to the companion:
👉 **[Architectural Outcomes Plan](file:///home/perez/projetos/OneGoodArea/plan/separation_of_concerns_outcomes.md)**

---

## ⚠️ Mandatory Git Safeguards & Operating Rules

To comply with the engineering guidelines defined in `CLAUDE.md` and global user rules, every developer (and AI agent) must strictly execute the following branch management and commit protocols before any implementation begins.

### 1. Active Branch Verification & Creation
*   **Zero-Direct-Main Policy:** Directly modifying, committing, or pushing to `main` or `master` is **strictly forbidden**. The `main`/`master` branch is read-only.
*   **Active Branch Check:** Before writing any code, execute:
    ```bash
    git branch --show-current
    ```
    Verify the active branch is NOT `main` or `master`.
*   **Branch-Per-Step Strategy:** Create a dedicated, cleanly named feature branch for each logical phase/step (e.g. compatible with GitHub naming conventions):
    ```bash
    # Example for Phase 0
    git checkout -b feat/separation-monorepo-setup
    ```

### 2. Commit Standards
*   **One Responsibility per Commit:** Commits must be small, incremental, atomic, and represent a single logical change or rollback unit.
*   **Descriptive Messages:** Use clear commit messages that describe the exact intent and follow semantic scoping.
    *   **Approved Format Examples:**
        - `feat(monorepo): configure npm workspaces in root package.json`
        - `feat(reports): extract scoring-engine calculations to backend module`
        - `test(reports): add vitest suite for scoring calculations`
    *   **Forbidden Formats:** `fix stuff`, `updates`, `wip`, `misc fixes`.

### 3. Pre-Merge Quality Gates
Prior to merging any feature branch, the following three checks must be run locally and pass successfully:
1.  **Testing:** `npm run test` (all Vitest suites are green).
2.  **Linting:** `npm run lint` (no static code errors or warnings).
3.  **Compilation:** `npm run build` (entire workspace compiles successfully).

---

## 1. Concrete Backend Modules & File Migration Map

We will migrate the existing 32+ library files from `src/lib/` directly into structured domain modules inside `apps/api/src/modules/` or helper folders inside `apps/api/src/infrastructure/`.

### A. Shared Infrastructure & Utilities (`apps/api/src/infrastructure`)
These are standard Postgres drivers, logger handlers, custom error classes, and nanoid utilities:
*   `src/lib/db.ts` ──> `apps/api/src/infrastructure/db/client.ts`
*   `src/lib/db-schema.ts` ──> `apps/api/src/infrastructure/db/schema.ts`
*   `src/lib/db-types.ts` ──> `apps/api/src/infrastructure/db/types.ts`
*   `src/lib/errors.ts` ──> `apps/api/src/infrastructure/errors/custom-errors.ts`
*   `src/lib/validation.ts` ──> `apps/api/src/infrastructure/validation/validator.ts`
*   `src/lib/id.ts` ──> `apps/api/src/infrastructure/utils/id.ts`

---

### B. Domain Modules (`apps/api/src/modules`)

#### 1. `auth` Module (`apps/api/src/modules/auth`)
*   **Purpose:** Secure user register, authentication, password check, and JWT verification.
*   **Migration Path:**
    *   `src/lib/auth.ts` ──> `apps/api/src/modules/auth/auth-service.ts`
    *   `src/lib/crypto.ts` ──> `apps/api/src/modules/auth/crypto-helper.ts`
    *   `src/lib/with-auth.ts` ──> `apps/api/src/modules/auth/auth-middleware.ts`
*   **New Endpoints:** `POST /auth/register`, `POST /auth/login`, `GET /auth/verify`.

#### 2. `reports` Module (`apps/api/src/modules/reports`)
*   **Purpose:** Calculations of geographic score grids, cached checks, and exporting PDFs.
*   **Migration Path:**
    *   `src/lib/scoring-engine.ts` ──> `apps/api/src/modules/reports/scoring-engine.ts`
    *   `src/lib/generate-report.ts` ──> `apps/api/src/modules/reports/report-generator.ts`
    *   `src/lib/pdf-export.ts` ──> `apps/api/src/modules/reports/pdf-exporter.ts`
    *   `src/lib/report-cache.ts` ──> `apps/api/src/modules/reports/report-cache.ts`
    *   `src/lib/engine-version.ts` ──> `apps/api/src/modules/reports/engine-version.ts`
    *   `src/lib/methodology-versions.ts` ──> `apps/api/src/modules/reports/methodology.ts`
*   **New Endpoints:** `GET /me/reports`, `POST /me/reports`, `GET /me/reports/:id`, `GET /v1/reports` (API Key check).

#### 3. `api-keys` Module (`apps/api/src/modules/api-keys`)
*   **Purpose:** Generation, security hashing, and revoking API keys.
*   **Migration Path:**
    *   `src/lib/api-keys.ts` ──> `apps/api/src/modules/api-keys/api-keys-service.ts`
*   **New Endpoints:** `GET /me/api-keys`, `POST /me/api-keys`, `DELETE /me/api-keys/:id`.

#### 4. `usage` Module (`apps/api/src/modules/usage`)
*   **Purpose:** Limits checks, usage quotas counts, and rate limiting algorithms.
*   **Migration Path:**
    *   `src/lib/usage.ts` ──> `apps/api/src/modules/usage/usage-service.ts`
    *   `src/lib/rate-limit.ts` ──> `apps/api/src/modules/usage/rate-limiter.ts`
*   **New Endpoints:** `GET /me/usage`, `GET /me/api-usage`.

#### 5. `billing` Module (`apps/api/src/modules/billing`)
*   **Purpose:** Stripe integrations, session portals, and webhook event checks.
*   **Migration Path:**
    *   `src/lib/stripe.ts` ──> `apps/api/src/modules/billing/stripe-service.ts`
    *   `src/lib/webhooks.ts` ──> `apps/api/src/modules/billing/stripe-webhooks.ts`
    *   `src/lib/idempotency.ts` ──> `apps/api/src/modules/billing/idempotency-service.ts`
*   **New Endpoints:** `POST /internal/billing/checkout`, `POST /internal/billing/portal`, `POST /internal/billing/webhook`.

#### 6. `tracking` Module (`apps/api/src/modules/tracking`)
*   **Purpose:** diagnostic audits logging and telemetries.
*   **Migration Path:**
    *   `src/lib/activity.ts` ──> `apps/api/src/modules/tracking/activity-logger.ts`
    *   `src/lib/logger.ts` ──> `apps/api/src/modules/tracking/structured-logger.ts`
*   **New Endpoints:** `POST /internal/track`.

#### 7. `admin` Module (`apps/api/src/modules/admin`)
*   **Purpose:** Administration metrics calculations.
*   **Migration Path:** This is an architecturally clean addition:
    *   `admin-service.ts` (calculates system traffic and users lists).
*   **New Endpoints:** `GET /internal/admin/analytics`, `GET /internal/admin/traffic`, `PATCH /internal/admin/users/:id`.

---

## 2. Phase-by-Phase Execution Roadmap

### Phase 0: Workspace Layout & Setup
1. Define the workspaces in root `package.json`:
   ```json
   "workspaces": [
     "apps/*",
     "packages/*"
   ]
   ```
2. Create directories: `apps/web`, `apps/api`, `packages/contracts`.
3. Separate dependencies: Move backend-only dependencies (e.g. Postgres pool, Stripe SDK) to `apps/api/package.json` and UI-dependencies to `apps/web/package.json`.
4. Move database table bootstrapping out of API endpoints and create a standalone script: `apps/api/src/infrastructure/db/migrate.ts`.

### Phase 1: Shared Infrastructure & Reports Module Migration
1. Move the DB driver, Drizzle schema, errors, and nanoid utils to `apps/api/src/infrastructure/`.
2. Extract all report and scoring files into `apps/api/src/modules/reports/`.
3. Set up a comprehensive backend test suite in `apps/api` using `vitest`.
4. Create the Fastify or Express server framework entry `apps/api/src/server.ts` and define the `/me/reports` endpoint.

### Phase 2: Core Domain Modules Migration
1. Extract `api-keys`, `usage`, and `watchlist` domains into their modular homes inside `apps/api/src/modules/`.
2. Build typesafe request/response contract interfaces in `packages/contracts/src/` (Zod schemas).
3. Validate and assert all logic runs cleanly through local integration testing.

### Phase 3: Stripe Integration, Admin, and Authentication
1. Move Stripe checkout, webhooks, and idempotency logic into the `billing` module.
2. Implement the `admin` module. Remove hardcoded user emails lists and use standard Role-Based Access Control checks.
3. Configure the dual-mode JWT auth middleware: Frontend signs session JWT with `AUTH_SECRET`, and the backend middleware parses and verifies this signature stateless.

### Phase 4: Frontend Decoupling (HTTP Client)
1. Clean up and purge all database schemas or PG connection imports from `apps/web`.
2. Implement `apps/web/src/lib/api-client.ts` to coordinate HTTP requests to `process.env.BACKEND_URL` and append the user JWT bearer token to headers.
3. Replace direct DB actions in frontend App Router loaders and server actions with API requests through this client.
4. Execute frontend build with `DATABASE_URL` omitted to verify no database leakage exists.

### Phase 5: Independent Server Deployment & Verification
1. Build production-ready `Containerfile.api` for containerizing the API server.
2. Deploy the API server independently of the Next.js Frontend.
3. Assert that both systems communicate perfectly using the automated REST client test suite.

---

## 3. Verification & Testing Strategy

### Automated API Validation
Run Fastify/Express server tests locally with `vitest`:
```bash
npm run test -w apps/api
```

### Compiler Integrity
Assert that frontend Next.js does not contain database references or credentials leakage during compilation:
```bash
DATABASE_URL="" npm run build -w apps/web
```

👉 **[Return to separation_of_concerns_outcomes.md to view High-level outcomes and topology](file:///home/perez/projetos/OneGoodArea/plan/separation_of_concerns_outcomes.md)**
