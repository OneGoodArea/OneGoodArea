# Portable container for the standalone backend (apps/api, Fastify).
#
# This is the universal deploy artifact: the same image runs on ANY OCI host —
# Render, Google Cloud Run, Koyeb, Fly, or a plain VM — so switching providers
# is zero-rework. Build context is the repo ROOT (monorepo); see .dockerignore.
#
# Runs the TypeScript directly via tsx (matches dev; no separate build step, and
# the @onegoodarea/contracts workspace is imported as source). A future
# optimization is a JS bundle + slim runtime (smaller image); deliberately kept
# simple + robust here so the first build is reliable.

FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
# Hosts (Render/Cloud Run/Koyeb) inject PORT; 8080 is the default for local runs.
# server.ts already reads process.env.PORT and binds 0.0.0.0.
ENV PORT=8080

# Manifests first (layer caching). npm ci needs the lockfile + every declared
# workspace's package.json to resolve the workspace tree, hence apps/web's
# manifest is copied even though its source is not (the API doesn't run it).
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
RUN npm ci

# Only the backend + its shared contracts source (NOT apps/web source).
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@onegoodarea/api"]
