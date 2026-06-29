# Plan 030 · Kill the /widget surface (AR-379)

**Jira:** [AR-379](https://podnex.atlassian.net/browse/AR-379)
**Driver:** Pedro flagged mid-AR-378 that the widget is "fully old stuff, not mentioned anywhere." Decision: kill it now; if we want an embeddable surface in the future, rebuild greenfield on the v2 signal-first stack.

---

## Purpose

Remove the only remaining piece of v1-era "reports" infrastructure still pretending to be alive. AR-324 killed every writer to `area_cache` 10 PRs ago; the reader (`/widget`) returns 404 for every query in prod (verified). Time to delete the corpse so future contributors don't trip over it.

---

## Why this is safe

| Check | Status |
|---|---|
| Live writer to `area_cache`? | ❌ None (AR-324 removed all callers of `setCachedAreaResult`) |
| Live reader still working? | ✅ `/widget` returns 404 for every query in prod (verified via curl on `M1 1AE`, `SW1A 1AA`) |
| Embedded anywhere on marketing? | No — no `<iframe>` references, no `/docs/widget` page, no JS snippet in the brand v3 site |
| Listed in OpenAPI spec? | Yes — needs to be removed |
| Mentioned in customer-facing docs? | No customer-facing copy. Only internal design specs + ADRs |
| Mentioned in security policy? | One mention in `.github/SECURITY.md` (CORS surface) — needs removal |

If a customer has been polling `/widget`, the only signal they'd have today is HTTP 404. Post-deletion: HTTP 404. **Zero behavior change for the only externally observable surface.**

---

## Non-goals

- Rebuilding any embeddable widget. That's a clean greenfield ticket whenever business need is real.
- Touching the v2 score endpoint or signal store. Widget is its own zombie surface.
- Migrating any data out of `area_cache`. Nothing in there is worth preserving — all rows are pre-AR-324 reports at unknown engine versions (the AR-378 pin made them all unreachable anyway).

---

## Design decisions (made — defer to Pedro on anything wrong)

| # | Decision | Why |
|---|---|---|
| 1 | Drop the route entirely. NOT a 410 Gone stub. | Stubs accumulate. There's no incoming traffic to redirect or honor — 404 vs 410 makes no difference to the zero callers. The cleanest delete. |
| 2 | DROP TABLE area_cache via the migrator. Idempotent (`DROP TABLE IF EXISTS`). | Schema cleanup pairs with code cleanup. Future migrator runs are no-ops. |
| 3 | Delete `modules/cache/area-cache.ts` and its tests entirely. Don't move to a `legacy/` folder. | Dead code in a "legacy/" folder is still dead code that confuses contributors. Just remove. |
| 4 | Delete `widgetCorsHeaders` from `apps/api/src/shared/http.ts`. | Only used by the dying route. |
| 5 | Leave `validateLocationInput` + `validateIntent` alone for now. | They're used by other places (need to confirm in Step 1 detail). Even if widget was the only caller of `validateIntent`, removing it expands scope — separate cleanup ticket if so. |
| 6 | Update `.github/SECURITY.md`, `docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`, `scripts/api-test-suite.sh`, `apps/web/public/openapi.json` (if hand-edited) to remove widget references. | Stale docs are worse than missing docs. |
| 7 | Don't rewrite history in ADRs. Add a one-line "Deprecated 2026-06-29 (AR-379) — see plan/030" note at the top of any ADR that referenced the widget as design intent. | ADRs are historical records. They shouldn't lie about what was once true. |
| 8 | NL note in `docs/DATA_POLICY.md`? Not needed — widget never captured any data, so policy doesn't mention it. | One less doc to touch. |

---

## Steps (high level — each detailed in interactive sessions)

1. **Survey + finalize delete-list.** Run the full grep, classify every match (code / doc / test / config), produce a final inventory in this file before any code lands. Catches stragglers like `apps/web/src/lib/config.ts` that I noticed in the initial survey.
2. **Drop the apps/api code.** `signals.ts` (route blocks), `area-cache.ts` (whole file), `area-cache.test.ts` (whole file), `widgetCorsHeaders` from `http.ts`.
3. **Drop the DB schema.** Append a new migration block to `schema.ts`: `DROP TABLE IF EXISTS area_cache`. Update the migrator idempotency test allowlist if needed (`IF EXISTS` already passes the current regex, so probably no test change).
4. **Drop the docs + config references.** OpenAPI spec, ENDPOINTS-BY-PRODUCT, API test script, SECURITY.md, any apps/web config keys.
5. **Add deprecation notes to ADRs that referenced the widget.** One-line each.
6. **Smoke check.** Local `npm run dev -w @onegoodarea/api` boots clean. `curl /widget` returns 404 (Fastify's default Not Found, no longer "Missing postcode parameter").
7. **Plan rename.** Move `plan/030_kill_widget_AR379.md` → `plan/030_DONE_kill_widget_AR379.md` once shipped.

---

## Acceptance

- `curl https://onegoodarea.onrender.com/widget?postcode=M1+1AE` returns Fastify's 404 (not the old "Missing postcode parameter" 400). Proves the route is unwired, not just empty.
- `apps/api` typechecks + tests pass. The cache test file is gone, so the suite shrinks by ~8 tests — that's expected and the count line in CI output will drop.
- `\d area_cache` in psql against prod returns "no such table" after Render redeploys.
- No grep hit for `widget` in `apps/api/src/**` or `apps/api/tests/**`.
- ADR + ENDPOINTS-BY-PRODUCT mentions either gone or annotated with "deprecated AR-379."

---

## Risk + reversibility

- **Risk:** vanishingly low. Zero live writers, zero embedders, /widget already 404s in prod.
- **Rollback:** revert the PR. The DROP TABLE migration is `IF EXISTS` so re-creating the table requires re-adding the CREATE TABLE block — a small annoyance, not a danger. Cache contents aren't backed up because they have no value.
- **Future widget:** when/if business need surfaces, that ticket starts from a clean slate. New embeddable iframe on v2 signal endpoints, no reports nomenclature, real write-back from real scoring, proper docs. Not this ticket.

---

## Step status

- [x] Step 1 — survey + finalize delete-list
- [x] Step 2 — drop apps/api code (/widget routes, area-cache.ts module, area-cache.test.ts, widgetCorsHeaders, widget rate-limit, signals.test.ts widget describes, unused imports)
- [x] Step 3 — drop DB schema (replaced CREATE block with idempotent `DROP TABLE IF EXISTS area_cache`)
- [x] Step 4 — drop docs + config references (apps/web rate-limit, openapi.json, openapi.test.ts, widget.js asset, orphan playground.tsx, marketing copy on 3 layout/page files)
- [x] Step 5 — annotated live-facing docs (ENDPOINTS-BY-PRODUCT, SYSTEM-OVERVIEW, SECURITY.md, scripts/api-test-suite.sh + README). ADRs + DESIGN docs left as-is (historical records, per decision #7)
- [ ] Step 6 — smoke check (post-merge: `curl /widget` should return Fastify's default 404, not "Missing postcode parameter" 400)
- [ ] Step 7 — plan rename to _DONE_ after merge
