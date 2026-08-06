---
name: typescript-development
description: Use when writing or reviewing TypeScript in the monorepo — coding standards, engineering principles, and container-based verification
---

# TypeScript Development Standards

## Module Boundaries (npm workspaces)
- `apps/web` — Next.js 16 (React 19). Prefer Server Components; add `"use client"` only when interactivity requires it. Never access the DB directly here.
- `apps/api` — Fastify 5. Sole custodian of DB, scoring engine, and external integrations.
- `packages/contracts` — shared types + Zod schemas only. No runtime/DB code. Route schemas here are the single source of truth for both sides.

## Engineering Principles
1. Prefer **composition over inheritance**. Favor small, composable units over deep type hierarchies.
2. Create abstractions **when they make sense** — when they reduce duplication or clarify intent — not for the sake of code optimization.
3. Strict TypeScript. Never use `any` or `@ts-ignore`; type errors are blockers.
4. Runtime validation only via Zod schemas from `@onegoodarea/contracts`; never trust raw input.
5. Keep production code in `src/`, tests in `test/`. Never mix.
6. No comments unless the intent is genuinely unclear; prefer self-documenting code.
7. Small, focused modules; avoid leaky cross-app imports (web must not import api internals).
8. Interfaces MUST be defined in the current design using ZOD schemas

## Verification (MUST run in containers)
Lint and typecheck run inside containers, exactly like tests — see software-testing skill:
```
make app-lint
make app-typecheck
```
Never run `npm run lint` / `npm run typecheck` bare on the host. Fix all findings before declaring done.
