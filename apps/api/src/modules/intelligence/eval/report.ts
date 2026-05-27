/* Eval: markdown report builder (AR-191, ADR 0026).

   PURE. Turns a list of case results into a self-contained markdown
   report: overall accuracy, by-op breakdown, per-case pass/fail with
   the first diff for failures. Output is human-readable + paste-able
   into Jira/Slack/marketing material. */

import type { QueryPlan } from "@onegoodarea/contracts";
import type { PlanComparison } from "./compare";

export interface CaseResult {
  id: string;
  description: string;
  nl_question: string;
  expected_plan: QueryPlan;
  /** The op the case targets (used for the by-op breakdown). */
  expected_op: QueryPlan["op"];
  /** True when the planner returned a valid plan we could compare. */
  planner_ok: boolean;
  /** Planner error code when planner_ok is false. */
  planner_error?: string;
  /** Comparison result when planner_ok. */
  comparison?: PlanComparison;
  /** Raw LLM output for debugging when something went wrong. */
  raw?: string;
}

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  accuracyPct: number;
  byOp: Record<string, { total: number; passed: number; accuracyPct: number }>;
}

export function summarize(results: CaseResult[]): ReportSummary {
  const total = results.length;
  const passed = results.filter((r) => r.planner_ok && r.comparison?.match).length;
  const failed = total - passed;
  const accuracyPct = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;

  const byOp: ReportSummary["byOp"] = {};
  for (const r of results) {
    const op = r.expected_op;
    if (!byOp[op]) byOp[op] = { total: 0, passed: 0, accuracyPct: 0 };
    byOp[op].total += 1;
    if (r.planner_ok && r.comparison?.match) byOp[op].passed += 1;
  }
  for (const op of Object.keys(byOp)) {
    byOp[op].accuracyPct = byOp[op].total > 0 ? Math.round((byOp[op].passed / byOp[op].total) * 1000) / 10 : 0;
  }
  return { total, passed, failed, accuracyPct, byOp };
}

export function renderReport(results: CaseResult[], summary: ReportSummary, opts: { runId?: string } = {}): string {
  const lines: string[] = [];
  lines.push(`# Intelligence eval report${opts.runId ? ` — ${opts.runId}` : ""}`);
  lines.push("");
  lines.push(`**Overall accuracy: ${summary.accuracyPct}%** (${summary.passed}/${summary.total} cases passed)`);
  lines.push("");
  lines.push("## By plan op");
  lines.push("");
  lines.push("| op | passed | total | accuracy |");
  lines.push("|----|-------:|------:|---------:|");
  for (const op of Object.keys(summary.byOp).sort()) {
    const o = summary.byOp[op];
    lines.push(`| ${op} | ${o.passed} | ${o.total} | ${o.accuracyPct}% |`);
  }
  lines.push("");
  lines.push("## Per-case results");
  lines.push("");
  for (const r of results) {
    const status = r.planner_ok && r.comparison?.match ? "✅ PASS" : "❌ FAIL";
    lines.push(`### ${status} — ${r.id} (${r.expected_op})`);
    lines.push(`*${r.description}*`);
    lines.push("");
    lines.push(`> Q: ${r.nl_question}`);
    lines.push("");
    if (!r.planner_ok) {
      lines.push(`**Planner failure**: \`${r.planner_error ?? "unknown"}\``);
      if (r.raw) lines.push(`\nRaw output:\n\`\`\`\n${truncate(r.raw, 800)}\n\`\`\``);
    } else if (r.comparison && !r.comparison.match) {
      const d = r.comparison.diff[0];
      lines.push(`**First diff at \`${d.path}\`**:`);
      lines.push(`- expected: \`${stringify(d.expected)}\``);
      lines.push(`- actual: \`${stringify(d.actual)}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function stringify(v: unknown): string {
  if (v === undefined) return "undefined";
  try { return JSON.stringify(v); } catch { return String(v); }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}... [${s.length - n} chars truncated]`;
}
