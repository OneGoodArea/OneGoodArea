# Architecture Decision Records

Short, durable records of the load-bearing decisions in the signal-first
restructure (and beyond). Each ADR captures the *context*, the *decision*, and
the *consequences* so future contributors (and future us) understand the *why*,
not just the *what*. See `EXECUTION-PLAYBOOK.md` §4.

Format: one file per decision, `NNNN-short-slug.md`, numbered in order. A
decision is never edited away once superseded; instead a later ADR supersedes it
and both are kept (the trail matters).

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-signal-first-primitive.md) | Signal as the public primitive; thin `/v1/area` over live-fetch first | Accepted |
| [0002](./0002-signal-store-schema.md) | The persisted signal store schema (7 tables, Phase 1) | Accepted |
| [0003](./0003-source-refresh-jobs.md) | Source refresh jobs (reusable store-writer + deprivation first) | Accepted |
| [0004](./0004-store-read-hybrid.md) | Serving from the store (read-through + live fallback + hybrid provenance) | Accepted |
| [0005](./0005-normalization-percentiles.md) | Normalization (in-DB percentiles + normalized values, within-country scope) | Accepted |
