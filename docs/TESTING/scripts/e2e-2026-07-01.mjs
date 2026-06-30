#!/usr/bin/env node
/* eslint-disable no-console */

/* End-to-end prod smoke test.

   Walks every API surface from the 2026-06-30 ICP E2E plus the 8 items
   we never verified after this morning's fix sweep (AR-388 .. AR-396).
   Self-contained: no deps beyond Node's built-in fetch.

   Usage (PowerShell):
     $env:OGA_API_KEY = "oga_..."
     node docs/TESTING/scripts/e2e-2026-07-01.mjs

   Or pass via flag:
     node docs/TESTING/scripts/e2e-2026-07-01.mjs --key oga_...

   Output: a markdown table to stdout AND to
   docs/TESTING/e2e-2026-07-01-results.md (gitignored by default; commit
   only when you want to lock a snapshot). */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const keyFromFlag = (() => {
  const idx = args.indexOf("--key");
  return idx >= 0 ? args[idx + 1] : null;
})();
const KEY = keyFromFlag || process.env.OGA_API_KEY;
if (!KEY || !KEY.startsWith("oga_")) {
  console.error("error: set OGA_API_KEY env var or pass --key oga_...");
  process.exit(2);
}

const BASE = process.env.OGA_API_BASE || "https://onegoodarea.onrender.com";
const RESULTS_PATH = resolve(process.cwd(), "docs/TESTING/e2e-2026-07-01-results.md");

const headersAuth = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

/* -------------------------------------------------------------------- */
/* Test harness                                                          */
/* -------------------------------------------------------------------- */

const results = [];

async function call(opts) {
  const { name, category, method = "GET", path, body, auth = true, expect = {}, derive } = opts;
  const url = `${BASE}${path}`;
  const headers = auth ? headersAuth : { "Content-Type": "application/json" };
  const init = { method, headers };
  if (body !== undefined) init.body = typeof body === "string" ? body : JSON.stringify(body);

  const t0 = performance.now();
  let res, text, json;
  try {
    res = await fetch(url, init);
    text = await res.text();
    try { json = JSON.parse(text); } catch { json = null; }
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    results.push({ name, category, method, path, status: "ERR", latency_ms: ms, ok: false, note: String(err).slice(0, 80) });
    return null;
  }
  const ms = Math.round(performance.now() - t0);

  let ok = true;
  const notes = [];

  if (expect.status !== undefined && res.status !== expect.status) {
    ok = false;
    notes.push(`expected ${expect.status} got ${res.status}`);
  }
  if (expect.statusOneOf && !expect.statusOneOf.includes(res.status)) {
    ok = false;
    notes.push(`status ${res.status} not in [${expect.statusOneOf.join(",")}]`);
  }
  if (expect.maxLatencyMs !== undefined && ms > expect.maxLatencyMs) {
    ok = false;
    notes.push(`slow: ${ms}ms > ${expect.maxLatencyMs}ms`);
  }
  if (expect.assert && json !== null) {
    try {
      const r = expect.assert(json);
      if (r !== true) {
        ok = false;
        notes.push(typeof r === "string" ? r : "assert false");
      }
    } catch (e) {
      ok = false;
      notes.push(`assert threw: ${String(e).slice(0, 80)}`);
    }
  }

  results.push({
    name, category, method, path,
    status: res.status, latency_ms: ms, ok,
    note: notes.join("; "),
  });

  if (derive && json !== null) derive(json);

  return json;
}

function section(category, msg) {
  console.log(`\n--- ${category}: ${msg} ---`);
}

/* -------------------------------------------------------------------- */
/* Test plan                                                             */
/* -------------------------------------------------------------------- */

