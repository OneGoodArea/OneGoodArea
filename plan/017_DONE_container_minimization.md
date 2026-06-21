# Plan 017: Container Content Minimization — API and Web

## 1. Objective

Audit the `api` and `web` container images and ensure each carries only the **minimum content** needed at runtime. Eliminate build artifacts, dev tooling, and unused source code from final production images.

---

## 2. Current State Audit

### 2.1 Sizing Context

| Artifact | Size |
|---|---|
| Root `node_modules` (hoisted monorepo) | **1.3 GB** |
| Of which `next` + `@next` | ~383 MB |
| Of which `typescript` | ~23 MB |
| Of which dev tooling (eslint, vitest, @swc, etc.) | ~10+ MB |

### 2.2 API Container (`container/api/Containerfile`) — CURRENT

**Structure:** SINGLE-stage (`FROM node:22-slim`)

| What goes in | Why | Needed at runtime? |
|---|---|---|
| All package.json manifests (root, api, web, contracts) | npm workspace resolution | **No** (only build-time) |
| Full 1.3 GB `node_modules` | `npm install` without `--omit=dev` | **No** — only a tiny subset |
| TailwindCSS, TypeScript, ESLint, Vitest, Next.js, @next, @swc | Installed via workspace root devDeps | **No** |
| `packages/contracts/src/*` | Copied for build | **No** (bundled into `dist/server.cjs`) |
| `apps/api/src/*` + `tests/` | Copied for build | **No** (bundled; tests excluded via `.dockerignore`) |
| `dist/server.cjs` | esbuild bundle | **Yes** |
| `tsx`, `esbuild` (in `dependencies`) | CLI data jobs + build | **tsx** only for CLI jobs; **esbuild** never at runtime |

**Estimated final image size:** 1.5–2.0 GB (node:22-slim base ~250MB + 1.3GB node_modules + source)

### 2.3 Web Container (`container/web/Containerfile`) — CURRENT

**Structure:** MULTI-stage (`deps` → `build` → `runtime`)

| Stage | What goes in | Reaches runtime? |
|---|---|---|
| `deps` | All manifests, full `npm install` (1.3 GB node_modules) | **No** (intermediate) |
| `build` | node_modules from deps + contracts source + apps/web source | **No** (intermediate) |
| `runtime` | Next.js `standalone` output (traced deps only) + `apps/web/.next/static` + `apps/web/public` + `curl` | **Yes** |

The `runtime` stage uses Next.js 16 `output: "standalone"` with automatic dependency tracing. Only code that is statically reachable from the build output is copied — this is **inherently minimal**. The image also installs `curl` (~1–2 MB) for healthchecks.

**Estimated final image size:** ~300–400 MB (base ~250MB + standalone bundle + static assets + curl)

### 2.4 Compose Test Stack (`compose/compose.test.yml`)

Both services use the same images for testing:
- **api-test**: `image: onegoodarea/api:local` — runs with `NODE_ENV=development`, needs full node_modules for vitest
- **web-test**: `target: build` on `container/web/Containerfile` — already correct pattern (uses the build stage)

---

## 3. Findings Summary

