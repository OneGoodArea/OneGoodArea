# Golden tests — the scoring engine pattern

The frozen v2 scoring engine has a **snapshot test** that pins the exact `{score, dimensions, confidence}` output for a 4×N matrix of postcodes × intents. Any refactor that changes a single number breaks CI.

## Where it lives

```
apps/api/tests/modules/reports/scoring-engine.golden.test.ts
apps/api/tests/modules/reports/__snapshots__/scoring-engine.golden.test.ts.snap
```

## Why this pattern

The scoring engine is **the product**. Tests of individual scoring functions (in `apps/api/src/modules/reports/scoring-engine/v2.ts`) confirm each one works in isolation, but the snapshot confirms the **integrated output** is byte-stable.

Without this: someone refactors `computeCrimeScore`, the unit test passes (return type unchanged), but the actual numeric output drifts by 0.3 because a rounding step moved. Customers complain three weeks later. With this: CI fails immediately on the snapshot diff.

## When to update the snapshot

**Only when you mean to change the engine output.** Three legitimate triggers:

1. **New methodology version** — v2 → v3 cutover, snapshot updated as part of the same PR. The diff IS the methodology change.
2. **New data source affecting an existing dimension** — adding flood data to risk_factors changes the number. Snapshot updates in the same PR as the source addition.
3. **Bug fix in the engine** — a scoring function was actually wrong; the snapshot was pinning the wrong number. Update with explanation in the PR body.

**Wrong reasons to update:** a refactor changed numbers "by accident" (revert the refactor; the snapshot is correct), or "tests are annoying" (no).

## How to update

```bash
# After confirming the new numbers are correct and intended:
npm test -w @onegoodarea/api -- --run modules/reports/scoring-engine.golden -u
```

The `-u` flag updates snapshots. Review the diff CAREFULLY before committing — every changed number is a customer-visible behavior change.

## Beyond the engine — when else to use snapshots

- **DTO shapes** — when a Zod schema's output structure is part of the public contract, a small snapshot of `.parse(knownInput)` makes drift visible.
- **HTML email templates** — `apps/api/src/infrastructure/email/senders.ts` could snapshot rendered HTML for the verification email. Currently we don't; would be worth adding.
- **CLI output formats** — none today; if we add CLI consumers, snapshot the table format.

**Don't snapshot:**
- Anything with timestamps, random IDs, or other non-deterministic content (or strip them first)
- Internal implementation details (refactor-hostile)
- Things that change often by design

## See also

- ADR 0008 (Scores v3) — why the engine is frozen
- [`TESTING-STRATEGY.md`](./TESTING-STRATEGY.md) — the broader test pattern catalog
