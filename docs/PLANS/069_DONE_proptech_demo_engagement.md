# 069 PropTech demo engagement — portfolio maintenance + polish

Status: plan (not implemented)

## Purpose

Follow-up to 068 (PropTech showcase module + transactions endpoint, PR #517).
After testing the live demo, four refinements were requested so prospects can
actually use the module instead of looking at static mockups:

1. **Monitor tab = portfolio maintenance.** Replace the static demo rows with
   full CRUD of area codes against the real `/v1/portfolios` API, and let the
   monitoring view (per-area scores, change probe) act on that portfolio.
   "Same user for everyone" — the seeded `user_showcase` shared demo account.
   The demo portfolio is lazy-created on first add and is **capped at 10 areas**
   (client-imposed limit, clearly shown in the UI).
2. **Remove the data-source list** ("Where the numbers come from" footer).
3. **Visible loading state** when a postcode is submitted / score is fetching.
4. **Distinct vibrant styling** — move off the current nested.com cream/ink-green
   look to a deep-indigo + coral palette so the demo is visually distinct from
   OneGoodArea's light blue/gray brand.

## Linked Jira keys

- AR-758 (Story, In Progress) — owns this showcase module. See "Jira" section
  below for how this plan's steps map to tickets.

## Context (what already exists)

- **API** (`apps/api/src/routes/portfolios.ts`, `modules/monitor/portfolio.ts`,
  tables `portfolios` + `portfolio_areas` in `infrastructure/db/schema.ts`):
  `POST/GET /v1/portfolios`, `GET/DELETE /v1/portfolios/:id`,
  `POST /v1/portfolios/:id/areas` (dedup on `(portfolio_id, area)`),
  `POST /v1/portfolios/:id/enrich` (bulk `scoreArea`, returns per-area
  score-or-error), `GET/POST /v1/portfolios/:id/changes` (probe emits nothing).
  All gated by `signalsApiEnabled` (404 when off) + Bearer API key, scoped by
  `user_id`.
- **Shared demo auth already solved**: seed `showcase` creates
  `user_showcase` / `org_user_showcase` / `key_showcase`; every public visitor
  sends the same `SHOWCASE_API_KEY`, so all resolve to one shared account.
- **Web** `apps/web/src/lib/showcase/api.ts` is `import "server-only"` — it must
  NOT be imported by client components. Existing BFF proxies under
  `apps/web/src/app/api/showcase/{score,transactions}` bridge client↔API;
  ScoresTab already calls the score BFF directly with `fetch`.
- **MonitorTab** (`modules/showcase-proptech/MonitorTab.tsx`) is a static stub:
  "Static demo data. Wire this tab to a portfolio endpoint to track real areas."
- **Palette** `modules/showcase-proptech/proptech.css`: `--prx-paper #f6f2e9`,
  ink-green `#14342b`, amber accent `#c5762f`, serif display. OneGoodArea brand
  uses blue accents (`#2563eb`/`#3b82f6`) on light gray — so indigo+coral is
  clearly distinct.
- **Upstream gap (out of scope unless approved)**: the Land Registry SPARQL
  endpoint (`land-registry.ts:135`, `http://`) returns empty bindings over
  `http://` and times out on the real 24-month query — "Recent sales" renders
  nothing for any postcode. Optional step; see Open questions.

## Steps (each = one commit on this branch)

1. **API — remove area from portfolio.** Add `removeArea(userId, portfolioId,
   area)` to `modules/monitor/portfolio.ts` (ownership check +
   `DELETE FROM portfolio_areas WHERE portfolio_id = $ AND area = $` +
   touch `portfolios.updated_at`), a `DELETE /v1/portfolios/:id/areas/:area`
   route in `routes/portfolios.ts` (same `signalsApiEnabled` guard + Bearer,
   response `{ removed: true }` / 404), and the schema in
   `packages/contracts/src/portfolios.ts`. Add Fastify-inject tests. This is
   the missing half of area CRUD. Also commit the pending one-line fix to
   `docs/PLANS/068_DONE_proptech_showcase_module.md` (Status: implemented).
2. **API — Land Registry upstream fix.** In `data-sources/land-registry.ts`
   switch the SPARQL fetch from `http://` to `https://` and raise the 30s
   timeout to 45s (the `http://` endpoint returns empty bindings; the real
   24-month query is slow). Verify inside the api container before moving on.
3. **Web lib + BFF portfolio proxies.** Server-side wrappers in
   `lib/showcase/api.ts` (list/create/get/delete portfolio, add area, remove
   area, enrich) + portfolio types in `lib/showcase/types.ts`. BFF routes under
   `app/api/showcase/portfolios/` (GET list + POST create,
   `[id]` GET + DELETE, `[id]/areas` POST, `[id]/areas/[area]` DELETE,
   `[id]/enrich` POST), mirroring the existing transactions route pattern.
   Areas go through URL-encoded path param.
4. **Monitor tab = portfolio maintenance + monitoring.** Rewrite
   `MonitorTab.tsx` (client, fetch to the BFF like ScoresTab):
   - lazy-create a "Demo portfolio" on first add (shared `user_showcase`);
   - list/select/delete portfolios;
   - add an area via input and via a "Add this postcode" shortcut for the
     currently searched postcode;
   - **enforce a hard cap of 10 areas per portfolio** — show `n/10` progress
     and disable add (with a clear message) at the limit;
   - remove an area;
   - enrich the selected portfolio → per-area score table (this is the
     monitoring); optional "Check changes" via `GET /changes` probe.
   Drop the static `PORTFOLIO`/`CHANGES` arrays and the "Static demo data"
   notice. Update the Monitor tab blurb in `constants.ts`.
5. **Remove data-source footer.** Drop the `prx-lineage` section from
   `SignalsTab.tsx` and the now-unused `LINEAGE` constant.
6. **Loading states.** Add route-level `app/showcase/proptech/loading.tsx`
   (skeleton) so postcode submission (server navigation) shows a loading state;
   replace the ScoresTab text hint with a visible spinner; add busy states to
   MonitorTab mutations.
7. **Vibrant deep-indigo + coral restyle.** Re-token `proptech.css`
   (`--prx-*`): deep indigo background (e.g. `#1b1b2f`/`#232342` family), coral
   accent (e.g. `#ff6b57`), keep scoped under `.prx-root` so it never touches
   the brand/design-v2 sets. Verify contrast on text/rings/bars.
8. **Verify + wrap.** Rebuild web+api test images, run
   `make web-test-container` / `make api-test-container`, run typecheck + lint,
   rebuild the dev-stack images (`make stack-up-min BUILD_FLAG=--build`) and
   smoke-test CRUD on the running stack (including the 10-area cap and LR
   sales). Rename plan → `069_DONE_...`, push, update PR #517.

## Git workflow

- Branch: `feat/AR-758-proptech-showcase` (existing), worktree
  `/.worktrees/AR-758-proptech-showcase` (existing).
- One commit per step above, message prefix `AR-758:` (e.g.
  "AR-758: add portfolio area removal endpoint", "AR-758: wire monitor tab to
  live portfolio CRUD"). Include the pending one-line fix to
  `docs/PLANS/068_DONE_proptech_showcase_module.md` (Status: implemented) in
  step 1's commit.
- Push after step 7 (and after any step if you want PR #517 to update live).
- Plan rename 069 → `069_DONE_proptech_demo_engagement.md` in step 7.

## Jira

AR-758 is a Story (In Progress) with no parent epic and **not yet merged**.
Per decision: **reuse AR-758** as the umbrella for this iteration — no new
tickets — and record the step breakdown as a comment on the story.

## Decisions (confirmed before implementation)

- Land Registry: fold the fix into this plan (step 2) — switch to `https://`
  and raise the timeout to 45s so "Recent sales" can show live data.
- Portfolio start: **lazy-create** the "Demo portfolio" on first add (no
  seed/DB change); hard **cap of 10 areas** per portfolio, enforced client-side
  and made explicit in the UI (`n/10` + disabled add with a message at the cap).
- Jira: reuse AR-758 (see above).

