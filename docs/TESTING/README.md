# Testing — manual + API resources

This folder holds **human-authored test artifacts** (manual test plans, HTTP test files, known-bug tracker). Automated test code lives in each workspace's `tests/` directory (apps/api, apps/web, packages/contracts) per plan 006.

## Subfolders

| Folder | Contents |
|---|---|
| [`manual/`](./manual/) | Manual QA test plans, browser test scripts, the test-pathways breakdown, automated-vs-manual classification (TESTS-README), completed-tickets log |
| [`http/`](./http/) | `.http` files for API testing via REST Client / httpyac (api keys + curl-equivalent payloads) |
| [`bugs/`](./bugs/) | Known issues + bugs-to-solve tracker |

## How to use

- **Manual QA pass:** start with [`manual/TESTS-README.md`](./manual/TESTS-README.md) for the strategy + split between automated and manual coverage.
- **Hit an endpoint directly:** open one of the `.http` files in [`http/`](./http/) inside VS Code with the REST Client extension (or `httpyac` CLI).
- **Found a bug:** add to [`bugs/bugs-to-solve.md`](./bugs/bugs-to-solve.md) following the existing entry format.

## What's NOT here

- **Test code** (`*.test.ts`) — lives per-workspace under `apps/api/tests/`, `apps/web/tests/unit/`, `packages/contracts/tests/`.
- **Test reports** (junit XML, JSON, coverage HTML) — written to gitignored `.artifacts/test-reports/` by vitest.
- **Engineering testing strategy** — see [`docs/ENGINEERING/TESTING-STRATEGY.md`](../ENGINEERING/TESTING-STRATEGY.md).
