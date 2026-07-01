# AR-248 — Onboarding + Auth Flow v1

**Status:** Proposal locked 2026-06-08 ("beautiful" — Pedro). Ready to break into implementation tickets.
**Parent epic:** [AR-217](https://podnex.atlassian.net/browse/AR-217) Dashboard redesign
**Phase:** 1 (B3 deliverable + adjacent first-session work)
**Related ADRs:** ADR 0037 (Brand v3 dashboard primitives), [[feedback-design-bar]], [[feedback-code-bar]]

> ⚠️ **Open conflict — resolve before ticketing.** Step 1's intent picker
> uses the old **4-intent** taxonomy (Moving / Business / Investing /
> Research). Shipped `AR-218` validates `users.intent` against the current
> **5-ICP** taxonomy (proptech / lenders / insurance / cre / public-sector).
> Reconcile the picker to the 5-ICP model when this proposal is broken into
> tickets. The rest of the proposal (locked 2026-06-08) still stands.

## Why this exists

`dashboard-proposal.md` mentions `/welcome` in one paragraph as a Phase 1 deliverable. Pedro flagged 2026-06-08 that the onboarding surface should be **exceptional, not minimal** — the first thing every user touches must match the rest of the Brand v3 polish. This doc captures every decision before code is written, so the implementation can be ticketed cleanly.

## 1. Entry funnel

**Single URL: `/get-started`** — one page handles both sign-up and sign-in. Email-first input → if account exists, password field appears; if not, sign-up fields appear. No mode toggle, no separate `/login` vs `/register`.

*Why:* B2B users don't think "am I signing up or signing in" — they think "I'm getting in." Modern auth pattern (Vercel, Linear, Stripe).

**`signup_source` captured via URL param** (`?source=mcp`, `?source=blog/oxford-imd`, `?source=playground`, `?source=marketing`, `?source=direct`). Param sets a cookie on landing, persists through the journey, written to `users.signup_source` on account creation. Default `direct` if no param. (Column shipped AR-218.)

**Email + password ONLY for v1.** No Google/GitHub social sign-in. Deferred to Phase 5 polish.

*Why:* B2B audience uses password managers. Fewer auth surface bugs. Smaller scope for Phase 1.

## 2. Email verification

**Verification is REQUIRED to write data** (generate API key, create portfolio, save query, modify org) but **NOT required to enter the dashboard.** Unverified users land into `/dashboard` Home with a banner: "Verify your email to unlock features."

*Why:* Verify-or-bounce is too aggressive for B2B. Verify-to-write keeps engagement high without compromising security.

**Magic link is the primary verification mechanism.** Single-click. Email contains a button. Fallback option ("send as code") gives a 6-digit OTP for users who hit weird email clients that mangle links.

## 3. The `/welcome` 3 steps

### Step 1 — "What brings you here?" (≤30 sec)

- 4 intent cards: **Moving** / **Business** / **Investing** / **Research**
- One required pick → writes `users.intent` (column shipped AR-218)
- Cards have icon + label + 1-line description:
  - Moving → "Find a great area to relocate to."
  - Business → "Site-select for retail / office / hospitality."
  - Investing → "Build investment portfolios with confidence."
  - Research → "Pull data and signals for analysis."

### Step 2 — "Your workspace" (≤20 sec)

- We've pre-created an org for them: defaults to `[name]'s workspace` if personal email domain, or `[Company]` if business domain (use the domain to infer)
- One editable field: workspace name
- Optional: "+ Invite teammates" (email chips, max 5). Skip = no invites.
- Result: org created, user is `owner`, optional invites queued (email goes out via Resend, generates `/join/$token` URLs)

*Why:* The dashboard-proposal calls out OrgSwitcher as the spine of multi-tenant UX. Bootstrap the first org during /welcome so the rest of the dashboard immediately feels real.

### Step 3 — "See your first signal" (≤45 sec, the AHA moment)

- "Enter a UK postcode you know well" — placeholder `M1 1AE`
- Runs `GET /v1/area?postcode=...` for real
- Shows a single warm-white card with: area name, score chip (RAG), 3 signal mini-rows (deprivation / crime / property), one-line headline ("Strong fundamentals, moderate price growth")
- CTA: "Save to watchlist" (yes/no) → if yes, area gets added to a `default-watchlist` portfolio for them

*Why:* Most onboarding flows ask for setup info. We give them the product's core value in under a minute. By the time they hit the dashboard, they've already used it.

### Skip behavior

**All 3 steps are skippable.** Small "Skip for now" link bottom-right.
- Skipping intent = `intent: 'other'`
- Skipping workspace = use email-based default, no teammates
- Skipping first-signal = land in dashboard with empty state (no pre-loaded watchlist)

## 4. First-session land

**`/dashboard` Home, with an ICP-tailored "Day 0" hero strip at the top.**

The hero strip is one card that:
- Greets by name ("Welcome to OneGoodArea, Pedro.")
- Shows a 4-item getting-started checklist tailored to their `intent`:

| Intent | Checklist |
|---|---|
| **Moving** | ① Look up your top 3 areas → ② Compare them → ③ Save your shortlist → ④ Set monitoring alerts |
| **Business** | ① Look up a candidate site → ② Score it → ③ Bulk-rank with `rank_areas` → ④ Export to your team |
| **Investing** | ① Build your first portfolio → ② Run a lender pack → ③ Set alerts on changes → ④ Forecast a 12-month trend |
| **Research** | ① Run a query → ② Pull peer relative-z → ③ Export to CSV → ④ Generate an API key for your script |

- Each item is a real link to the relevant `/dashboard/*` route
- Card is permanently dismissable; reappears in a collapsed form (one-line nag) until all 4 are done

*Why:* `dashboard-proposal.md` puts the ICP-aware checklist in Phase 5. It belongs in Phase 1 / first-session land — it's the bridge from `/welcome` to "I know what this product does for me."

Below the hero strip, the dashboard Home shows the normal redesigned layout (top strip + 3 cards + activity feed per the dashboard-proposal).

## 5. Returning user sign-in

**Same `/get-started` URL.** Email-first → "We've sent you a sign-in link" (magic link primary) → password fallback ("use password instead" link below). Password sign-in available always, magic link preferred.

**Multi-org users** land into their **most recently active** org (last value of `users.last_active_org_id` — column to add, schema change ticketed separately). OrgSwitcher in sidebar lets them flip. No forced selector at sign-in.

**Stay-signed-in is the default.** Cookie session, 30-day rolling. Sign-out is explicit (user menu).

## 6. Invited team members

**Separate URL: `/join/$invite_token`**

- Token email contains "[Inviter] invited you to [Org]"
- Click → land at `/join/abc123` → if not signed in, prompt to sign in / sign up with the invite email pre-filled
- After sign-in: 1-step splash "You've joined [Org Name]" → CTA "Go to dashboard"
- **Skip `/welcome` entirely** — org exists, intent isn't needed (the org's owner already set the workspace context), first-signal moment isn't useful because there's existing data

*Why:* Invitees are joining an active context. Forcing them through the new-user flow wastes their time and feels mis-targeted.

## 7. Edge cases

| Case | Behavior |
|---|---|
| **Account already exists on sign-up** | After email entry → "Looks like you already have an account. Sign in instead?" with link to swap to password field |
| **Password reset** | Replaced by magic link. "Forgot password?" → magic link → land signed in → optionally update password from `/settings` |
| **GDPR consent** | Single checkbox on sign-up form: "I agree to the [Terms] and [Privacy Policy]." Required. No granular consent on initial form (essential cookies only by default) |
| **Cookie banner** | Essential cookies always on. Banner appears for analytics consent. 1-tap accept or "reject optional" |
| **2FA** | Not in Phase 1. Phase 4 or 5. |
| **Locked-out account** | Magic link to email always works (assuming email access). No "support" flow yet. |

## 8. Elite-feel design details

### Surface treatment

- **`/get-started`**: graphite section with one warm-white centered card (560px max-width), edge-lit material, dot-field motif on the background. **Cinematic.**
- **`/welcome` steps**: same graphite surface, each step is a discrete card transition (slide up 8px + 200ms fade), step counter as 3 hairline dots top-left (current one ink-filled), skip link mono caps bottom-right
- **`/join/$token`**: warm-white card on cream-quiet section, more intimate / less hero
- **Day 0 hero strip on `/dashboard` Home**: warm-white card with edge-lit material + bottom-left warm-grey asymmetric accent (same family signature as StatsCard / FilterBuilder / ChartShell)

### Typography

- Eyebrows mono caps 0.14em ("STEP 1 OF 3")
- Step headlines: Geist sans 24px, -0.02em letter-spacing, weight 500
- Body: 14px, generous line-height (1.65), `--oga-fg-muted`
- Inputs: Geist sans 14px, hairline border, soft-warm hover, focus ink-outline (FormGroup primitives, AR-219)

### Micro-interactions

- Step transitions: 200ms ease, no jank
- Email validation: inline as user types (debounced 400ms), not on blur. Shows a quiet checkmark when valid.
- Submit button states: `idle → loading (spinner inside, label "Creating your workspace…") → success (brief checkmark, then auto-advance)`
- "Resend" button has a 30-second timer cooldown shown as `Resend in 27s`

### Copy voice — B2B-infrastructure-grade

- ❌ "Awesome! Let's get you set up! 🎉"
- ✅ "Pick what brings you here. We'll tailor your first session."
- ❌ "Oops! Something went wrong."
- ✅ "We couldn't reach the API. Retry, or contact support if this persists."

## 9. What this is NOT

- Not a long-form qualifying questionnaire ("How big is your team / annual budget / etc.") — that goes in Stripe billing flow when they upgrade
- Not a tour / product walkthrough — the dashboard explains itself; we don't need a Pendo-style guided tour
- Not gated behind email verification (we let them in unverified, gate features only)

## 10. Primitives consumed

Every surface in this flow uses existing Phase 0 + 0.5 primitives:

| Surface | Primitives |
|---|---|
| `/get-started` form | `<FormGroup>` + `<Input>` + button + `<Toast>` for errors |
| `/welcome` step containers | Graphite surface treatment (matches sidebar / dropdown panels) |
| Step 1 intent picker | Bespoke card grid (4 cards); icons from canonical product-icons + AiqIcon sets — `intent` icons may need new canonical glyphs added (consider 4 new bespoke icons in Tabs-set) |
| Step 2 workspace | `<FormGroup>` + `<Input>` + email chip list (new mini-primitive if needed, or inline) |
| Step 3 first-signal card | `<StatsCard>` + RAG chip pattern (existing `appRag()`) + `<DataTable>` mini for signal rows OR bespoke layout |
| Day 0 hero strip | `<StatsCard>` family recipe + bespoke 4-item checklist (mono caps eyebrow per item) |
| `/join/$token` splash | `<Modal>` size="md" + `<FormGroup>` for sign-in input |
| Verification email | Server-side template (Resend) — separate consideration |

## 11. Schema changes required

- `users.last_active_org_id` (text, nullable) — track the org the user was in for last-session restore. **New column, needs migration ticket.**
- `org_invites` table — if it doesn't already exist for the Levers UI (Phase 3 includes Members invite flow). Check before creating. **Possibly already shipped or queued.**

## 12. Implementation tickets to break out

Each becomes its own child ticket under AR-217 / AR-248:

| Ticket | Scope | Est. |
|---|---|---|
| **AR-248-A** | `/get-started` page — single-entry email-first form, sign-up branch + sign-in branch, signup_source param capture, GDPR consent checkbox | 1d |
| **AR-248-B** | Magic link infrastructure (Resend templates + token generation + verification endpoint + landed-signed-in flow) | 1d |
| **AR-248-C** | `/welcome` page shell — step counter, transitions, skip links, surface treatment | 0.5d |
| **AR-248-D** | `/welcome` step 1 — intent picker (4 cards, write `users.intent`) | 0.5d |
| **AR-248-E** | `/welcome` step 2 — workspace bootstrap (auto-org from email domain, name field, invite chips) | 1d |
| **AR-248-F** | `/welcome` step 3 — first-signal AHA (postcode → `/v1/area` → card with score + signals + save-to-watchlist) | 1d |
| **AR-248-G** | `/dashboard` Home Day 0 hero strip (greeting + ICP-tailored 4-item checklist, dismissable) | 0.5d |
| **AR-248-H** | `/join/$token` invitee flow (token validate + sign-up-or-sign-in with email pre-filled + splash + skip /welcome) | 1d |
| **AR-248-I** | `users.last_active_org_id` column migration + last-active write on org switch + read on sign-in landing | 0.5d |
| **AR-248-J** | Returning sign-in polish (resend timer, magic-link-vs-password toggle, "account exists" detection) | 0.5d |

**Total: ~7.5d of focused engineering** across ~10 PRs. Loop discipline applies to each.

## 13. Sequencing

1. **A → B** (entry + magic link) must land before any /welcome work — they generate the session
2. **C → D → E → F** (welcome shell + 3 steps) can land in order; each is independently testable
3. **G** (Day 0 strip) lands after the /welcome flow exists end-to-end
4. **H** (invitee) is independent; can run in parallel with /welcome work
5. **I** (last-active-org) needed before **J** (returning sign-in)
6. **J** is the polish capstone

## 14. Open questions left for build phase

These don't block ticketing but need answers before the specific ticket starts:

- **Icon set for the 4 intents** — do we add 4 new bespoke icons (Moving / Business / Investing / Research) to the canonical Tabs-set, or use existing AiqIcon glyphs (`buyer` / `operator` / `investor` / `researcher`)? Lean toward AiqIcon reuse.
- **Email domain → company name inference** for Step 2 — use a third-party API (Clearbit etc.) or just strip the domain (e.g. `acme.com` → `Acme`)? Lean toward strip-only for v1.
- **Invite token expiry** — 7 days or never? Lean toward 7 days with regenerate option.
- **Magic link token TTL** — 15 minutes per industry norm? Or 1 hour?
- **Cookie consent vendor** — implement our own micro-banner or use a vendor? Lean toward own (one-tab, no GDPR consultant SaaS).

## 15. Locked decisions (do not re-litigate without explicit Pedro sign-off)

These were debated in the 2026-06-08 brainstorm and locked:

- ✅ Single `/get-started` entry (no separate /login vs /register)
- ✅ Email + password ONLY for v1 (no social sign-in)
- ✅ Magic link primary, password fallback
- ✅ Email verify gates writes, NOT landing
- ✅ 3-step /welcome with first-signal AHA as Step 3 (despite engineering cost of real `/v1/area` call)
- ✅ ICP-tailored getting-started checklist lives in Phase 1 / Day 0 home (not Phase 5)
- ✅ Invitees skip /welcome entirely
- ✅ Magic link replaces "forgot password"
- ✅ B2B-infrastructure-grade copy voice (no emoji, no consumer-cute)
