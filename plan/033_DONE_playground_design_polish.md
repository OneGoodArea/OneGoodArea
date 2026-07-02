# Plan 033 — /playground redesign (Archetype A: Stripe/Vercel API-docs)

**Status:** SHIPPED 2026-07-02
**JIRA:** AR-437 (Done)
**Owner:** Pedro / Claude

## What shipped

Full rewrite of /playground into the Stripe/Vercel API-docs archetype:

- **Elevated card layout.** Centered max-1440px card floating on a tinted
  background. Site nav on top; no competing horizontal strips. Corner
  radius matches the button token (`--oga-radius-md`) for design
  coherence with the rest of Brand v3.
- **Product-grouped sidebar.** Signals (Area, Rank), Scores (Score),
  Intelligence (Peers, Insights, Forecast, NL Query), Monitor
  (Portfolios preview). Reinforces the four-product story used on the
  marketing site.
- **Docs + runner split.** Each endpoint gets a per-tab docs pane with
  method+path eyebrow, capability-led ICP line (declarative voice, not
  "Use this to..."), parameters table, response schema, error codes,
  and a rate-limit callout. Runner pane keeps the wired forms + chips
  + copy-as-curl from AR-411..414.
- **Monitor preview.** Portfolios group shows a static docs+sample-
  response block since `/v1/portfolios/*` isn't safe in an anonymous
  playground. Explains the product surface + shape without opening a
  mutation window on unauthenticated visitors.
- **JSON viewer.** `react-json-view-lite` with a Brand v3 skin (mono
  font, type-coloured values, path-copy hover).
- **CTA hierarchy overhauled.**
  - Soft in-context CTA under successful responses:
    *"This is what your code would receive. Take it live with a free
    sandbox key →"*
  - `NudgeStrip` escalates by call count (5 / 15 / 25 tiers).
  - Monitor CTA rewritten to explain the actual gate:
    *"Portfolios need an authenticated org. Sign up (free) to create
    one and hit these endpoints live."*
  - Bottom `SignupCta` split into two-column self-selection: builders
    vs teams. Builders → sandbox + docs. Teams → 5 ICP pills
    (Lenders / Insurance / PropTech / CRE / Public sector) +
    methodology link.
- **Voice sweep.** ICP framings rewritten from "Use this to..." to a
  declarative editorial voice. All em-dashes scrubbed from the
  playground folder per the HARD RULE.

## Deferred (follow-up tickets when wanted)

- Language snippets (curl / TypeScript / Python tabs above the runner
  form). Nice-to-have; not blocking.
- URL routing per endpoint (`/playground/area`, `/playground/score`,
  etc). Currently in-page state only; deep links don't work.
- Deeper responsive audit on the runner forms at narrow widths.
- CTA swap on marketing pages ("Get started" → "Try it") pointing at
  /playground. Sits behind this shipping cleanly; separate ticket.

## Sandbox naming note

"Sandbox key" language appears throughout the playground CTAs. Pricing
structure isn't locked; the word may not survive the pricing pass. When
pricing lands, revisit the copy in:

- `client.tsx` — bottom `SignupCta`, `NudgeStrip`, in-context response
  take-live line, Monitor preview CTA
- `endpoint-docs.ts` — the rate-limit callouts

Copy is centralised enough for a one-file sweep at that point.
