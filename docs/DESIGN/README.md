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
| [`AR-204-app-redesign.md`](./AR-204-app-redesign.md) | **The active design brief.** Locked decisions (templates, vocabulary, demo strategy, hygiene rules, signup flow, build order), hard rules, change log. Updated after every PR in the AR-204 workstream. |
| [`AR-204-product-pages-spec-pack.md`](./AR-204-product-pages-spec-pack.md) | **Index** for the product-page specs — cross-surface summary, ICP→surface lead map, build order. Links to the 4 per-surface files below. |
| [`spec-signals.md`](./spec-signals.md) · [`spec-scores.md`](./spec-scores.md) · [`spec-monitor.md`](./spec-monitor.md) · [`spec-intelligence.md`](./spec-intelligence.md) | Per-surface specs — endpoint signatures + Zod contracts + sample I/O + compound grammar + gotchas. |
| [`dashboard-proposal.md`](./dashboard-proposal.md) | **Source spec** for the authenticated dashboard epic (AR-217): sign-up→arrival flow, org switcher, Levers UI, product playgrounds, ICP onboarding. Phase 0 primitives shipped (see `DASHBOARD/`); phases 1–5 not yet built. |
| [`AR-248-onboarding-proposal.md`](./AR-248-onboarding-proposal.md) | Locked onboarding + auth-flow proposal under AR-217. ⚠️ Carries an unresolved intent-taxonomy conflict (see the note at its top) to settle at implementation time. |
| [`DASHBOARD/`](./DASHBOARD/) | Per-component work logs for the AR-217 dashboard primitives (AR-218…AR-246). See [`DASHBOARD/README.md`](./DASHBOARD/README.md). |

Retired design docs live in [`../ARCHIVE/`](../ARCHIVE/).

## Related

- [`/CLAUDE.md`](../../CLAUDE.md) — the operating rules every PR honours
- [`docs/DECISIONS/`](../DECISIONS/) — the architectural source of truth design docs cite
- [`docs/ARCHITECTURE/`](../ARCHITECTURE/) — the system-as-built snapshot
- Memory: `~/.claude/projects/.../memory/project_AR-204_redesign.md` — the cold-start anchor for the AR-204 workstream
