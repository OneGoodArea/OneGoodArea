# Plan 026 — Research notes (pending epic)

**Status:** STUB — captured 2026-06-25 after Pedro killed the legacy B2C blog (AR-334). Picked up when there's bandwidth + customer signal.

## Direction

Replace the deleted `/blog` surface with a **research notes** surface aimed at the B2B audience (analysts, lenders, insurers, public sector planners). Periodic data-driven reports like:

- *"UK postcode price-growth concentration, Q3 2026"*
- *"Flood-risk signal distribution by LAD"*
- *"Top 50 commuter belt postcodes by 12-month transport-improvement signal"*

Each note showcases the engine, runs against real signals, and is naturally shareable in analyst Slack channels / LinkedIn / industry newsletters.

## Why deferred (not built now)

- Needs dedicated design (not a blog reskin)
- Needs a content cadence plan (monthly? quarterly? on-demand?)
- Needs an authorship model (Pedro alone? Hire analyst? Auto-generate from the engine + human review?)
- Probably wants a different URL scheme (`/research` or `/notes`, not the dead `/blog`)
- Probably wants different infrastructure (downloadable PDF for procurement archives, lead-capture for newsletter, RSS for analyst feeds)
- Worth waiting for customer signal — first paying customer's data ask becomes the first research note

## What's already in place

- `/blog` and `/blog/:slug` 301-redirect to `/` (AR-334) — no SEO bleed
- Footer no longer links to a blog
- Sitemap has no blog entries

## Out of scope for this stub

Not designing the surface, not committing to a cadence, not deciding lead capture. This file just **records the direction** so the decision doesn't get lost.

## Trigger for picking this up

- First paying customer
- OR an analyst hire who wants research output as part of the role
- OR a clear distribution channel emerges (industry newsletter partnership, conference talk recurring)
