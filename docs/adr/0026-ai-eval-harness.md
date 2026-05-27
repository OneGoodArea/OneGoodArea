# ADR 0026 — Intelligence Increment 9: AI eval harness (measured planner accuracy)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0017 (query plane — the planner this harness measures),
  ADR 0019 / 0023 / 0024 / 0025 (the 6 plan ops covered),
  [[product-architecture-mental-model]] (Intelligence surface #6 of 6).

## Context

After Increments 1-8, Intelligence has 5 user-facing surfaces: query
plane (programmatic + NL + compound `rank_areas`), peers, insights,
and forecast. The 6th surface per the product mental model is the
**AI eval harness in CI** — *the elite differentiator* per the
cold-start ("makes the product saleable to regulated buyers because
we can quote an accuracy number").

Regulated buyers (insurers, mid-tier lenders, public sector) don't
trust LLMs without measured accuracy. Saying "our planner is good"
loses; saying "our planner gets X% of curated ICP questions correct,
here's the corpus, here's the methodology" wins. This ADR ships the
mechanism that produces X.

## Decision

### Corpus

`apps/api/src/modules/intelligence/eval/cases.ts`. A small, curated
list of `{id, description, nl_question, expected_plan}` covering
every plan op (rank_areas singular + compound, get_area, score_area,
find_peers, find_insights, find_forecast) — 14 cases at v1. Each
expected_plan validates against `QueryPlanSchema` (corpus sanity
test pins this).

The corpus encodes **what the planner must commit to**, not what
defaults it must use. Optional fields the user didn't specify can
be omitted in expected_plan; the comparison tolerates the planner
filling them with sensible defaults.

### Comparison methodology

`comparePlans(expected, actual)` in `eval/compare.ts`. Both plans
are Zod-parsed through `QueryPlanSchema` first (which normalizes
strict shapes and rejects invalid plans), then a **subset deep-diff**
walks the expected plan and asserts each key matches the
corresponding key in actual. **Extra keys in actual are tolerated**
— the planner is allowed to emit explicit defaults. Arrays match
element-wise (order matters; future improvement: order-independent
match for compound `signals[]`).

Output of `comparePlans`: `{match: boolean, diff: [{path, expected,
actual}]}`. On mismatch we report the FIRST mismatching path
(depth-first), so the report points at the precise field.

### Runner

`runEval(cases, aiProvider)` in `eval/run.ts`. For each case: call the
real planner (via the injectable `AiProvider`) with the NL question
→ parse the emitted plan → compare against `expected_plan` → record
a `CaseResult`. The `AiProvider` is the same seam used by the
production `runQuery` path, so the eval measures **what production
actually does**.

### Report

`renderReport(results, summary)` in `eval/report.ts`. Pure markdown:
overall accuracy %, by-op breakdown table, per-case pass/fail with
the first diff on failures + the raw LLM output on planner errors.
Suitable for paste-into-Jira / Slack / marketing materials.

### CLI

`npm run eval:intelligence -w @onegoodarea/api`. Gated by
`OGA_EVAL_PLAN=true` so CI doesn't burn LLM credits on every push.
Run locally on demand:

```
OGA_EVAL_PLAN=true ANTHROPIC_API_KEY=... \
  npm run eval:intelligence -w @onegoodarea/api
```

Exit code 1 if any case failed (lets CI / cron treat regressions as
gating once we have a scheduled run).

### Baseline (this commit)

First measured accuracy against the live Anthropic provider
(`claude-sonnet-4-20250514`):

> **Overall accuracy: 92.9% (13/14 cases passed)**.
>
> By plan op:
>
> | op             | passed | total | accuracy |
> |----------------|-------:|------:|---------:|
> | find_forecast  |      2 |     2 |     100% |
> | find_insights  |      2 |     2 |     100% |
> | find_peers     |      2 |     2 |     100% |
> | get_area       |      2 |     2 |     100% |
> | score_area     |      2 |     2 |     100% |
> | rank_areas     |      3 |     4 |      75% |

The remaining 1 failure (`rank-compound-affordable-rising-safe`) is
**signal ordering inside a compound `signals[]` array** — the planner
emitted the 4 signals in a different order from the corpus's
expected order. This is a real planner-side variance worth tightening
in a future iteration (either via a planner-prompt instruction or via
order-independent matching in `compare.ts`). For v1, ship the honest
number.

## Consequences

**Positive**

- **Measured accuracy** — Pedro can quote 92.9% in conversations with
  regulated buyers, with a published corpus + methodology to back it.
- **Regression detection** — adding a case for any real customer
  question the planner gets wrong becomes a one-line corpus addition.
- **Symmetric with the rest of the surface** — the harness uses the
  same `AiProvider` + `planFromNl` + `QueryPlanSchema` the production
  `runQuery` uses. The eval measures production, not a mock.
- **CI-safe** — gated behind `OGA_EVAL_PLAN`; tests run via the
  injected stub AiProvider in unit tests, no real LLM calls.
- **6 of 6 Intelligence surfaces complete** after this lands. The
  product mental model is structurally finished.

**Negative / accepted**

- **Plan-level eval only.** The harness measures NL→plan accuracy. It
  does NOT measure NL→plan→**result** correctness end-to-end. A plan
  that passes might still produce surprising results when executed
  (e.g. against a future data state). Execution-level eval is a
  natural follow-up: pin `(case, expected_plan, expected_result_shape)`
  triples; run the plan; assert the result. Out of scope for v1 — it
  requires reference data that's stable across prod refreshes.
- **Order-sensitive matching for compound signals.** The current
  `compare.ts` walks `signals[]` element-wise. Two semantically
  equivalent compound plans that differ only in signal order fail.
  Easy follow-up: an order-independent set-match for `signals[]`
  specifically. Deliberately not in v1 to keep the comparison logic
  simple + the diff messages pointed.
- **No statistical confidence interval.** 92.9% on 14 cases has a wide
  CI (~70-99% at 95% confidence by Wilson interval). Reporting the
  number alone overstates precision. The mitigation: expand the corpus
  over time + report N alongside the accuracy. Marketing copy should
  say "92.9% on a 14-case curated corpus" not "92.9% planner
  accuracy."
- **Manual baseline run.** v1 has no scheduled CI job. The CLI exits
  non-zero on regression so wiring a GH Actions cron (weekly or on
  prompt changes) is straightforward but deferred.
- **Single LLM provider tested.** Anthropic `claude-sonnet-4`. If we
  ever support other providers, the harness measures the seam not
  the model — re-run against the new provider to get its number.
- **Corpus drift risk.** Adding a case that the planner already
  fails (without first fixing the planner) drops the headline number.
  Discipline: treat the corpus as the test pyramid — every case must
  pass at commit time, or it's documented as a known regression with
  a tracked fix.

## Alternatives considered

- **Skip the eval harness entirely.** Rejected — the product mental
  model explicitly names this as the elite differentiator. Without it
  there's no number to quote.
- **Measure NL→result end-to-end instead of NL→plan.** Rejected for
  v1 (see Negative). End-to-end needs stable reference data which
  requires either snapshotted prod or a curated test database. Plan-
  level eval is the cheaper first step + isolates planner correctness
  from data correctness.
- **Score with cosine similarity over plan embeddings.** Rejected —
  unstable, hides specific failures, hard to explain to a buyer.
  Structural match is what a typed contract demands.
- **Run the eval inline in the regular CI test suite (no
  OGA_EVAL_PLAN gate).** Rejected — burns LLM credits per push, makes
  CI flaky (LLM nondeterminism), couples test-suite speed to network.
  Gated CLI is the right cadence; nightly scheduled run is the
  natural next step.
- **Loosen the comparison to "discriminator only" (op match, ignore
  params).** Rejected — would inflate the number without measuring
  what matters. The whole value of a typed plan grammar is that the
  params commit the planner to specific filters / signals / scope.
