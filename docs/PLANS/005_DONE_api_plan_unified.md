# OneGoodArea: Unified API-First Redesign & TDD Migration Plan

## 1. Executive Summary
This plan merges the structural rigor of the Copilot proposal with the granular TDD focus of the Gemini plan. We will decouple the current Next.js monolith into two distinct deployments: **Web (UI)** and **API (Backend)**. 

The migration follows a "one module at a time" strategy, where each domain is extracted, wrapped in a TDD suite, and verified before moving to the next.

---

## 2. Comprehensive Diagnosis

### 2.1 Current Coupling
*   **Auth:** Tightly coupled to `next-auth` and session cookies. API v1 uses a separate Bearer token path.
*   **Data Access:** Pages and Server Components currently call `sql` directly, bypassing an API layer.
*   **Admin:** Logic is embedded in pages (`src/app/admin`) rather than APIs, relying on hardcoded email allowlists.
*   **Bootstrapping:** Database tables are created on-the-fly during request handling (unstable for split services).

### 2.2 Logical Surface Inventory
1.  **Public API:** `/v1/*` — Stable, versioned contract for enterprise clients (API Keys).
2.  **Web API:** `/me/*` — Private endpoints for the first-party UI (JWT Session).
3.  **Internal API:** `/internal/*` — Secured endpoints for Admin, Stripe Webhooks, and Cron jobs.

---

## 3. Target Architecture (2 Deployments, 3 Surfaces)

### Deployment A: Web Frontend (Next.js)
*   **Role:** UI Rendering, Session Management (NextAuth).
*   **Data Fetching:** HTTP calls to Deployment B via `BACKEND_URL`.
*   **Zero-DB:** The Web deployment will have NO database credentials.

### Deployment B: Backend API (Node.js/Next-API)
*   **Role:** Business Logic, Database Access, PDF Generation, Scoring Engine.
*   **Auth:** Dual-mode (JWT for Web, API Key for Clients).
*   **Admin:** RBAC (Role-Based Access Control) instead of email lists.

---

## 4. Modular Migration Roadmap (Phase-by-Phase)

### Phase 0: Scope & Infrastructure
1.  **Canonical UI:** Migrate ONLY `src/app/design-v2/` routes; freeze the old `src/app/` routes.
2.  **Test Harness:** Set up `vitest` + `supertest` in a new `/backend` workspace.
3.  **DB Isolation:** Create an explicit migration script to replace request-time table creation.

### Phase 1: Module Extraction (The TDD Loop)
For each module (Auth, Report, Watchlist, Usage, Settings, Admin):

**Step 1.1: Contract Definition**
*   Write a Vitest integration test that expects the new API structure (e.g., `GET /me/reports`).
*   Define the JSON schema for request/response.

**Step 1.2: Repository Extraction**
*   Move the raw SQL logic from the page/route into a dedicated `src/lib/repositories` folder.
*   Add unit tests for the repository to ensure SQL results are identical.

**Step 1.3: Use-Case Migration**
*   Migrate the `src/lib` domain logic (e.g., `scoring-engine.ts`) to the backend.
*   Ensure no Next.js imports exist in this layer.

**Step 1.4: Handler Implementation**
*   Create the backend route handler. 
*   Run tests until the contract test from Step 1.1 is **Green**.

**Step 1.5: Frontend Hook-up**
*   Update the UI page to call the new API instead of the DB.
*   Remove direct DB imports from the page.

### Phase 2: Auth Unification
1.  **Shared Secret:** Configure both services to use the same `AUTH_SECRET`.
2.  **JWT Bridge:** Update NextAuth to include the `userId` in a signed JWT that the backend can verify.
3.  **RBAC:** Add a `role` column to the `users` table to properly secure Admin APIs.

---

## 5. Detailed TDD Verification Matrix

| Category | Pathway | Key Tests (Success/Failure) |
| :--- | :--- | :--- |
| **Auth** | `/auth/register` | Duplicate email (409), Weak password (400), Successful JWT (200). |
| **Reports** | `/v1/reports` | Valid API Key (200), Expired Key (401), Over Limit (429). |
| **Reports** | `/me/reports` | Correct User ID from JWT, Own vs. Foreign report access. |
| **Admin** | `/internal/analytics` | Non-admin blocked (403), Correct aggregate stats. |
| **Stripe** | `/internal/webhook` | Signature verification, Idempotency (duplicate events). |

---

## 6. Vercel Free Plan Considerations
1.  **Deployment Split:** Use two separate Vercel Projects.
    *   `onegoodarea-web` (Main Domain)
    *   `onegoodarea-api` (API Subdomain)
2.  **Cold Starts:** Backend logic must be efficient to avoid timeout limits on the free tier.
3.  **Environment Variables:** Strictly manage `BACKEND_URL` and `AUTH_SECRET` across both projects.

---

## 7. Definition of Done (DoD)
1.  **Web Build:** `npm run build` succeeds on the web app with `DATABASE_URL` removed.
2.  **Coverage:** 100% of the API Pathways defined in the Matrix have passing Vitest suites.
3.  **Isolation:** No direct imports of `src/lib/db` remain in any file under `src/app/`.
4.  **Admin:** Hardcoded emails are replaced with a `role = 'admin'` check.
