# Signal data freshness: complete the refresh cron

**Purpose:** Add crime and Ofsted to the monthly signal-refresh cron so the
marquee signals stay fresh and "when did this last update" is answerable.

**JIRA:** AR-480 (epic) with AR-481 (crime) and AR-482 (Ofsted).

**Status:** Plan, not yet implemented. Verified against code, ADR 0015, and
the data-sources roadmap.

---

## Context: what the cron does today

`.github/workflows/signal-refresh.yml` runs at 04:00 UTC on the 1st of each
month and executes: migrate, refresh:deprivation, refresh:prices,
derive:signals, normalize:signals, refresh:peers, derive again, normalize
again, timeseries:append.

It has **no crime step and no Ofsted step**. Crime and Ofsted were each loaded
once by hand and are never refreshed. Crime is the marquee signal, so its
latest months drift stale; Ofsted has no freshness timestamp at all.

Not a functional break (crime has 1.2M rows / 36 months in the store, so demos
work), but a credibility gap for a freshness-and-provenance pitch.

---

## Step 1: Crime (AR-481)

**The blocker was data acquisition, not a missing line.** `refresh:crime`
exists but reads the police.uk bulk archive from a local directory, and the
archive was never in CI.

**Confirmed source (this plan's key finding):** police.uk publishes a stable
rolling snapshot at `https://data.police.uk/data/archive/latest.zip`.
- ~1.6GB zip, also addressable as `[year]-[month].zip` (e.g. `2026-05.zip`).
- Each archive is a rolling ~36-month window (matches our time-series depth).
- Publication lag is ~2 months (inherent to police.uk, currently latest is May 2026). This is a freshness ceiling to state honestly, not a bug.

**Approach (Option 1, no extra infra):**
1. Add a cron step that downloads `latest.zip`, unzips to a temp dir, runs `npm run refresh:crime -w @onegoodarea/api -- <dir>`, then deletes the archive to reclaim disk.
2. Confirm the run writes a `source_snapshots` row (it already does) so freshness is queryable.
3. Fix `docs/OPERATIONS/SIGNAL-REFRESH.md`, which currently lists crime as "Monthly" (false today).

**Watch-outs:** GH runner disk (~14GB free, 1.6GB zip plus extracted data fits
with cleanup) and job time (download plus reprocessing 36 months, likely
20 to 40 minutes). The repo is public, so Actions minutes are free.

---

## Step 2: Ofsted (AR-482)

Worse shape: **no refresh job exists**. `data-sources/ofsted.ts` is read-only;
the only writer is a manual TRUNCATE-and-reload seed in `apps/web/scripts/`.
`ofsted_schools` has no `updated_at` or provenance, so freshness is
unanswerable from the DB.

**Approach:**
1. Build `refresh:ofsted` in `apps/api` (port the seed logic): resolve the latest gov.uk "Management information, state-funded schools inspections and outcomes" CSV, geocode via postcodes.io, reload `ofsted_schools`.
2. Add provenance (`updated_at` column and/or a `source_snapshots` row).
3. Add the step to the cron.

**Open question:** resolving the latest gov.uk CSV URL, since the filename is
dated monthly. To research during implementation.

**Watch-out:** geocoding every school via postcodes.io each run (rate limits,
time). The seed already does this, so it is a known quantity, but worth a
bulk-postcode call rather than one-at-a-time.

---

## Sequencing

Crime first (AR-481): higher value, source already confirmed, refresh logic
already exists. Ofsted second (AR-482): needs a new job plus a provenance
column plus source resolution.

---

## What Pedro needs to do

Minimal. Specifically:
1. **Approve the approach** (Option 1 for crime: download `latest.zip` in the cron). No object storage or manual file drops needed.
2. **Secrets: nothing.** `DATABASE_URL` is already a GitHub Actions secret. Police.uk and postcodes.io are open (no API keys).
3. **First validation run:** after the crime step is merged, trigger a manual run (`workflow_dispatch`, the "Run workflow" button, or authorise me to run `gh workflow run signal-refresh.yml`). This hits prod Neon, so it is your call to pull the trigger.
4. **Verify freshness** with a one-line query in the Neon console (I will provide it), e.g. the latest `source_snapshots` row for crime.
5. **Ofsted source:** if my research cannot pin a stable "latest CSV" URL, I may ask you to confirm the exact gov.uk dataset page.
