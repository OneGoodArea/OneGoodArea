# Dashboard work log — AR-217

This folder is the per-ticket work log for the dashboard redesign Epic [AR-217](https://podnex.atlassian.net/browse/AR-217). Pedro's request 2026-06-05: *"keep a log of each work we do after done. So we have a track."*

**Source spec:** [`docs/DESIGN/DEPRECATED-dashboard-proposal.md`](../DEPRECATED-dashboard-proposal.md)
**Implementation plan:** [`plan/016_dashboard_redesign_ar217.md`](../../../plan/016_dashboard_redesign_ar217.md)
**Brand v3 design contract:** memory pillar `feedback_design_bar.md`
**Engineering contract:** memory pillar `feedback_code_bar.md`
**Operations loop:** memory pillar `feedback_operations_loop.md`
**Recording discipline:** memory pillar `feedback_recording_discipline.md`

---

## Convention

One markdown file per merged sub-ticket: `AR-XXX_short-slug.md`.

Written **after merge** (not before — the log documents what shipped, not what was planned).

### File template

```markdown
# AR-XXX — &lt;Primitive or feature name&gt;

**Status:** Done
**Merged:** &lt;commit hash&gt; via PR #&lt;num&gt; on &lt;date&gt;
**Phase:** 0 / 1 / 2 / 3 / 4 / 5
**Branch (deleted post-merge):** feat/AR-XXX-slug

## What shipped

&lt;1-3 paragraphs: what the user/consumer can now do that they couldn't before&gt;

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/&lt;component&gt;.tsx` — new
- `apps/web/src/styles/brand/&lt;file&gt;.css` — added &lt;classes&gt;
- &lt;etc&gt;

## Decisions

- &lt;Decision 1: e.g. "Component is generic over `T` to type rows&gt;
- &lt;Decision 2: e.g. "Click outside closes by default; can opt out via prop"&gt;

If a load-bearing decision was made, link to the ADR: `docs/DECISIONS/NNNN-slug.md`.

## Tests

- &lt;Unit tests added: count + behaviors covered&gt;
- &lt;Integration tests: if applicable&gt;
- &lt;All gates green: typecheck + lint + test + build&gt;

## Pedro's localhost approval

- Date: &lt;date&gt;
- Notes: &lt;what Pedro said / any iteration cycles&gt;

## Screenshots

&lt;Optional: link to or embed any screenshots that show the result&gt;

## Follow-ups

- &lt;Any new tickets opened as a result of this work&gt;
- &lt;Any "extract on second use" notes for future ref&gt;
```

### When the log is written

After the PR merges to `main` AND the Jira ticket transitions to Done. Per the operations loop step 9. Same rhythm as memory updates.

### When the log is NOT written

- Pre-merge (still iterating)
- For deferred/cancelled tickets (the Jira comment carries the rationale)
- For trivial work that doesn't have a sub-ticket (e.g. a single typo fix)

## Index

Logs land here as tickets close. Newest first.

| Ticket | Primitive | Merged |
|---|---|---|
| _(none yet)_ | | |
