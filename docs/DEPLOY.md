# Deploying `apps/api` (the standalone backend)

> The backend is a portable container. The same image (`/Dockerfile`) runs on any
> OCI host, so the provider choice is **not** a lock-in. Recommendation: start on
> **Render** (fastest, free, no card), graduate to **Google Cloud Run** later with
> zero rework. `apps/web` stays on Vercel — this is only the API.

Nothing here touches the live site: `apps/api` is a separate service. Until the
BFF cutover, the live monolith keeps serving; this just stands the API up so
`/v1/area` (and the rest) can be hit directly with an API key.

## What's in the repo for this

| File | Purpose |
|---|---|
| `/Dockerfile` | the portable image (Node 22, runs `apps/api` via tsx) |
| `/.dockerignore` | keeps the build context lean |
| `/render.yaml` | Render Blueprint (one-click-ish) |
| `/.github/workflows/signal-refresh.yml` | free monthly cron for refresh + normalize |

## Environment variables

Set these on whichever host you pick (and as GitHub secrets for the cron):

| Var | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | the Neon string (same as `apps/web/.env.local`) |
| `OGA_SIGNALS_API` | `/v1/area`, `/v1/signals` | set `"true"` to expose them |
| `OGA_SIGNALS_STORE_READ` | serve from store | `"true"` to serve deprivation from the store |
| `AUTH_SECRET` | session/JWT bridge | **must equal** `apps/web`'s AUTH_SECRET |
| `ANTHROPIC_API_KEY` | report narration | for `/v1/report` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | billing routes | |
| `RESEND_API_KEY` | email | |
| `NEXTAUTH_URL` | Stripe redirects (`APP_URL`) | `https://www.onegoodarea.com` |

For *just* trying `/v1/area`, the minimum is `DATABASE_URL` + `OGA_SIGNALS_API=true`
+ `OGA_SIGNALS_STORE_READ=true` (API-key auth reads the DB).

---

## Path A — Render (recommended start)

1. **Render dashboard** → New → **Blueprint** → connect this GitHub repo (authorize
   access to the private repo). It reads `render.yaml`.
2. It creates the `onegoodarea-api` web service on the **free** plan, building from
   `/Dockerfile`, deploying the `feat/signal-first-restructure` branch.
3. In the service's **Environment** tab, fill the secrets marked `sync:false`
   (`DATABASE_URL`, `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `STRIPE_*`, `RESEND_API_KEY`).
   The flags + `NEXTAUTH_URL` come from `render.yaml`.
4. **Manual Deploy** → Deploy latest. First build takes a few minutes.
5. When live, it gives a URL like `https://onegoodarea-api.onrender.com`.

> Free services sleep after 15 min idle (first request after = 30-60s cold start).
> Fine pre-customer; upgrade the plan or move to Cloud Run when that matters.

(No-Blueprint alternative: New → **Web Service** → pick the repo → Runtime
**Docker** → it finds `/Dockerfile` → set branch + env vars manually.)

---

## Path B — Google Cloud Run (graduation, same image)

Prereqs: a GCP project + `gcloud` CLI (`gcloud auth login`). Then, from the repo root:

```bash
gcloud run deploy onegoodarea-api \
  --source . \                          # builds /Dockerfile via Cloud Build
  --region europe-west2 \
  --allow-unauthenticated \
  --set-env-vars OGA_SIGNALS_API=true,OGA_SIGNALS_STORE_READ=true,NEXTAUTH_URL=https://www.onegoodarea.com \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest
```

(Put secrets in Secret Manager first, or use `--set-env-vars` for a quick test.)
Cloud Run **scales to zero** (no idle bill) with a far gentler cold start than
Render's sleep, and a generous free tier. Same container → switching is just this
command instead of the Render dashboard.

---

## The cron (free, host-agnostic)

`.github/workflows/signal-refresh.yml` runs migrate → refresh → normalize monthly.
Add a GitHub repo secret **`DATABASE_URL`** (Settings → Secrets and variables →
Actions). Trigger it now via **Actions → signal-refresh → Run workflow**
(`workflow_dispatch`). The monthly `schedule` only auto-fires once the workflow is
on `main` (a GitHub rule) — `workflow_dispatch` works from the branch today.

---

## Verify it works

```bash
curl https://<your-host>/health
# {"status":"ok"}

# create an API key in the dashboard first, then:
curl -H "Authorization: Bearer oga_xxx" "https://<your-host>/v1/area?postcode=M1%201AE"
# -> AreaProfile JSON; deprivation signals carry normalized_value + percentile,
#    meta.fetch_mode = "hybrid"
```

---

## Honest notes / follow-ups

- **Image size:** the build installs all workspace deps for simplicity (reliable
  first build). Trimming via a JS bundle or selective workspace install is a tested
  optimization once the base deploy is confirmed.
- **Branch:** we deploy `feat/signal-first-restructure` (main is untouched by the
  restructure). Repoint to `main` when it merges.
- **BFF cutover** (browser → apps/web → apps/api) is a separate, later step; this
  deploy is the API standing on its own (api-key auth) first.
