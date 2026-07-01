# Index — "How do I X?"

Phrase-search map. Find your question on the left; the doc on the right has the answer.

## Setup + local dev

| Question | Doc |
|---|---|
| How do I develop locally? | [`OPERATIONS/LOCAL-SETUP.md`](../OPERATIONS/LOCAL-SETUP.md) |
| What env vars do I need? | [`OPERATIONS/LOCAL-SETUP.md`](../OPERATIONS/LOCAL-SETUP.md) |
| How do I run the gates (test/typecheck/lint)? | [`OPERATIONS/LOCAL-SETUP.md`](../OPERATIONS/LOCAL-SETUP.md) |
| How do I run a migration? | [`OPERATIONS/DATABASE-MIGRATIONS.md`](../OPERATIONS/DATABASE-MIGRATIONS.md) |
| How do I refresh signal data? | [`OPERATIONS/SIGNAL-REFRESH.md`](../OPERATIONS/SIGNAL-REFRESH.md) |
| How do I run the AI eval harness? | [`ARCHITECTURE/QUERY-PLANE.md`](../ARCHITECTURE/QUERY-PLANE.md) AI eval harness |

## Architecture + understanding the system

| Question | Doc |
|---|---|
| What are the four products? | [`ARCHITECTURE/PRODUCTS.md`](../ARCHITECTURE/PRODUCTS.md) |
| What's the signal store schema? | [`ARCHITECTURE/DATA-LAYER.md`](../ARCHITECTURE/DATA-LAYER.md) |
| How does the query planner work? | [`ARCHITECTURE/QUERY-PLANE.md`](../ARCHITECTURE/QUERY-PLANE.md) |
| Where's the deploy topology? | [`ARCHITECTURE/DEPLOYMENTS.md`](../ARCHITECTURE/DEPLOYMENTS.md) |
| What's the whole system at a glance? | [`ARCHITECTURE/SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) |
| What's Levers? | [`GLOSSARY.md`](./GLOSSARY.md) + ADRs 0027-0034 |

## API + integration

| Question | Doc |
|---|---|
| What endpoints exist? | [`API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`](../API-REFERENCE/ENDPOINTS-BY-PRODUCT.md) |
| How do I authenticate? | [`API-REFERENCE/AUTHENTICATION.md`](../API-REFERENCE/AUTHENTICATION.md) |
| What error codes can I program against? | [`API-REFERENCE/ERRORS.md`](../API-REFERENCE/ERRORS.md) |
| Show me a curl example | [`API-REFERENCE/EXAMPLES.md`](../API-REFERENCE/EXAMPLES.md) |
| What's the live OpenAPI spec URL? | [/openapi.json](https://www.onegoodarea.com/openapi.json) |
| Where's the interactive API reference? | [/docs/api-reference](https://www.onegoodarea.com/docs/api-reference) |

## Code + contribution

| Question | Doc |
|---|---|
| What's our code style? | [`/CLAUDE.md`](../../CLAUDE.md) |
| What's the commit message format? | [`/CLAUDE.md`](../../CLAUDE.md) |
| How do I name a branch? | [`/CLAUDE.md`](../../CLAUDE.md) |
| When do I add a test, what kind? | [`ENGINEERING/TESTING-STRATEGY.md`](../ENGINEERING/TESTING-STRATEGY.md) |
| When do I update the scoring golden? | [`ENGINEERING/GOLDEN-TESTS.md`](../ENGINEERING/GOLDEN-TESTS.md) |
| Where are the engineering rules? | [`/CLAUDE.md`](../../CLAUDE.md) (canonical) |

## Operating + debugging

| Question | Doc |
|---|---|
| Is the API healthy? | [`OPERATIONS/MONITORING.md`](../OPERATIONS/MONITORING.md) |
| Why is signal refresh hanging? | [`OPERATIONS/TROUBLESHOOTING.md`](../OPERATIONS/TROUBLESHOOTING.md) |
| Why is the API returning 401/403? | [`OPERATIONS/TROUBLESHOOTING.md`](../OPERATIONS/TROUBLESHOOTING.md) |
| Why does Vercel show old content? | [`OPERATIONS/TROUBLESHOOTING.md`](../OPERATIONS/TROUBLESHOOTING.md) |
| Where do I find performance numbers? | [`ENGINEERING/PERFORMANCE.md`](../ENGINEERING/PERFORMANCE.md) |

## Decisions + history

| Question | Doc |
|---|---|
| Why did we build it this way? | [`DECISIONS/README.md`](../DECISIONS/README.md) (by category) |
| Show me the major decisions in chronological order | [`DECISIONS/DECISION-LOG.md`](../DECISIONS/DECISION-LOG.md) |
| Where's the ADR for X? | [`DECISIONS/`](../DECISIONS/) — search by number or topic |

## Testing + QA

| Question | Doc |
|---|---|
| What manual test plans exist? | [`TESTING/manual/`](../TESTING/manual/) |
| Where are the .http files? | [`scripts/http/`](../../scripts/http/) |
| Where are known bugs tracked? | [`TESTING/bugs/`](../TESTING/bugs/) |

## Design (visual + narrative)

| Question | Doc |
|---|---|
| What's the active design brief? | [`DESIGN/AR-204-app-redesign.md`](../DESIGN/AR-204-app-redesign.md) |
| Where are AR-204 locked decisions? | [`DESIGN/AR-204-app-redesign.md`](../DESIGN/AR-204-app-redesign.md) section 6-section 11 |
| What's the methodology / docs reskin context? | [`ARCHIVE/DEPRECATED-AR-204-methodology-docs-delta.md`](../ARCHIVE/DEPRECATED-AR-204-methodology-docs-delta.md) (historical) |
| What's the product-pages spec pack? | [`DESIGN/AR-204-product-pages-spec-pack.md`](../DESIGN/AR-204-product-pages-spec-pack.md) |

## See also

- [`GLOSSARY.md`](./GLOSSARY.md) — what's a term mean?
- [`README.md`](./README.md) — audience-based door (developer / operator / B2B / decision-history)
