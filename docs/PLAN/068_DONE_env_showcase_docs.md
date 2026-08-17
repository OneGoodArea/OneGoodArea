# Plan 068: Document showcase API key vars in per-app .env.example files

## Purpose
Showcase API key vars (`SEED_SHOWCASE_API_KEY`, `SHOWCASE_API_KEY`) were only documented in `compose/.env`. Add them to all 6 per-app `.env.example` files (local/dev/prod × api/web) so local and production environments stay in sync.

## Jira
- **Story:** AR-426 (Showcase apps)
- **Task:** AR-687

## Steps

### Step 1: Add SEED_SHOWCASE_API_KEY to api .env.example files
Files: `env/local/api.env.example`, `env/dev/api.env.example`, `env/prod/api.env.example`

### Step 2: Add SHOWCASE_API_KEY to web .env.example files
Files: `env/local/web.env.example`, `env/dev/web.env.example`, `env/prod/web.env.example`

## Git Workflow
- Branch: `feat/AR-687-env-showcase-docs` from `main`
- Worktree: `.worktrees/AR-687-env-showcase-docs`
- Single commit, single PR

## Verification
- Lint/typecheck: no code changes, but run to confirm no breakage
- Verify all 6 files have the new vars documented