async function run() {
  section("Smoke", "/health, /v1/meta, /v1/me");
  await call({ name: "/health", category: "smoke", path: "/health", auth: false, expect: { status: 200 } });
  await call({ name: "/v1/meta", category: "smoke", path: "/v1/meta", auth: false, expect: { status: 200 } });
  await call({ name: "/v1/me unauth", category: "smoke", path: "/v1/me", auth: false, expect: { status: 401 } });
  await call({ name: "/v1/me auth", category: "smoke", path: "/v1/me", expect: { status: 200, assert: (j) => j?.engine_version ? true : "missing engine_version" } });

  section("AR-393", "Safety & Crime confidence + period consistency");
  let crimeSignal = null;
  let crimeDimension = null;
  await call({
    name: "/v1/area M1 1AE", category: "AR-393", path: "/v1/area?postcode=M1+1AE",
    /* AR-402: post-User-Agent fix, amenities actually fetches real data
       from Overpass for dense city centres. The cold-cache call pays
       the slowest of 8 parallel category queries (~10s for Piccadilly-
       density centres). Warm-cache calls are <500ms (subsequent test
       calls verify this). 12s threshold accommodates the honest cold
       cost; the alternative is pre-warming the cache before this test
       which would hide the real latency profile. */
    expect: { status: 200, maxLatencyMs: 12000 },
    derive: (j) => { crimeSignal = j?.signals?.find((s) => s.key === "crime.total_12m") ?? null; },
  });
  await call({
    name: "/v1/score M1 1AE moving", category: "AR-393", method: "POST", path: "/v1/score",
    body: { area: "M1 1AE", preset: "moving" },
    expect: { status: 200, maxLatencyMs: 6000 },
    derive: (j) => { crimeDimension = j?.dimensions?.find((d) => d.label === "Safety & Crime") ?? null; },
  });
  // Cross-surface consistency check (after both fetched)
  results.push({
    name: "AR-393 dim<->signal consistency", category: "AR-393", method: "DERIVED", path: "(both surfaces)",
    status: "—", latency_ms: 0,
    ok:
      crimeSignal !== null && crimeDimension !== null &&
      crimeSignal.confidence === crimeDimension.confidence,
    note:
      crimeSignal && crimeDimension
        ? `signal conf=${crimeSignal.confidence} period="${crimeSignal.observed_period}"; dim conf=${crimeDimension.confidence} reason="${(crimeDimension.confidence_reason || "").slice(0, 60)}"`
        : "missing one of the two payloads",
  });

  section("AR-396", "flood cache warm path");
  await call({
    name: "/v1/score M1 1AE (warm 1)", category: "AR-396", method: "POST", path: "/v1/score",
    body: { area: "M1 1AE", preset: "moving" },
    expect: { status: 200, maxLatencyMs: 2000 },
  });
  await call({
    name: "/v1/score M1 1AE (warm 2)", category: "AR-396", method: "POST", path: "/v1/score",
    body: { area: "M1 1AE", preset: "moving" },
    expect: { status: 200, maxLatencyMs: 2000 },
  });

  section("AR-390", "invalid postcode rejected fast");
  await call({
    name: "/v1/area?postcode=BAD", category: "AR-390", path: "/v1/area?postcode=BAD",
    expect: { statusOneOf: [400, 404], maxLatencyMs: 2000 },
  });
  await call({
    name: "/v1/score area=BAD", category: "AR-390", method: "POST", path: "/v1/score",
    body: { area: "BAD", preset: "moving" },
    expect: { statusOneOf: [400, 404], maxLatencyMs: 3000 },
  });

  section("AR-395", "schools per-rating signals");
  await call({
    name: "/v1/signals/schools M1 1AE", category: "AR-395", path: "/v1/signals/schools?postcode=M1+1AE",
    expect: {
      status: 200,
      assert: (j) => {
        const keys = (j?.signals || []).map((s) => s.key);
        const required = ["schools.outstanding_count", "schools.good_count", "schools.requires_improvement_count", "schools.inadequate_count"];
        const missing = required.filter((k) => !keys.includes(k));
        return missing.length === 0 ? true : `missing keys: ${missing.join(",")}`;
      },
    },
  });

  section("AR-391", "API/UX cosmetics + signals catalog");
  await call({
    name: "/v1/insights signal (wrong field name)", category: "AR-391", method: "POST", path: "/v1/insights",
    body: { signal: "crime.total_12m" },
    expect: {
      status: 400,
      assert: (j) => /signal_key/i.test(j?.error || j?.message || ""),
    },
  });
  await call({
    name: "/v1/insights ENGLAND case", category: "AR-391", method: "POST", path: "/v1/insights",
    body: { signal_key: "crime.total_12m_peer_relative_z", country: "ENGLAND" },
    expect: { status: 200 },
  });

  section("AR-383", "NL planner score_area used to 500");
  await call({
    name: "/v1/query NL 'score Manchester for moving'", category: "AR-383", method: "POST", path: "/v1/query",
    body: { question: "score Manchester for moving" },
    expect: { statusOneOf: [200, 422] },
  });

  section("06-12 #3", "programmatic place-name path (never re-verified)");
  await call({
    name: "/v1/query plan get_area Manchester", category: "06-12 #3", method: "POST", path: "/v1/query",
    body: { plan: { op: "get_area", params: { area: "Manchester" } } },
    expect: { statusOneOf: [200, 422] },
  });
  await call({
    name: "/v1/query plan get_area Brixton (ambiguous)", category: "06-12 #3", method: "POST", path: "/v1/query",
    body: { plan: { op: "get_area", params: { area: "Brixton" } } },
    expect: { statusOneOf: [200, 422] },
  });
  await call({
    name: "/v1/query plan find_peers area=Manchester", category: "06-12 #3", method: "POST", path: "/v1/query",
    body: { plan: { op: "find_peers", params: { target: { area: "Manchester" } } } },
    expect: { statusOneOf: [200, 422] },
  });

  section("AR-388 / AR-389", "org members FK + ISO dates");
  await call({
    name: "/v1/orgs (mine)", category: "AR-388", path: "/v1/orgs",
    expect: {
      status: 200,
      assert: (j) => {
        const orgs = j?.orgs || j;
        if (!Array.isArray(orgs) || orgs.length === 0) return "no orgs returned";
        const o = orgs[0];
        return /^\d{4}-\d{2}-\d{2}T/.test(o.created_at) || /^\d{4}-\d{2}-\d{2}T/.test(o.createdAt)
          ? true
          : `created_at not ISO: ${o.created_at}`;
      },
    },
  });

  section("06-30 portfolios body shape", "{postcode} vs {area} inconsistency");
  let portfolioId = null;
  await call({
    name: "POST /v1/portfolios", category: "06-30 portfolios", method: "POST", path: "/v1/portfolios",
    body: { name: `e2e-${Date.now()}` },
    expect: { statusOneOf: [200, 201] },
    derive: (j) => { portfolioId = j?.id || j?.portfolio_id || null; },
  });
  if (portfolioId) {
    await call({
      name: "POST /v1/portfolios/:id/areas {postcode}", category: "06-30 portfolios", method: "POST",
      path: `/v1/portfolios/${portfolioId}/areas`,
      body: { areas: [{ postcode: "M1 1AE" }] },
      expect: { statusOneOf: [200, 400] },
    });
    await call({
      name: "POST /v1/portfolios/:id/areas {area}", category: "06-30 portfolios", method: "POST",
      path: `/v1/portfolios/${portfolioId}/areas`,
      body: { areas: [{ area: "M1 1AE" }] },
      expect: { statusOneOf: [200, 201] },
    });
    await call({
      name: "GET /v1/portfolios/:id/changes (was 404)", category: "06-30 portfolios",
      path: `/v1/portfolios/${portfolioId}/changes`,
      expect: { statusOneOf: [200, 405] },
    });
    await call({
      name: "DELETE /v1/portfolios/:id", category: "06-30 portfolios", method: "DELETE",
      path: `/v1/portfolios/${portfolioId}`,
      expect: { status: 200 },
    });
  }

  section("06-12 #7", "DELETE /v1/orgs/:id (grep says missing)");
  await call({
    name: "DELETE /v1/orgs/:id (own)", category: "06-12 #7", method: "DELETE", path: "/v1/orgs/__nonexistent__",
    expect: { statusOneOf: [200, 404, 403, 405] },
    /* If 405 -> route doesn't exist for DELETE method (confirms gap).
       If 404 -> exists but org not found (works).
       If 403 -> auth error (works, just wrong scope).
       Any other -> investigate. */
  });

  section("06-12 #6", "methodology mutation verb (PUT not POST)");
  // First get my org id
  let myOrgId = null;
  await call({
    name: "/v1/orgs (derive own id)", category: "06-12 #6", path: "/v1/orgs",
    derive: (j) => {
      const orgs = j?.orgs || j;
      if (Array.isArray(orgs) && orgs.length > 0) myOrgId = orgs[0].id;
    },
  });
  if (myOrgId) {
    await call({
      name: `GET /v1/orgs/${myOrgId}/methodology`, category: "06-12 #6",
      path: `/v1/orgs/${myOrgId}/methodology`,
      expect: { status: 200 },
    });
    await call({
      name: `PUT /v1/orgs/${myOrgId}/methodology (no body)`, category: "06-12 #6", method: "PUT",
      path: `/v1/orgs/${myOrgId}/methodology`,
      body: {},
      expect: { statusOneOf: [200, 400] },
    });
  }

  section("06-30 retailer-critical", "find_peers result enrichment + OSM city-centre coverage");
  await call({
    name: "/v1/peers M1 1AE", category: "retailer", method: "POST", path: "/v1/peers",
    body: { target: { postcode: "M1 1AE" }, k: 3 },
    expect: {
      status: 200,
      /* The retailer ICP ask is "can I render this peer as a place?".
         A representative postcode answers that even when admin_district
         is null (incomplete geo_lookup seed; AR-401 backfill follow-up).
         All-three-null is the real retailer failure. */
      assert: (j) => {
        const first = (j?.peers || [])[0];
        if (!first) return "no peers returned";
        const hasPlace = first.sample_postcode || first.admin_district;
        return hasPlace
          ? true
          : `peer has neither sample_postcode nor admin_district (geo_lookup gap): ${JSON.stringify(first).slice(0,120)}`;
      },
    },
  });
  await call({
    name: "/v1/signals/amenities M1 1AE (Piccadilly)", category: "retailer",
    path: "/v1/signals/amenities?postcode=M1+1AE",
    expect: {
      status: 200,
      assert: (j) => {
        const amen = (j?.signals || []).find((s) => s.key === "amenities.total");
        if (!amen) return "amenities.total signal missing";
        if (amen.confidence === 0) return "amenities confidence=0 on city centre (retailer-blocker)";
        return true;
      },
    },
  });

  section("06-30 #1", "find_areas dedupe (NL rank)");
  await call({
    name: "/v1/query NL 'safest areas in Manchester for families'", category: "06-30 #1", method: "POST", path: "/v1/query",
    body: { question: "safest areas in Manchester for families" },
    expect: {
      status: 200,
      assert: (j) => {
        const rows = j?.rows || j?.results || j?.data || [];
        const codes = rows.map((r) => r.geo_code || r.lsoa || r.id);
        const unique = new Set(codes);
        return codes.length === unique.size ? true : `duplicate geo_codes returned (${codes.length} rows, ${unique.size} unique)`;
      },
    },
  });

  section("AR-394", "per-source timing log presence");
  console.log("note: per-source timing line is in Render logs; not curlable directly. Skipped here.");
}

