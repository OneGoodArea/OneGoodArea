/* Eval: plan comparison (AR-191, ADR 0026).

   Compares the planner's emitted plan against an expected_plan for ONE
   golden case. Both plans are Zod-parsed first (which normalizes defaults
   to the canonical shape) and then deeply compared.

   Why Zod-parse first: the planner may emit `{sort: "value_desc"}` OR
   omit it (defaults to "percentile_desc"). Both are valid; either is
   equivalent to the same plan. Normalizing through Zod keeps the
   comparison strict on what matters (which op, which signals, which
   filters) while flexible on what doesn't (which optional defaults the
   model bothered to include).

   PURE: no I/O, no LLM, no DB. Unit-testable. */

import { QueryPlanSchema, type QueryPlan } from "@onegoodarea/contracts";

export interface PlanComparison {
  /** True if the actual plan structurally matches the expected plan. */
  match: boolean;
  /** When match is false: the FIRST mismatching path (dotted) + actual/expected values for the report. Empty when match is true. */
  diff: { path: string; expected: unknown; actual: unknown }[];
}

/** PURE: validate a plan object against QueryPlanSchema. Returns the parsed
    plan (with defaults filled) or null if invalid. */
export function safeParsePlan(plan: unknown): QueryPlan | null {
  const r = QueryPlanSchema.safeParse(plan);
  return r.success ? r.data : null;
}

/** PURE: SUBSET diff — the corpus's expected plan is the MINIMUM required
    shape. Every key in expected must equal the corresponding key in actual;
    actual MAY have extra keys (e.g. the planner emitted an explicit default
    where the corpus stayed silent). This methodology encodes "what the
    planner must commit to" rather than "what defaults it must use."

    Returns the first mismatch (depth-first) so the report can point at the
    precise field. Arrays compare element-wise (length must match). */
export function deepDiff(expected: unknown, actual: unknown, path = ""): { path: string; expected: unknown; actual: unknown }[] {
  if (expected === actual) return [];
  if (expected === null || actual === null || expected === undefined || actual === undefined || typeof expected !== typeof actual) {
    return [{ path: path || "(root)", expected, actual }];
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return [{ path: `${path}.length`, expected: expected.length, actual: actual.length }];
    }
    for (let i = 0; i < expected.length; i++) {
      const d = deepDiff(expected[i], actual[i], `${path}[${i}]`);
      if (d.length > 0) return d;
    }
    return [];
  }
  if (Array.isArray(expected) !== Array.isArray(actual)) {
    return [{ path: path || "(root)", expected, actual }];
  }
  if (typeof expected === "object" && typeof actual === "object") {
    // Subset semantics: every key in expected must match actual's value at
    // that key. Extra keys in actual are tolerated (planner-emitted defaults).
    const ek = Object.keys(expected as Record<string, unknown>);
    for (const k of ek) {
      const ev = (expected as Record<string, unknown>)[k];
      const av = (actual as Record<string, unknown>)[k];
      if (av === undefined) {
        return [{ path: `${path}.${k}`, expected: ev, actual: undefined }];
      }
      const d = deepDiff(ev, av, path ? `${path}.${k}` : k);
      if (d.length > 0) return d;
    }
    return [];
  }
  return [{ path: path || "(root)", expected, actual }];
}

/** PURE: compare an actual plan against an expected plan. Both are
    Zod-parsed first to normalize defaults. Returns a structured
    comparison result for the report. */
export function comparePlans(expected: QueryPlan, actual: QueryPlan): PlanComparison {
  // Normalize both through Zod (idempotent for valid plans; ensures any
  // missing-default-equivalent forms become identical).
  const e = safeParsePlan(expected);
  const a = safeParsePlan(actual);
  if (!e || !a) {
    return { match: false, diff: [{ path: "(plan)", expected: !e ? "INVALID" : expected, actual: !a ? "INVALID" : actual }] };
  }
  const diff = deepDiff(e, a);
  return { match: diff.length === 0, diff };
}
