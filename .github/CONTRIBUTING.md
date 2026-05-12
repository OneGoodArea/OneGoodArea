# Contributing to OneGoodArea

## Branch naming

- `feat/<short-slug>` for new features
- `fix/<short-slug>` for bug fixes
- `chore/<short-slug>` for maintenance, dependencies, tooling
- `docs/<short-slug>` for documentation-only changes
- `refactor/<short-slug>` for refactors with no behaviour change

Optionally append the Jira ticket: `feat/in-app-billing-AR-145`.

## Commit messages

Use Conventional Commits format for the squash-merge commit (PR title):

- `feat(scope): description`
- `fix(scope): description`
- `chore(scope): description`
- `docs(scope): description`
- `refactor(scope): description`

The PR title becomes the squash commit, so write PR titles in this format.

## Pull requests

All work goes through pull requests. There are no direct commits to `main`.

1. Branch from `main`
2. Make your changes on the branch
3. Open a PR against `main` using the PR template
4. Wait for CI to go green
5. Request review (auto-assigned via CODEOWNERS)
6. Squash-merge with a clean title

Branch protection enforces:

- A pull request is required
- All CI status checks must pass
- Linear history (squash or rebase only, no merge commits)
- No force-push to `main`
- Auto-delete head branches after merge

## Local development

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

Required environment variables: see `.env.example`.

For a fully containerised local environment with a Postgres instance and Mailhog, see `plan/local_test_environemnt_plan.md` and `container-compose.yml`.

## Quality gates

Run before pushing:

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # next build (catches build-time errors)
```

CI runs all four and gates the PR.

## Code style and patterns

- TypeScript strict mode
- Use shared utilities: `generateId` from `@/lib/id`, `logger` from `@/lib/logger`, `withAuth` from `@/lib/with-auth`, constants from `@/lib/config`
- No raw `console.log` or `console.error`. Use `logger`.
- No inline `Date.now() + Math.random()` ID generation. Use `generateId(prefix)`.
- New utilities need tests in `*.test.ts` alongside the source file
- Files over 500 lines should be split into focused modules
- No em dashes (`—`) in user-facing copy. Use commas, periods, colons, or rewrite.
- No "Claude" / "Anthropic" / model names in user-facing copy. The AI is "the engine".
- Cross-check `src/lib/stripe.ts` PLANS before writing any pricing copy

## Issue triage

- `bug` label for bugs
- `enhancement` label for feature requests
- `triage` label is auto-applied to new issues; remove once triaged
- `security` label is reserved for issues opened by maintainers after private disclosure

## Releasing

Release tags follow semver (`v2.0.0`, `v2.0.1`, etc.) and align with engine `METHODOLOGY_VERSION` for major and minor releases.

## Code of conduct

Be direct, be specific, criticise the work not the person. Bring receipts.
