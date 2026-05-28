# Testing strategy

What we test, how we organise it, when to add what kind.

## Current test counts (post plan 006)

| Workspace | Files | Tests | Notes |
|---|---|---|---|
| `apps/api` | 94 | 868 | Mix of unit (module-level) + integration (HTTP via `app.inject()`) |
| `apps/web` | 26 | 306 + 8 skipped | Unit tests of `src/lib/*` + BFF bridge tests |
| `packages/contracts` | 5 | 57 | Zod schema round-trip pinning |
| **Total** | **125** | **~1240** | All run in <10s combined |

## Where tests live (plan 006)

```
apps/api/tests/
├── setup.ts                    Global MSW setup
├── msw-server.ts               Shared MSW server
├── modules/<area>/*.test.ts    Unit tests next to the module they cover
├── infrastructure/*.test.ts    Same for infrastructure code
└── *.test.ts                   Integration tests at the root (v1-area, v1-score, …)

apps/web/tests/unit/*.test.ts   Flat — all apps/web tests in one folder

packages/contracts/tests/*.test.ts   Flat — Zod round-trip tests
```

Path alias `@/` maps to each workspace's `src/`, so test imports look identical regardless of depth:

```typescript
import { hasAtLeastRole } from "@/modules/orgs";
```

## Patterns

### Unit tests

- **Pure functions** — input/output assertions, no mocks needed
- **DB-touching modules** — mock `sql` from `@/infrastructure/db/client`
- **Module-level integration** — boot a small slice + assert behavior

### Integration tests (apps/api root)

Boot the full Fastify app via `buildApp()` from `@/app`, inject HTTP requests via `app.inject()`. Mock the DB + external services. Verify status codes + response shape + key side effects (trackEvent calls, header stamping).

### Golden tests

The scoring engine has a snapshot test that pins exact outputs for a postcode × intent matrix. Any refactor that changes one number fails CI. See [`GOLDEN-TESTS.md`](./GOLDEN-TESTS.md).

### Zod round-trip

For every public DTO: parse a known-good payload, assert the result matches; parse a known-bad payload, assert it throws. Pins the contract.

## When to add what

| Doing | Add a test? |
|---|---|
| New pure helper | **Yes** — unit test next to the file |
| New `/v1/*` endpoint | **Yes** — integration test at apps/api/tests/v1-*.test.ts |
| New Zod schema | **Yes** — round-trip in packages/contracts/tests/ |
| New scoring dimension or weight change | **Yes** — update the golden snapshot consciously, document why |
| Refactor without behavior change | **No** — but run the suite + golden test to verify nothing drifted |
| New mock provider / fixture | Yes if reused — promote to `tests/helpers/` (deferred — promote when collision happens) |

## CI

`.github/workflows/ci.yml` runs `npm test` + `npm run typecheck` + `npm run lint` + `npm run build` on every PR. All gate green before merge.

## See also

- [`docs/OPERATIONS/LOCAL-SETUP.md`](../OPERATIONS/LOCAL-SETUP.md) — how to run gates locally
- [`GOLDEN-TESTS.md`](./GOLDEN-TESTS.md) — the snapshot pattern
- [`CODE-STYLE.md`](./CODE-STYLE.md) — quality rules