| Container | Issue | Severity | Gap |
|---|---|---|---|
| **API** | Single-stage build — all 1.3 GB node_modules in final image | **CRITICAL** | Multi-stage needed |
| **API** | `npm install` pulls all devDependencies (tailwindcss, typescript, vitest, eslint, next, @next) | **HIGH** | `--omit=dev` needed in build stage |
| **API** | Source code (apps/api/src/*) in final image | **MEDIUM** | Only `dist/server.cjs` needed |
| **API** | `tsx` and `esbuild` classified as `dependencies` (should be `devDependencies`) | **LOW** | Classification mismatch |
| **API** | `apps/web/package.json` copied into image | **LOW** | Workspace resolution artifact — unavoidable without restructuring |
| **Web** | `deps` stage copies `apps/api/package.json` | **LOW** | Workspace resolution artifact — intermediate stage only |
| **Web** | `deps` stage does full `npm install` | **LOW** | Intermediate stage only; does not affect runtime image |
| **Web** | `runtime` stage installs `curl` | **TRIVIAL** | ~1–2 MB for healthchecks — acceptable |

---

## 4. Proposed Changes

### 4.1 API Container — Multi-Stage Refactor

**Primary change:** Split into `build` + `runtime` stages, mirroring the web container pattern.

```dockerfile
# container/api/Containerfile
#
# MULTI-STAGE (Plan 017): build stage does full install + esbuild bundle.
# runtime stage carries only the bundle + strictly necessary native deps.

# --- BUILD STAGE ----------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

ENV NODE_ENV=production

# Manifests for workspace resolution (npm needs every declared workspace's
# package.json to exist, even if we never copy or run its source).
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

# Install production deps only. The bundle is self-contained via esbuild, so
# runtime node_modules is tiny. We still install full deps here because esbuild
# is a dependency and it's needed during build.
RUN npm install --omit=dev --no-audit --no-fund

# Source needed for build (contracts are pulled into the esbuild bundle).
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

# Bundle server to dist/server.cjs (esbuild inlines all reachable JS).
RUN npm run build -w @onegoodarea/api

# --- RUNTIME STAGE --------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install curl for healthchecks (Plan 011 / Plan 017).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the esbuild bundle.
COPY --from=build /app/apps/api/dist/server.cjs ./apps/api/dist/server.cjs

# Copy only the node_modules that contain native bindings or WASM that esbuild
# cannot bundle. These are discovered by inspecting the bundle's external
# require() calls OR by copying the production deps from the build stage
# and testing. Start conservative: copy production node_modules and then
# prune. (Follow-up: run `node --trace-depfile` or use esbuild metafile to
# narrow to exactly what's needed.)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 8080
CMD ["node", "apps/api/dist/server.cjs"]
```

**Key decisions:**

| Decision | Rationale |
|---|---|
| `npm install --omit=dev` in build stage | Skips root devDeps (tailwindcss, typescript, vitest, eslint, next, @next → ~400+ MB saved in the build stage) |
| Build stage still copies `apps/web/package.json` | Unavoidable for npm workspace resolution; intermediate stage only |
| Runtime copies `node_modules` from build | Conservative — ensures native modules (@neondatabase/serverless) work. Follow-up: prune to only needed native packages |
| `curl` in runtime | Parity with web container healthcheck pattern |
| Source code NOT in runtime | Only `dist/server.cjs` — source stays in build stage |

**Impact on compose.test.yml:** The `api-test` service currently uses `image: onegoodarea/api:local`. For testing (which needs full devDeps + source), it should target the `build` stage instead:

```yaml
# compose/compose.test.yml — api-test entry (updated)
api-test:
  build:
    context: ..
    dockerfile: container/api/Containerfile
    target: build       # <-- build stage carries full source + node_modules
  image: onegoodarea/api-test:local
  environment:
    NODE_ENV: development
    # ... same env vars ...
```

### 4.2 API Package.json — Move `tsx` and `esbuild` to `devDependencies`

These are build-time / CLI tools, not server-runtime dependencies:

```diff
  "dependencies": {
    "fastify": "^5.2.0",
    "@neondatabase/serverless": "^1.1.0",
    "@anthropic-ai/sdk": "^0.95.2",
    "@onegoodarea/contracts": "*",
-   "esbuild": "^0.28.0",
    "jose": "^6.2.3",
    "resend": "^6.12.3",
    "stripe": "^20.4.0",
-   "tsx": "^4.19.2"
  },
  "devDependencies": {
+   "esbuild": "^0.28.0",
+   "tsx": "^4.19.2",
    "@types/node": "^25",
    "msw": "^2.14.6"
  }
```

**Note:** `tsx` is needed for CLI data jobs (`migrate`, `refresh:*`, etc.). These run via GitHub Actions and can use the build stage image, not the runtime image. If they need their own minimal image, that's a separate concern.

### 4.3 Web Container — Deferred (No Action Required)

The web container is already well-structured:
- Multi-stage with Next.js standalone (traced deps)
- Runtime stage is minimal
- `curl` healthcheck is acceptable (~1–2 MB)

**Potential future optimization (not in this plan):**
- Strip `apps/api/package.json` from the `deps` stage by using a lightweight stub — but this is a workspace-level change and carries risk of npm resolution breakage. Not worth the complexity at 1.3 GB deps stage size since it's intermediate.

---

## 5. Implementation Steps

### Commit 1: `container/api/Containerfile` — Multi-stage refactor

- Split into `build` and `runtime` stages
- Add `--omit=dev` to npm install
- Add `curl` healthcheck install to runtime stage
- Copy only `dist/server.cjs` + `node_modules` (from build) + root `package.json` to runtime

### Commit 2: `apps/api/package.json` — Move `tsx` and `esbuild` to `devDependencies`

- Move `esbuild` and `tsx` from `dependencies` to `devDependencies`

### Commit 3: `compose/compose.test.yml` — Target `build` stage for `api-test`

- Change `api-test` from `image: onegoodarea/api:local` to `build: target: build` pattern (mirroring `web-test`)

### Commit 4: Documentation — Update CONTAINERS.md

- Add section on image size expectations
- Document the multi-stage rationale

---

## 6. Verification Checklist

### Build
- [ ] `container/api/Containerfile` builds successfully
- [ ] `container/web/Containerfile` builds successfully (no regression)
- [ ] `make stack-up-min BUILD_FLAG=--build` brings up the full minimal stack

### Image sizes
- [ ] API runtime image is **under 500 MB** (down from ~1.5–2.0 GB)
- [ ] Web runtime image is **under 400 MB** (unchanged, verify no regression)

### Smoke tests
- [ ] `curl http://localhost:8080/health` returns 200 from API container
- [ ] `curl http://localhost:3000` returns 200 from Web container
- [ ] Web can reach API via `INTERNAL_API_URL=http://api:8080`

### Test infrastructure
- [ ] `make api-test-coverage-container` works (uses build stage)
- [ ] `make web-test-coverage-container` works (unchanged)

### Deployment parity
- [ ] API container can serve API endpoints (build stage has full source for dev/test; runtime stage has only bundle for prod)
- [ ] `docker run --rm onegoodarea/api:local node apps/api/dist/server.cjs` starts successfully (runtime stage)

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Native modules (e.g., `@neondatabase/serverless` WASM) not found at runtime after pruning node_modules | MEDIUM | HIGH | Conservative first pass: copy full production node_modules. Follow-up plan to prune to only needed native packages |
| esbuild bundle missing dynamic imports not caught at build time | LOW | HIGH | esbuild `--bundle` resolves static imports; dynamic `import()` calls are preserved. Review for any runtime `require()` calls |
| `tsx` needed in runtime image for CLI data jobs | LOW | MEDIUM | CLI jobs use GitHub Actions with repo checkout, not the container image. If they need the container, use the build stage |
| compose.test.yml breakage | LOW | HIGH | Explicitly test `make api-test-coverage-container` after change |
| Lockfile regeneration on different platform | LOW | LOW | Same `npm install` (not `npm ci`) approach preserved |

---

## 8. Out of Scope (Explicitly)

- Changing the web Containerfile (already minimal)
- Restructuring npm workspaces to avoid cross-service manifest copying
- Pruning node_modules to exact native-only subset (deferred to follow-up)
- Removing `curl` from images (healthcheck requirement)
- Changing the root `package.json` or `package-lock.json` generation workflow
- Any change to `apps/web` source or build configuration

---

## 9. Expected Size Reduction

| Container | Before | After | Reduction |
|---|---|---|---|
| API (`onegoodarea/api:local`) | ~1.5–2.0 GB | ~350–500 MB | ~70–80% |
| Web (`onegoodarea/web:local`) | ~300–400 MB | ~300–400 MB | None (already optimal) |

---

## 10. CLAUDE.md Compliance

- ✅ **Rule 7:** Branch from main, never modify directly
- ✅ **Rule 8:** Small, incremental commits (4 commits)
- ✅ **Rule 9:** Intent-based commit messages
- ✅ **Rule 13:** Simple solutions — multi-stage Dockerfile (standard pattern)
- ✅ **Rule 14:** Reuse patterns — matches web container's multi-stage approach
- ✅ **Rule 15:** No premature abstraction — conservative first pass, explicit follow-up for node_modules pruning
