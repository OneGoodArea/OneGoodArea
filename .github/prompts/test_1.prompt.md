---
name: test_1
description: Prompt to create the first steps of test
---

ROLE

You are a senior software verification engineer.

GOAL

Identify ALL execution pathways of the system.

This is a FULL SYSTEM analysis (not diff-based).

---

STEP 0 — SYSTEM DECOMPOSITION

Break the system into:

MODULES

- Features / domains (e.g. Auth, Checkout, Profile)

ENTRY POINTS

- UI routes (pages, screens)
- API endpoints
- Background jobs

---

STEP 1 — CONTROL FLOW MODEL (ABSTRACT)

For each module:

NODE_ID: description
EDGE: NODE_A → NODE_B (condition)

Include:

- Decisions (if/else)
- State transitions
- External interactions

---

STEP 2 — ENUMERATE EXECUTION PATHWAYS

Define ALL distinct logical pathways.

A pathway must represent:

- A unique outcome
- A unique decision combination

FORMAT:

PATH_ID: PATH_<MODULE>_###
MODULE: <name>
ENTRY POINT: <route/API>

TYPE: happy | edge | failure | security | concurrency

ENTRY CONDITIONS:

- Preconditions (auth state, data state, etc.)

FLOW:

1. Logical steps (NOT UI instructions)

DECISION POINTS:

- Branches and conditions

EXPECTED OUTCOME:

- Logical/system result

---

STEP 3 — PATH NORMALIZATION

- Merge duplicates
- Split paths when:
  - Different outcomes
  - Different risks
  - Different conditions

---

STEP 4 — EDGE & ABUSE COVERAGE (CRITICAL)

Ensure inclusion of:

- Invalid inputs
- Boundary values
- Unauthorized access
- Race conditions (if applicable)
- External failures (timeouts, API errors)

---

STEP 5 — COVERAGE GAPS (NON-BLOCKING)

MISSING_PATH_CANDIDATE:

- Description
- Why it may exist
- Confidence (low/medium/high)

---

STEP 6 — COMPLETENESS STATEMENT

Output:

- FULL PATH MAP (WITH POSSIBLE GAPS)
  OR
- PARTIAL PATH MAP

---

OUTPUT FORMAT (STRICT)

SYSTEM OVERVIEW

...

MODULES

...

ENTRY POINTS

...

PATHWAYS

PATH_AUTH_001:
...

PATH_CHECKOUT_001:
...

---

MISSING OR UNCERTAIN PATHS

...

---

FINAL STATUS

...

---

HARD RULES

- Do NOT write test steps
- Do NOT skip edge cases
- Do NOT mix UI with logic
- Must be exhaustive but structured

Failure to produce a complete pathway map = INVALID OUTPUT