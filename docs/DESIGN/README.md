# Design

Living documents that drive the visual + narrative design of OneGoodArea's
public surfaces. One folder per epic (currently AR-204 — Brand v3 / Plotted
app-wide reskin + re-narrative).

Design docs differ from ADRs and engineering docs:

- **ADRs** (`docs/DECISIONS/`) record architectural decisions and stay frozen as
  history. Each ADR is a moment in time.
- **Engineering docs** (`docs/ENGINEERING/`) describe how we write code.
- **Design docs** (this folder) are the *living briefs* that drive the page
  redesigns. They carry the locked decisions, the design vocabulary, the
  build order, and a change log appended after every PR. They are updated
  in-flight as the work progresses.

## Documents

| File | What it covers |
|---|---|
| [`AR-204-app-redesign.md`](./AR-204-app-redesign.md) | **The active design brief.** Locked decisions (templates, vocabulary, demo strategy, hygiene rules, signup flow, build order), page-by-page change log, hard rules. Updated after every PR in the AR-204 workstream. |
| [`AR-204-product-pages-spec-pack.md`](./AR-204-product-pages-spec-pack.md) | Deep per-surface spec pack for the 4 product pages (/products/signals · /scores · /monitor · /intelligence). Endpoint signatures + Zod contracts + sample I/O + 5 ICP narratives + demo-widget strategy. Drives the upcoming product-page PRs. |

### Deprecated (historical, preserved for context)

| File | Why deprecated |
|---|---|
| [`DEPRECATED-AR-204-methodology-docs-delta.md`](./DEPRECATED-AR-204-methodology-docs-delta.md) | Historical recon (Mar 2026). Superseded by actual shipped state. |
| [`DEPRECATED-dashboard-proposal.md`](./DEPRECATED-dashboard-proposal.md) | Superseded by the `DASHBOARD/` work log. |
| [`DEPRECATED-AR-248-onboarding-proposal.md`](./DEPRECATED-AR-248-onboarding-proposal.md) | Stale proposal, not linked from anywhere. |

## Related

- [`/CLAUDE.md`](../../CLAUDE.md) — the operating rules every PR honours
- [`docs/DECISIONS/`](../DECISIONS/) — the architectural source of truth design docs cite
- [`docs/ARCHITECTURE/`](../ARCHITECTURE/) — the system-as-built snapshot
- Memory: `~/.claude/projects/.../memory/project_AR-204_redesign.md` — the cold-start anchor for the AR-204 workstream
