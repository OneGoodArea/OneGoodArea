#!/usr/bin/env node
/* E2E scenario: playground IP rate-limit reset.
 *
 * Prerequisites:
 *   - Compose test stack running (postgres + neon-proxy + api on 8080)
 *   - DATABASE_URL set (pointing at the test DB)
 *   - E2E_PLAYGROUND_BASE set (default http://127.0.0.1:8080)
 *
 * Flow:
 *   1. Seed rate_limit_entries for a known IP to exceed the default 60/day cap
 *   2. Call POST /playground/token to get a session cookie
 *   3. Call POST /playground/proxy — verify it returns 429 (rate_ip_daily)
 *   4. Run the reset script against the DB
 *   5. Call POST /playground/proxy — verify it succeeds (rate limit cleared)
 *   6. Clean up seeded rows
 */

import { neon } from "@neondatabase/serverless";
import { parseArgs } from "node:util";

const TEST_IP = "203.0.113.99";
const BASE = process.env.E2E_PLAYGROUND_BASE || "http://127.0.0.1:8080";
const PLAYGROUND_PROXY_CALL = { method: "POST", path: "/v1/area?postcode=M1+1AE" };

let passed = 0;
let failed = 0;

function pass(msg) {
  passed++;
  console.log(`  PASS  ${msg}`);
}

function fail(msg, detail) {
  failed++;
  console.log(`  FAIL  ${msg}`);
  if (detail) console.log(`        ${detail}`);
}

async function step(label, fn) {
  console.log(`\n${label}`);
  try {
    await fn();
  } catch (err) {
    fail("unexpected error", err instanceof Error ? err.message : String(err));
  }
}

function parseOptions() {
  const parsed = parseArgs({
    options: {
      skipSeed: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });
  if (parsed.values.help) {
    console.log("Usage: node e2e/playground-rate-limit.mjs [--skip-seed]");
    console.log("  --skip-seed  Skip seeding rate_limit_entries (useful when re-running)");
    process.exit(0);
  }
  return { skipSeed: parsed.values.skipSeed };
}

async function main() {
  const { skipSeed } = parseOptions();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const identifier = `playground:ip:${TEST_IP}`;

  /* ── Step 1: Seed rate_limit_entries ────────────────────────────── */
  await step("Step 1: Seed rate_limit_entries to exceed the 60/day cap", async () => {
    if (skipSeed) {
      pass("skipped (--skip-seed)");
      return;
    }
    await sql`DELETE FROM rate_limit_entries WHERE identifier = ${identifier}`;
    const identifiers = Array.from({ length: 60 }, () => identifier);
    await sql`INSERT INTO rate_limit_entries (identifier) SELECT * FROM unnest(${identifiers}::text[])`;
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM rate_limit_entries WHERE identifier = ${identifier}`;
    if (count === 60) pass(`seeded ${count} rows for ${TEST_IP}`);
    else fail(`expected 60 rows, got ${count}`);
  });

  /* ── Step 2: Get a session cookie ───────────────────────────────── */
  let cookie = null;
  await step("Step 2: Issue playground session cookie", async () => {
    const res = await fetch(`${BASE}/playground/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const body = await res.json();
    if (res.status === 200 && body.session_id) {
      cookie = res.headers.get("set-cookie") || "";
      pass(`session ${body.session_id} issued`);
    } else {
      fail(`expected 200 + session_id, got ${res.status}`, JSON.stringify(body));
    }
  });

  /* ── Step 3: Verify playground blocks (429 rate_ip_daily) ──────── */
  await step("Step 3: Proxy call returns 429 (IP rate limit exhausted)", async () => {
    if (!cookie) { fail("skipped — no cookie from step 2"); return; }
    const res = await fetch(`${BASE}/playground/proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-Forwarded-For": TEST_IP,
      },
      body: JSON.stringify(PLAYGROUND_PROXY_CALL),
    });
    const body = await res.json();
    if (res.status === 429 && body.code === "rate_ip_daily") {
      pass(`429 rate_ip_daily as expected`);
    } else {
      fail(`expected 429 rate_ip_daily, got ${res.status}`, JSON.stringify(body));
    }
  });

  /* ── Step 4: Run the reset script ───────────────────────────────── */
  await step("Step 4: Reset rate limit for the test IP", async () => {
    await sql`DELETE FROM rate_limit_entries WHERE identifier = ${identifier}`;
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM rate_limit_entries WHERE identifier = ${identifier}`;
    if (count === 0) pass(`deleted all rows for ${TEST_IP}`);
    else fail(`expected 0 rows after reset, got ${count}`);
  });

  /* ── Step 5: Verify playground works again ──────────────────────── */
  await step("Step 5: Proxy call succeeds after reset", async () => {
    if (!cookie) { fail("skipped — no cookie from step 2"); return; }
    const res = await fetch(`${BASE}/playground/proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-Forwarded-For": TEST_IP,
      },
      body: JSON.stringify(PLAYGROUND_PROXY_CALL),
    });
    if (res.status === 200) pass(`proxy call succeeded (status 200)`);
    else {
      const body = await res.json();
      fail(`expected 200, got ${res.status}`, JSON.stringify(body));
    }
  });

  /* ── Step 6: Cleanup ────────────────────────────────────────────── */
  await step("Step 6: Clean up seeded rows", async () => {
    if (skipSeed) { pass("skipped cleanup (--skip-seed)"); return; }
    await sql`DELETE FROM rate_limit_entries WHERE identifier = ${identifier}`;
    pass(`cleaned up rows for ${TEST_IP}`);
  });

  /* ── Summary ────────────────────────────────────────────────────── */
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("E2E harness threw:", err);
  process.exit(1);
});
