# Local Test Environment Implementation Plan

This plan outlines the strategy to create a robust, containerized local test environment for OneGoodArea. It prioritizes system fidelity (mimicking Production/Neon) while strictly adhering to the **"No Existing Code Modification"** rule.

---

## ⚠️ Constraint Warnings & Exceptions
The following items may require minimal modifications to existing files to function correctly. These are flagged for your approval:

1. **`next.config.ts` (CSP Headers):** To allow the browser to connect to local mocks (e.g., Prism, Stripe-mock), we may need to append local URLs (e.g., `http://localhost:4010`) to the `connect-src` and `script-src` Content Security Policy (CSP) headers.
2. **`package.json`:** We will add new scripts (e.g., `npm run test:local`) to facilitate the "one-command" setup.

---

## 1. Architecture Overview
The environment will consist of a multi-container setup using `container-compose`:

| Component | Technology | Role |
| :--- | :--- | :--- |
| **App** | Next.js (Node.js) | The main application running in a development container. |
| **Database** | PostgreSQL 16 | Local persistence mimicking the Neon schema. |
| **Neon Proxy** | Custom Node.js/Go | Translates HTTP Neon-style requests from the `@neondatabase/serverless` driver into standard TCP Postgres queries. |
| **API Mock Gateway** | Prism (Stoplight) | Mocks `postcodes.io` and other external REST APIs using their OpenAPI specs. |
| **Email Mock** | MailHog + Proxy | MailHog captures emails; a small Resend-compatible API proxy will forward "sends" to MailHog. |
| **AI Mock** | Anthropic Mock | A local server mimicking the Anthropic SDK responses to avoid costs. |

---

## 2. Detailed Implementation

### A. Container Infrastructure
- **Unified `container-compose.yml`:** Optimized for both Docker (Windows) and Podman (Linux).
- **Troubleshooting Layer:** The `Containerfile.dev` will include `curl`, `iputils-ping`, `net-tools`, and `vim`.
- **Logging:** All containers will output logs to `stdout` with `DEBUG` level verbosity by default, configurable via `.env.test`.

### B. Database & Neon Fidelity
- **Neon Proxy:** We will use a proxy container that listens for HTTP POST requests (what the Neon driver sends) and executes them against the local Postgres container.
- **Schema Management:** We will create a new file `tests/local-db-init.sql` (generated from `db-schema.ts`) to initialize the database upon container startup without modifying the existing schema files.

### C. Environment Management
- **New File:** `.env.test.local` (added to `.gitignore`).
- **New Module:** `src/lib/test-env-loader.ts`. This file will be added to the project but only imported if `process.env.NODE_ENV === 'test'`. Since we cannot change `layout.tsx` or `instrumentation.ts`, we will use the **Next.js `--env-file`** flag or a wrapper script to load these variables.

### D. Mocking Strategy
- **Stripe:** Use **Real Test Mode**. Developers must provide `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from their Stripe Dashboard.
- **Resend:** A new file `src/lib/mocks/resend-provider.ts` will be created. We will use environment variables (`RESEND_API_BASE_URL`) to redirect traffic to our local MailHog-proxy.
- **Prism:** Will serve as the mock server for `postcodes.io` and any other third-party JSON APIs.

### E. Auto-Login Capability
- **New Route:** `src/app/api/auth/auto-login/route.ts`.
- **Functionality:** This endpoint will accept a `user_id` or `email` and use `NextAuth`'s internal mechanisms to sign the user in directly, bypassing the UI for testing purposes. It will be protected to only run in `development/test` environments.

---

## 3. Implementation Roadmap (Branching Strategy)

We will use a branch-per-step approach, keeping `main` clean.

1. **`feat/local-env-infra`**:
   - Add `container-compose.yml` and `Containerfile.dev`.
   - Add basic shell scripts for "one-command" setup.
2. **`feat/local-env-db`**:
   - Add Neon Proxy container.
   - Add DB initialization scripts.
3. **`feat/local-env-mocks`**:
   - Add Prism configuration and OpenAPI specs for mocks.
   - Add Resend-to-MailHog proxy service.
   - Add Anthropic/AI mock server.
4. **`feat/local-env-auth`**:
   - Add `/api/auth/auto-login` route.
   - Finalize environment variable templates.

---

## 4. Success Metrics (SMART)

| Metric | Goal | Target Date |
| :--- | :--- | :--- |
| **Setup Time** | < 5 minutes for a fresh developer to run `compose up` and see a login screen. | Week 2 |
| **Test Coverage** | 100% of core flows (Sign-in, Report Gen, Stripe Portal) runnable locally without internet (except Stripe). | Week 3 |
| **Fidelity** | 0 existing code files modified (excluding `package.json`/`next.config.ts` exceptions). | Ongoing |
| **Usage** | > 80% of new feature development starts in the local test environment. | End of Month 1 |
| **Flexibility** | Time to swap AI Model via environment variable < 30 seconds. | Week 3 |

---

## 5. Potential Challenges & Solutions
- **Podman Networking:** Podman handles `localhost` differently than Docker. **Solution:** Use `network_mode: bridge` and explicit container names in all connection strings.
- **Neon Driver Timeouts:** The serverless driver might have low timeouts for local DBs. **Solution:** Adjust `NEON_TIMEOUT` env var in the local environment.
- **Email Verification:** Resend tokens are sent via email. **Solution:** MailHog UI will be available at `http://localhost:8025` to retrieve tokens.

---

*This plan is saved in `plan/local_test_env_plan.md`.*
