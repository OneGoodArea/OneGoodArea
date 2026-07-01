# Dashboard work log — AR-217

This folder is the per-ticket work log for the dashboard redesign Epic [AR-217](https://podnex.atlassian.net/browse/AR-217). Pedro's request 2026-06-05: *"keep a log of each work we do after done. So we have a track."*

**Source spec:** [`docs/DESIGN/dashboard-proposal.md`](../dashboard-proposal.md)
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
| [AR-246](./AR-246_phase_0_5_polish.md) | Phase 0.5 polish | 2026-06-07 (#151) |
| [AR-245](./AR-245_chart_shell.md) | `<ChartShell>` | 2026-06-07 (#148) |
| [AR-244](./AR-244_filter_builder.md) | `<FilterBuilder>` | 2026-06-06 (#147) |
| [AR-243](./AR-243_breadcrumb.md) | `<Breadcrumb>` | 2026-06-06 (#146) |
| [AR-242](./AR-242_pagination.md) | `<Pagination>` | 2026-06-06 (#145) |
| [AR-241](./AR-241_stats_card.md) | `<StatsCard>` | 2026-06-06 (#144) |
| [AR-240](./AR-240_code_block.md) | `<CodeBlock>` | 2026-06-06 (#142) |
| [AR-239](./AR-239_tooltip.md) | `<Tooltip>` | 2026-06-06 (#141) |
| [AR-238](./AR-238_empty_state.md) | `<EmptyState>` | 2026-06-06 (#140) |
| [AR-233](./AR-233_sidebar.md) | `<Sidebar>` | 2026-06-06 (#138) |
| [AR-230](./AR-230_data_table.md) | `<DataTable>` | 2026-06-06 (#137) |
| [AR-228](./AR-228_tabs.md) | `<Tabs>` | 2026-06-06 (#136) |
| [AR-222](./AR-222_toast.md) | `<Toast>` + provider | 2026-06-05 (#135) |
| [AR-221](./AR-221_dropdown_menu.md) | `<DropdownMenu>` | 2026-06-05 (#134) |
| [AR-220](./AR-220_modal.md) | `<Modal>` | 2026-06-05 (#133) |
| [AR-219](./AR-219_form_group.md) | `<FormGroup>` + inputs | 2026-06-05 (#132) |
| [AR-218](./AR-218_user_intent_source_columns.md) | `users.intent` + signup columns | 2026-06-05 (#131) |
