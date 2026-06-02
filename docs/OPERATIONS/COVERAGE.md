# Code Coverage

Coverage is measured per package using [Vitest](https://vitest.dev/) with the V8 provider.
Reports are written to `.artifacts/` (gitignored — local only).

---

## Running coverage

| Command | Scope |
|---|---|
| `make coverage` | All packages — api, web, contracts |
| `make coverage-api` | `apps/api` only |
| `make coverage-web` | `apps/web` only |
| `make coverage-contracts` | `packages/contracts` only |

You can also run directly with npm:

```sh
npm run test:coverage --workspaces --if-present   # all
npm run test:coverage -w @onegoodarea/api          # api only
npm run test:coverage -w @onegoodarea/web          # web only
npm run test:coverage -w @onegoodarea/contracts    # contracts only
```

---

## Report locations

After a run, HTML reports land here (relative to repo root):

```
.artifacts/test-reports/coverage/
  api/index.html
  web/index.html
  contracts/index.html
```

Open in a browser:

```sh
# macOS
open .artifacts/test-reports/coverage/api/index.html

# Linux
xdg-open .artifacts/test-reports/coverage/api/index.html
```

---

## Thresholds

Builds fail if coverage drops below these minimums:

| Package | Lines | Functions | Branches | Statements |
|---|---|---|---|---|
| `apps/api` | 70% | 70% | 60% | 70% |
| `apps/web` | 70% | 70% | 60% | 70% |
| `packages/contracts` | 90% | 90% | 80% | 90% |

`reportOnFailure: true` is set on all packages — the HTML report is generated even when a threshold is missed, so you can see exactly what is uncovered.

Contracts has higher thresholds because it is pure Zod schema definitions; nearly all paths are exercised by the existing tests.

---

## Raising thresholds

Once a module is well tested, update the `thresholds` block in the relevant `vitest.config.ts` and commit. Keep changes incremental — raise one metric at a time per sprint to avoid large ratchet jumps.

---

## CI

Coverage reports are not yet uploaded to a remote service. That is a follow-on task once the CI pipeline is in place. For now, reports are local only.
