# Portable container for the standalone backend (apps/api, Fastify).
#
# This is the universal deploy artifact: the same image runs on ANY OCI host —
# Render, Google Cloud Run, Koyeb, Fly, or a plain VM — so switching providers
# is zero-rework. Build context is the repo ROOT (monorepo); see .dockerignore.
#
# The server is BUNDLED to a single CJS file with esbuild at build time and run
# with plain `node` (NOT tsx). Running tsx in prod transpiled the whole TS import
# graph on every cold start, which on a small free-tier instance (0.1 CPU/512MB)
# was too slow/heavy to bind a port in time. The prebuilt bundle boots in
# milliseconds with low memory. tsx stays a dependency only for the data-job CLIs
# (migrate / refresh:*) the GitHub Actions cron runs — it is not on the server path.

FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
# Hosts (Render/Cloud Run/Koyeb) inject PORT; 8080 is the default for local runs.
# server.ts already reads process.env.PORT and binds 0.0.0.0.
ENV PORT=8080

# Manifests first (layer caching). Every declared workspace's package.json must
# be present to resolve the workspace tree, hence apps/web's manifest is copied
# even though its source is not (the API does not run it).
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
# `npm install`, not `npm ci`: the lockfile is generated on Windows and is missing
# Linux-only optional deps (e.g. @emnapi/* pulled by Tailwind's native bindings),
# which makes `npm ci` fail the strict in-sync check on the Linux build host.
# `npm install` resolves the platform deps. (Follow-up: a Linux-generated lockfile
# + selective workspace install would let us return to `npm ci` + a smaller image.)
RUN npm install --no-audit --no-fund

# Only the backend + its shared contracts source (NOT apps/web source).
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

# Bundle the server to dist/server.cjs (esbuild is a dependency, so it is present
# even with NODE_ENV=production). Bundling pulls the @onegoodarea/contracts source
# in too, so no workspace resolution is needed at runtime.
RUN npm run build -w @onegoodarea/api

EXPOSE 8080
CMD ["node", "apps/api/dist/server.cjs"]
