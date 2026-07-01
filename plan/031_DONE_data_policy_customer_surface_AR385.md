# Plan 031 · Customer-ready data policy surface (AR-385)

**Jira:** [AR-385](https://podnex.atlassian.net/browse/AR-385)
**Driver:** Pedro flagged 2026-06-29 mid-AR-377: "we're protected in terms of data protection correct?" Honest answer was "partially — engineering opt-out exists, customer-facing surface doesn't." This plan closes the gap.

---

## Purpose

Make the AR-375 `api_keys.training_optout` flag genuinely usable by customers. Today the flag exists in code and DB but is settable only via SQL. No customer knows training capture is happening; no customer can turn it off without emailing support.

After this PR:
- A customer creating an API key sees a disclosure modal explaining training-data use
- A customer on `/api-usage` sees a per-key toggle and can flip it
- A prospect can read the full data policy at `/legal/data-policy` before signing up
- The public footer links to the data policy

---

## Decision lock (Pedro, 2026-06-30)

**Opt-OUT default.** New keys participate by default. Disclosure at creation explains it; toggle in /api-usage gives one-click opt-out. Standard B2B SaaS pattern (OpenAI / Anthropic / Stripe). GDPR-defensible under "legitimate interest for service improvement" with the disclosure being clear and accessible.

---

## Non-goals

- Flipping to opt-IN default (separate ticket if/when GDPR audit demands it)
- Building a customer data-export endpoint (separate ticket on customer request)
- Updating ToS / Privacy Policy with the training clause — lawyer task, tracked outside engineering
- Per-org defaults (every key is independent for now)
- Audit log of who flipped what when (could be a follow-on if customers ask)

---

## Design decisions

| # | Decision | Why |
|---|---|---|
| 1 | One PR for all 5 components (API endpoint + BFF + UI toggle + disclosure modal + public page) | Posture only works as a coherent unit. Half-shipped = worse than not shipped. |
| 2 | PATCH `/keys/:id` with body `{training_optout: boolean}` — session-auth, owner-only | Reuses the existing pattern from POST/DELETE `/keys`. No new auth surface. |
| 3 | Public page renders `docs/DATA_POLICY.md` as the source of truth, not a separate copy | One source = no drift. Build-time markdown render into the Next page. |
| 4 | Disclosure modal copy uses neutral B2B-infrastructure-grade tone (no marketing fluff) | Per `feedback_design_bar.md` voice. Customer is a developer making an informed choice. |
| 5 | Footer link reads "Data Policy" not "Privacy Policy" — they're different documents | Privacy Policy = the full lawyer doc (TBD). Data Policy = what we store and how to opt out. Don't conflate. |
| 6 | Toggle UI: live-applied (no save button), with optimistic UI + rollback on error | Standard pattern; one fewer click for the customer. |

---

## Steps

**Dashboard surface (apps/api + apps/web):**

1. **apps/api: PATCH `/keys/:id`.** Authenticated via session. Validates user owns the key. Updates `training_optout` only (no other field). Returns the updated `ApiKeyInfo` shape.
2. **apps/web: BFF proxy at `/api/keys/[id]`.** Forwards PATCH to apps/api via `proxySession`. Thin wrapper, no business logic.
3. **apps/web: extend `ApiKeyInfo` type + `/keys/usage` response to include `training_optout`.** Both ends need the field on read.
4. **apps/web: UI toggle in `/api-usage` per-key row.** Small toggle/switch component aligned with existing rotate/revoke buttons. Tooltip explains "Off = your queries help improve OneGoodArea's AI."
5. **apps/web: disclosure modal at "Create new API key".** Single block of copy before the name field. "By default, this key's queries may be used to improve OneGoodArea's AI. You can toggle this off anytime in /api-usage. Read the full data policy." with a link to `/legal/data-policy`.
6. **apps/web: public `/legal/data-policy` page.** Renders `docs/DATA_POLICY.md` at build time. SEO-indexable. No app-shell, public-page layout.
7. **apps/web: footer link** in the marketing footer (and any auth shells) to `/legal/data-policy`.

**MCP surface (mcp/ + /v1/me):**

8. **apps/api: extend `/v1/me` response to include `training_optout`** (resolved from the calling api_key). MCP server reads this on startup.
9. **mcp/: README "Data Policy" section at the top.** Plain-English: what's captured, how to toggle, where the policy lives. Read at install time.
10. **mcp/: stderr log on boot with current capture state.** Format: `[oga-mcp] Training capture: ON for this key. Toggle at https://www.onegoodarea.com/api-usage` (or OFF). Sourced from the existing `/v1/me` startup ping.
11. **mcp/: version bump 1.0.1 → 1.0.2** + npm republish. Pedro's hands (npm 2FA).

**Tests:**

12. **apps/api PATCH endpoint tests** (success, 401 unauth, 403 not-owner, 400 invalid body).
13. **mcp/ classifier or startup log unit test** (verifies the log line shape).

---

## Acceptance

- Customer with session auth can PATCH their own key's `training_optout` and see it reflected on next page load.
- `/api-usage` shows the current value per key, toggle works live.
- Clicking "Create new API key" shows the disclosure modal with the data policy link.
- `https://www.onegoodarea.com/legal/data-policy` renders the policy cleanly, robots-indexable.
- Footer link is visible on at least the marketing home and the auth shell.
- A customer can complete the full opt-out flow without contacting support.

---

## Risk + reversibility

- Risk: vanishingly low. Additive UI + one new endpoint + new public page. No schema change.
- Rollback: revert the PR. The `training_optout` column stays in the DB (we want it). Existing 7 keys keep their value.
- Once shipped, the customer-facing claim "you can opt out anytime" is genuinely true. No more support email loop.

---

## Step status

- [x] Step 1 — apps/api PATCH /keys/:id
- [x] Step 2 — apps/web BFF proxy
- [x] Step 3 — extend ApiKeyInfo type + GET responses
- [x] Step 4 — UI toggle in /api-usage (optimistic UI + rollback)
- [x] Step 5 — disclosure modal at creation
- [x] Step 6 — public /legal/data-policy page (renders docs/DATA_POLICY.md)
- [x] Step 7 — footer link
- [x] Step 8 — /v1/me response includes training_optout
- [x] Step 9 — mcp/ README Data Policy section
- [x] Step 10 — mcp/ stderr log on boot with capture state
- [ ] Step 11 — mcp/ 1.0.2 republish (Pedro's hands, post-merge)
- [x] Step 12 — apps/api PATCH endpoint tests (6 new, all pass)
- [-] Step 13 — mcp/ startup log unit test (skipped — trivial logic, no existing mcp test scaffold beyond methodology-for; not worth scaffolding for this)