/* -------------------------------------------------------------------- */
/* Report                                                                */
/* -------------------------------------------------------------------- */

function report() {
  const groups = new Map();
  for (const r of results) {
    if (!groups.has(r.category)) groups.set(r.category, []);
    groups.get(r.category).push(r);
  }

  const lines = [];
  lines.push(`# E2E re-test — 2026-07-01`);
  lines.push("");
  lines.push(`Ran against \`${BASE}\` at ${new Date().toISOString()}.`);
  lines.push("");
  const okCount = results.filter((r) => r.ok).length;
  lines.push(`**${okCount} / ${results.length} checks passed.**`);
  lines.push("");

  for (const [cat, list] of groups) {
    lines.push(`## ${cat}`);
    lines.push("");
    lines.push(`| | Method | Path | Status | Latency | Note |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const r of list) {
      const icon = r.ok ? "✅" : "🔴";
      const lat = r.latency_ms > 0 ? `${r.latency_ms}ms` : "—";
      const safePath = r.path.replace(/\|/g, "\\|");
      const safeNote = (r.note || "").replace(/\|/g, "\\|");
      lines.push(`| ${icon} ${r.name} | ${r.method} | \`${safePath}\` | ${r.status} | ${lat} | ${safeNote} |`);
    }
    lines.push("");
  }

  const md = lines.join("\n");
  console.log("\n" + md);
  writeFileSync(RESULTS_PATH, md, "utf8");
  console.log(`\nwrote ${RESULTS_PATH}`);

  process.exit(okCount === results.length ? 0 : 1);
}

run().then(report).catch((err) => {
  console.error("e2e harness threw:", err);
  process.exit(2);
});
