# Testing — manual + API resources

This folder holds **human-authored test artifacts** (manual test plans, HTTP test files, known-bug tracker). Automated test code lives in each workspace's `tests/` directory (apps/api, apps/web, packages/contracts) per plan 006.

## Subfolders

| Folder | Contents |
|---|---|
| [`../test-cases/`](../test-cases/) | **Per-surface test cases (the source of truth)** — auth, dashboard, … |
| [`manual/`](./manual/) | Manual QA test plans, browser test scripts, completed-tickets log |
| [`bugs/`](./bugs/) | Known issues + bugs-to-solve tracker |

## How to use

- **Manual QA pass:** start with the per-surface docs in [`../test-cases/`](../test-cases/).
- **Hit an endpoint directly:** the `.http` request collections moved to [`scripts/http/`](../../scripts/http/) (tooling, not docs) — open in VS Code REST Client or `httpyac`.
- **Found a bug:** add to [`bugs/bugs-to-solve.md`](./bugs/bugs-to-solve.md) following the existing entry format.

## What's NOT here

- **Test code** (`*.test.ts`) — lives per-workspace under `apps/api/tests/`, `apps/web/tests/unit/`, `packages/contracts/tests/`.
- **Test reports** (junit XML, JSON, coverage HTML) — written to gitignored `.artifacts/test-reports/` by vitest.
- **Engineering testing strategy** — see [`docs/ENGINEERING/TESTING-STRATEGY.md`](../ENGINEERING/TESTING-STRATEGY.md).
