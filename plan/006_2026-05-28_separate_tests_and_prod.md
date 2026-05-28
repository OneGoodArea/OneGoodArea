# Plan 006: Restructure Monorepo to Separate Production and Test Code

**Date:** 2026-05-28  
**Plan Number:** 006  
**Status:** Draft / Awaiting Approval  

---

## Goal Description
The goal of this restructuring is to separate production code (which lives under `src/` in each package/application) from testing code (which will live under root-level `tests/` in each package/application). This aligns the codebase with industry best practices, makes production builds cleaner, ensures clear boundaries, and allows each subdirectory inside `apps/` to remain fully independent and deployable as a separate unit.

Currently:
- **`apps/api`**: All integration/endpoint test files (`*.test.ts`) and test setup helpers are flat in `src/` or `src/test/`.
- **`apps/web`**: All unit and integration test files are in `src/tests/`, while database seeding/bootstrap files are in `tests/`.
- **`packages/contracts`**: Unit tests are scattered flat inside `src/`.

---

## Proposed Changes

We will restructure each package/application in the monorepo individually to keep them fully self-contained and deployable.

### 1. `apps/api` Restructuring

We will move all test-related files out of `src` and into a new root-level `tests/` folder.

#### [NEW] `apps/api/tests/`
All tests and test setup files will live here:
- `apps/api/src/app.test.ts` ➔ `apps/api/tests/app.test.ts`
- `apps/api/src/auth-credentials.test.ts` ➔ `apps/api/tests/auth-credentials.test.ts`
- `apps/api/src/cron-rescore.test.ts` ➔ `apps/api/tests/cron-rescore.test.ts`
- `apps/api/src/delete-account.test.ts` ➔ `apps/api/tests/delete-account.test.ts`
- `apps/api/src/keys-crud.test.ts` ➔ `apps/api/tests/keys-crud.test.ts`
- `apps/api/src/me-reports.test.ts` ➔ `apps/api/tests/me-reports.test.ts`
- `apps/api/src/report-id.test.ts` ➔ `apps/api/tests/report-id.test.ts`
- `apps/api/src/report-post.test.ts` ➔ `apps/api/tests/report-post.test.ts`
- `apps/api/src/session-reads.test.ts` ➔ `apps/api/tests/session-reads.test.ts`
- `apps/api/src/settings-password.test.ts` ➔ `apps/api/tests/settings-password.test.ts`
- `apps/api/src/stripe-checkout.test.ts` ➔ `apps/api/tests/stripe-checkout.test.ts`
- `apps/api/src/stripe-session-routes.test.ts` ➔ `apps/api/tests/stripe-session-routes.test.ts`
- `apps/api/src/stripe-webhook.test.ts` ➔ `apps/api/tests/stripe-webhook.test.ts`
- `apps/api/src/track.test.ts` ➔ `apps/api/tests/track.test.ts`
- `apps/api/src/v1-area.test.ts` ➔ `apps/api/tests/v1-area.test.ts`
- `apps/api/src/v1-areas.test.ts` ➔ `apps/api/tests/v1-areas.test.ts`
- `apps/api/src/v1-batch.test.ts` ➔ `apps/api/tests/v1-batch.test.ts`
- `apps/api/src/v1-me.test.ts` ➔ `apps/api/tests/v1-me.test.ts`
- `apps/api/src/v1-portfolios.test.ts` ➔ `apps/api/tests/v1-portfolios.test.ts`
- `apps/api/src/v1-report.test.ts` ➔ `apps/api/tests/v1-report.test.ts`
- `apps/api/src/v1-score.test.ts` ➔ `apps/api/tests/v1-score.test.ts`
- `apps/api/src/v1-signals.test.ts` ➔ `apps/api/tests/v1-signals.test.ts`
- `apps/api/src/v1-webhooks.test.ts` ➔ `apps/api/tests/v1-webhooks.test.ts`
- `apps/api/src/watchlist.test.ts` ➔ `apps/api/tests/watchlist.test.ts`
- `apps/api/src/widget.test.ts` ➔ `apps/api/tests/widget.test.ts`
- `apps/api/src/test/setup.ts` ➔ `apps/api/tests/setup.ts`
- `apps/api/src/test/msw-server.ts` ➔ `apps/api/tests/msw-server.ts`

#### [MODIFY] [tsconfig.json](file:///home/perez/projetos/OneGoodArea/apps/api/tsconfig.json)
Update compilation include paths to include both `"src"` and `"tests"`.
```json
  "include": ["src", "tests"]
```

