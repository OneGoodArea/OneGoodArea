# OneGoodArea documentation

The data and intelligence layer underneath UK property workflows — deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series.

This folder is the navigation hub. Pick the door that matches your role.

## I'm a new developer

1. [`GETTING-STARTED.md`](./GETTING-STARTED.md) — 5-minute orientation: what OneGoodArea is, who it's for, why it exists
2. [`OPERATIONS/LOCAL-SETUP.md`](./OPERATIONS/LOCAL-SETUP.md) — clone, install, run the apps locally
3. [`ARCHITECTURE/SYSTEM-OVERVIEW.md`](./ARCHITECTURE/SYSTEM-OVERVIEW.md) — the full mental model
4. [`ENGINEERING/CODE-STYLE.md`](./ENGINEERING/CODE-STYLE.md) — how we write code
5. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow + PR conventions

## I'm an operator / DevOps

- [`OPERATIONS/`](./OPERATIONS/) — runbooks for everything (local setup · migrations · signal refresh · monitoring · troubleshooting)
- [`ARCHITECTURE/DEPLOYMENTS.md`](./ARCHITECTURE/DEPLOYMENTS.md) — Render + Vercel + Neon topology
- [`CONTAINERS.md`](./CONTAINERS.md) — cross-platform container workflow (Podman/Docker), env split, portable `make container-*` interface
- [`PROD-CONTAINER-CHECKLIST.md`](./PROD-CONTAINER-CHECKLIST.md) — preflight + smoke + rollback before shipping container changes

## I'm a B2B evaluator / integrating the API

- [`API-REFERENCE/`](./API-REFERENCE/) — endpoint catalog by product · authentication · errors · runnable examples
- Live: [`/docs/api-reference`](https://www.onegoodarea.com/docs/api-reference) (Scalar-rendered OpenAPI)
- [`ARCHITECTURE/PRODUCTS.md`](./ARCHITECTURE/PRODUCTS.md) — the four products at a glance

## I want to understand WHY decisions were made

- [`DECISIONS/`](./DECISIONS/) — ADRs by category + timeline
- [`adr/`](./adr/) — the full 35-ADR trail

## I want a searchable index

- [`INDEX.md`](./INDEX.md) — "How do I X?" → which doc to read
- [`GLOSSARY.md`](./GLOSSARY.md) — domain terms (LSOA, NSPL, IMD, percentile, Levers, …)

## Maintenance docs

- [`TESTING/`](./TESTING/) — manual QA test plans + .http test files + bug tracker
- [`ARCHITECTURE/SYSTEM-OVERVIEW.md`](./ARCHITECTURE/SYSTEM-OVERVIEW.md) is the canonical "what shipped" snapshot — keep it accurate as the live system evolves.

## Live

- Site: [onegoodarea.com](https://www.onegoodarea.com)
- API: `https://onegoodarea.onrender.com`
- Repo: [github.com/OneGoodArea/OneGoodArea](https://github.com/OneGoodArea/OneGoodArea)
