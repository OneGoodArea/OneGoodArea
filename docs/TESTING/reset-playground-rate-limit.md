# Reset playground IP rate limit

Quick reference for QA to reset the playground's per-IP daily rate limit
without waiting 24 hours or running a destructive full DB reset.

## When to use

You've hit the 60-calls/day playground cap on your QA IP and need to clear it
immediately. Use the reset script or Make target — both do the same thing.

## Prerequisites

- A running Postgres (local dev stack or compose test stack)
- `DATABASE_URL` set in your env (or sourced from the running stack)
- `@neondatabase/serverless` installed (present in root `node_modules`)

## Usage

### Dry-run (see how many rows would be deleted)

```bash
make scripts-reset-playground-limit
```

Output:
```
IP: 203.0.113.42
Rows found: 47
[DRY RUN] Run with --confirm to delete.
```

### Reset for your own IP

```bash
make scripts-reset-playground-limit ARGS="--confirm"
```

Auto-detects your public IP via `https://api.ipify.org`.

### Reset for a specific IP

```bash
make scripts-reset-playground-limit ARGS="--ip 1.2.3.4 --confirm"
```

### Direct invocation (without Make)

```bash
node scripts/reset-playground-rate-limit.mjs --ip 1.2.3.4 --confirm
```

## Flags

| Flag | Required | Default | Description |
|---|---|---|---|
| `--ip` | No | Auto-detect | IP address to clear |
| `--confirm` | No | false (dry-run) | Actually DELETE rows |
| `--help` / `-h` | No | — | Show usage text |

## Production safety

The script refuses to run when `NODE_ENV=production`:

```
Error: Refusing to run in production.
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `DATABASE_URL not set` | Missing env var | Source your `.env.local` or compose stack |
| `Refusing to run in production` | Production guard | Check `NODE_ENV` is not `production` |
| `Could not auto-detect IP` | Network fetch failed | Pass `--ip` explicitly |
| `Rows found: 0` | No entries for this IP (or wrong IP) | Verify the IP is correct |