#### [MODIFY] [vitest.config.ts](file:///home/perez/projetos/OneGoodArea/apps/api/vitest.config.ts)
Update setup file location and add test file patterns:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
```

---

### 2. `apps/web` Restructuring

We will move the tests from `src/tests/` to a root-level `tests/unit/` folder. This keeps them clearly separated from the database seeds/bootstrap files already in `tests/db/` and `tests/seeds/`.

#### [NEW] `apps/web/tests/unit/`
All unit/integration tests and snapshots will move here:
- `apps/web/src/tests/*.test.ts` ➔ `apps/web/tests/unit/*.test.ts`
- `apps/web/src/tests/__snapshots__` ➔ `apps/web/tests/unit/__snapshots__/`

#### [MODIFY] [vitest.config.ts](file:///home/perez/projetos/OneGoodArea/apps/web/vitest.config.ts)
Update test matching patterns and coverage configuration:
```typescript
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      ...
      exclude: [
        "tests/**",
        "src/**/*.d.ts",
        "src/app/**",
        "node_modules/**"
      ],
      ...
    }
  }
```

---

### 3. `packages/contracts` Restructuring

We will move all test files out of `src/` to a new root-level `tests/` folder.

#### [NEW] `packages/contracts/tests/`
- `packages/contracts/src/*.test.ts` ➔ `packages/contracts/tests/*.test.ts`

#### [MODIFY] [tsconfig.json](file:///home/perez/projetos/OneGoodArea/packages/contracts/tsconfig.json)
Update include pattern to cover both `"src"` and `"tests"`:
```json
  "include": ["src", "tests"]
```

#### [NEW] [vitest.config.ts](file:///home/perez/projetos/OneGoodArea/packages/contracts/vitest.config.ts)
Add an explicit Vitest configuration for contracts:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

---

## Import Adjustments Strategy

1. **Relative Imports to Production Code**:
   - In `apps/api/tests/`: Imports referencing `./app` or `./modules/` will be updated to `../src/app` or `../src/modules/`.
   - In `packages/contracts/tests/`: Imports referencing `./index` will be updated to `../src/index`.
2. **Relative Imports to Setup/Helpers**:
   - In `apps/api/tests/`: Imports of `./test/setup` or `./test/msw-server` will become `./setup` and `./msw-server`.
3. **Path Alias Imports (`@/*`)**:
   - In `apps/web/tests/unit/`: Imports that use `@/` (e.g. `@/components/foo`) will remain **completely unchanged** because the path alias still correctly resolves to `src/`!

---

## CI/CD & Build Considerations

1. **Workspace Linting (`npm run lint`)**: ESLint lints the entire `apps` and `packages` workspace roots globally. All physically moved tests will continue to be automatically linted without any alterations to ESLint configuration.
2. **TypeScript Compilation in CI (`npm run typecheck`)**: By adding `"tests"` to the compilation `include` array of each `tsconfig.json`, we ensure that the typechecker in CI/CD continues to validate the test files and prevents merging of broken typings/imports.
3. **Next.js Production Bundle Safety (`apps/web`)**: Moving tests completely out of the Next.js production source tree `src/` prevents Next.js from accidentally compiling test code or bundling mocking libraries into production client assets during `next build` in CI/CD.
4. **Targeted Deployment Independence**: As each workspace contains its own localized `tests/` directory, individual components can be built, containerized, and unit-tested in isolated CI pipelines completely independently of one another.

---

## Docker & Deployment Considerations

1. **Production Dockerfile Exclusion**: To keep the production Docker container as lean as possible, we will add `**/tests` to `.dockerignore`. This ensures that none of the `tests/` directories in `apps/api` or `packages/contracts` are copied to the container, optimizing build contexts and minimizing final image sizes.
2. **Deterministic Bundle Integrity**: Since the API's build script bundles production code via `esbuild` pointing strictly to `src/server.ts`, separating test files into `/tests` keeps the compilation boundary precise and entirely clean of mock data or test runners.

---

## Verification Plan

### Automated Tests
We will run:
- `npm run test` (which triggers test scripts in all workspaces) to ensure all tests execute and pass in their new homes.
- `npm run typecheck` to verify that TypeScript resolves all imports properly and type-checks all tests and production files successfully.
- `npm run build` to verify that production builds succeed without any testing code interference.
