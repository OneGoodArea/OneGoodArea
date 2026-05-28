# Code style

Distilled from [`/CLAUDE.md`](../../CLAUDE.md), grouped by intent. CLAUDE.md is the canonical source — this doc cross-references it for readability.

## Interaction model (rules 1-4)

- **Ask first** — "do you want to brainstorm/plan or implement?" Don't assume scope.
- **Never invent missing info** — if requirements, behaviour, architecture, APIs, or intent are unclear, explicitly say so and ask.
- **Challenge ideas** — don't blindly agree. Point out risks, tradeoffs, inconsistencies, simpler alternatives, long-term maintenance issues.
- **Inspect before changing** — read the existing codebase, conventions, and patterns first.

## Tooling priority (rules 5-6)

Use tools in this order:
1. SKILLs
2. MCPs
3. Native platform capabilities
4. Custom implementation

Before writing custom code: check whether an existing tool, abstraction, or capability already solves the problem.

## Git + change management (rules 7-9 + the new JIRA rule)

- **Never modify `main` / `master` directly** — always create a dedicated branch first.
- **If the plan mentions a JIRA key, prefix the branch with it** — e.g. `OGA-123/some-feature`.
- **Every logical change = separate commit** — small, incremental, reviewable. No "fix stuff" or "WIP" bundles.
- **Clear commit messages describing intent** — prefer `Add validation for missing workspace config` over `fix stuff`.

## Safety + reliability (rules 10-12)

- **Never destructive without explicit confirmation** — force-pushes, hard-resets, branch/file deletions, overwriting user work, destructive migrations.
- **Be explicit about uncertainty** — distinguish verified from assumed. Don't present guesses as facts.
- **Don't claim something was tested/verified/completed unless it actually was** — report honestly.

## Engineering philosophy (rules 13-16)

- **Simple, maintainable, minimally invasive solutions** — avoid premature abstraction.
- **Reuse existing patterns and abstractions** before introducing new ones.
- **Avoid unnecessary complexity** + speculative architecture.
- **Optimise for readability, reviewability, long-term maintainability.**

## OneGoodArea conventions (codebase specifics)

- **TypeScript strict** across all workspaces. `noUncheckedIndexedAccess` in `packages/contracts`.
- **Zod for every DTO** — types are inferred from runtime schemas; one source of truth.
- **`.strict()` on every Zod object** — unknown keys are rejected, not silently coerced.
- **No em-dashes in user-facing copy** ([`feedback_design_taste.md`](https://github.com/OneGoodArea/OneGoodArea/blob/main/.claude/memory/feedback_design_taste.md) rule).
- **Never name `Claude` / `Anthropic` / `sonnet` in user-facing surfaces.** Always "the engine" / "our AI" / "OneGoodArea AI".
- **No invented marketing claims** — verify every quota / tier / feature against `apps/api/src/modules/billing/plans.ts` + `apps/api/src/modules/usage` before writing copy.
- **Migrations are idempotent** — `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, predicate-guarded UPDATEs.
- **Tests use `@/` alias for production imports** (plan 006).
- **Tests live in `tests/`, not `src/`** (plan 006).
- **`*.test.ts` files never bundled into production** — esbuild reachability + `.dockerignore` `**/tests`.

## See also

- [`/CLAUDE.md`](../../CLAUDE.md) — canonical source of all rules above
- [`/CONTRIBUTING.md`](../CONTRIBUTING.md) — workflow + PR conventions
- [`TESTING-STRATEGY.md`](./TESTING-STRATEGY.md) — when to add tests + what kind
