#!/usr/bin/env node
// gen-api-test-plan.mjs
//
// Zero-dependency generator for the API test plan consumed by
// scripts/api-test-suite.sh.
//
// Strategy (hybrid):
//   1. Discover every endpoint from $DOMAIN/docs/json (the OpenAPI 3 document
//      that Fastify builds from the Zod route schemas — the single source of
//      truth for "what endpoints exist").
//   2. Merge with the curated scripts/api-test-manifest.json, which supplies
//      the concrete, testable path (with placeholder ids), the auth class, the
//      example request body, and the description for each known endpoint.
//   3. Auto-append any OpenAPI endpoint NOT represented by a manifest entry,
//      assigning a default auth class by path prefix. These are "new" endpoints
//      that get exercised immediately; refine them later with one manifest line
//      (e.g. to add a body or a concrete path).
//
// Output: .artifacts/api-test-plan.json (override with API_TEST_PLAN_OUT).
// Run via: DOMAIN=http://localhost:8080 make scripts-api-test-plan

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const DOMAIN = (process.env.DOMAIN || '').replace(/\/+$/, '');
if (!DOMAIN) {
  console.error('[gen-api-test-plan] DOMAIN is required, e.g. DOMAIN=http://localhost:8080 make scripts-api-test-plan');
  process.exit(1);
}

// Resolve relative to this script's location so cwd does not matter (works both
// in the container, where cwd=/work, and on a host checkout).
const manifestPath = process.env.API_TEST_MANIFEST
  ? resolve(process.env.API_TEST_MANIFEST)
  : resolve(__dirname, 'api-test-manifest.json');
const outPath = process.env.API_TEST_PLAN_OUT
  ? resolve(process.env.API_TEST_PLAN_OUT)
  : resolve(repoRoot, '.artifacts', 'api-test-plan.json');

function loadManifest() {
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    const m = JSON.parse(raw);
    return m && m.endpoints && typeof m.endpoints === 'object' ? m : { endpoints: {} };
  } catch (err) {
    console.error(`[gen-api-test-plan] failed to read manifest ${manifestPath}: ${err.message}`);
    process.exit(1);
  }
}

// Default auth class derived from the path. The manifest refines this
// per-endpoint (e.g. /stripe/webhook is Public, not Session).
function defaultAuth(path) {
  const rules = [
    ['/admin/', 'Admin'],
    ['/cron/', 'CRON'],
    ['/auth/', 'Public'],
    ['/stripe/', 'Session'],
    ['/settings/', 'Session'],
    ['/me/', 'Session'],
    ['/usage', 'Session'],
    ['/keys', 'Session'],
    ['/watchlist', 'Session'],
    ['/v1/me', 'API'],
    ['/v1/', 'API'],
    ['/health', 'Public'],
    ['/v1/meta', 'Public'],
    ['/track', 'Public'],
    ['/docs/', 'Public'],
    ['/contact', 'Public'],
    ['/dashboard', 'Public'],
  ];
  for (const [prefix, auth] of rules) {
    if (path.startsWith(prefix)) return auth;
  }
  return 'Public';
}

// Human-readable section label for an endpoint, used for print_section()
// headings in the generated bash plan. Manifest may override via `group`.
function groupOf(path) {
  const rules = [
    ['/admin/', 'Admin'],
    ['/cron/', 'Cron'],
    ['/auth/', 'Auth: Credentials'],
    ['/stripe/', 'Stripe'],
    ['/settings/', 'Account Dashboard: Settings'],
    ['/me/', 'Me'],
    ['/usage', 'Account Dashboard: Usage'],
    ['/keys', 'Account Dashboard: Keys'],
    ['/watchlist', 'Account Dashboard: Watchlist'],
    ['/v1/orgs', 'Orgs'],
    ['/v1/portfolios', 'Portfolios'],
    ['/v1/webhooks', 'Webhooks'],
    ['/v1/score', 'Scores'],
    ['/v1/query', 'Intelligence'],
    ['/v1/peers', 'Intelligence'],
    ['/v1/insights', 'Intelligence'],
    ['/v1/forecast', 'Intelligence'],
    ['/v1/area', 'Signals'],
    ['/v1/signals', 'Signals'],
    ['/v1/areas', 'Signals'],
    ['/v1/me', 'Caller'],
    ['/v1/', 'API'],
    ['/track', 'Public: Tracking'],
    ['/dashboard', 'Public: Dashboard'],
    ['/docs', 'Public: Docs'],
    ['/contact', 'Public: Contact'],
    ['/health', 'Health & Meta'],
    ['/v1/meta', 'Health & Meta'],
  ];
  for (const [p, g] of rules) {
    if (path.startsWith(p)) return g;
  }
  return 'Other';
}

// Wrap a string for safe embedding in a single-quoted shell argument.
function shQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

// Normalize a path for comparison: drop the query string and replace id-like
// segments and {template} params with a placeholder, so a manifest entry such
// as "/v1/orgs/org_123" matches the OpenAPI path "/v1/orgs/{id}".
function normalize(path) {
  return path
    .split('?')[0]
    .replace(/\{[^}]+\}/g, ':')
    .replace(/\/[A-Za-z]+_[A-Za-z0-9]+/g, '/:');
}

function parseKey(key) {
  const sp = key.indexOf(' ');
  return { method: key.slice(0, sp).toUpperCase(), path: key.slice(sp + 1) };
}

async function main() {
  const manifest = loadManifest();

  let spec;
  try {
    const res = await fetch(`${DOMAIN}/docs/json`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    spec = await res.json();
  } catch (err) {
    console.error(`[gen-api-test-plan] failed to fetch ${DOMAIN}/docs/json: ${err.message}`);
    process.exit(1);
  }

  const discovered = [];
  const openapiNorm = new Set();
  const paths = spec.paths || {};
  for (const [p, methods] of Object.entries(paths)) {
    for (const [m, op] of Object.entries(methods || {})) {
      const M = m.toUpperCase();
      if (!HTTP_METHODS.has(M)) continue;
      openapiNorm.add(`${M} ${normalize(p)}`);
      discovered.push({ method: M, path: p, operation: op || {} });
    }
  }

  const endpoints = [];
  const usedNorm = new Set();

  // 1) Curated manifest endpoints first (preserve order and intent).
  for (const [key, cfg] of Object.entries(manifest.endpoints)) {
    const { method, path } = parseKey(key);
    const c = cfg || {};
    const effectivePath = c.path || path;
    const auth = c.auth || defaultAuth(effectivePath);
    const body = c.body === undefined || c.body === null ? null : c.body;
    endpoints.push({
      method,
      path: effectivePath,
      auth,
      body,
      group: c.group || groupOf(effectivePath),
      description: c.description || `${method} ${path}`,
      expectedStatus: c.expectedStatus || '2xx|4xx',
      skip: !!c.skip,
    });
    usedNorm.add(`${method} ${normalize(path)}`);
  }

  // 2) Auto-catch OpenAPI endpoints not represented by a manifest entry.
  let autoCaught = 0;
  for (const d of discovered) {
    const normKey = `${d.method} ${normalize(d.path)}`;
    if (usedNorm.has(normKey)) continue;
    usedNorm.add(normKey);
    autoCaught += 1;
    endpoints.push({
      method: d.method,
      path: d.path,
      auth: defaultAuth(d.path),
      body: null,
      group: groupOf(d.path),
      description: d.operation.summary || d.operation.operationId || `${d.method} ${d.path}`,
      expectedStatus: '2xx|4xx',
      skip: false,
    });
  }

  // Warn about manifest endpoints missing from OpenAPI (renamed/deleted routes).
  let missing = 0;
  for (const [key] of Object.entries(manifest.endpoints)) {
    const { method, path } = parseKey(key);
    if (!openapiNorm.has(`${method} ${normalize(path)}`)) {
      missing += 1;
      console.warn(`[gen-api-test-plan] WARN manifest endpoint not found in OpenAPI: ${key}`);
    }
  }

  const plan = {
    generatedAt: new Date().toISOString(),
    domain: DOMAIN,
    source: `${DOMAIN}/docs/json`,
    counts: {
      manifest: Object.keys(manifest.endpoints).length,
      autoCaught,
      missing,
      total: endpoints.length,
    },
    endpoints,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n', 'utf8');

  // Also emit a ready-to-source bash include so api-test-suite.sh can drive the
  // run without needing jq/JSON parsing. It calls test_endpoint() per endpoint
  // (defined by the suite) and prints section headers by group.
  const shLines = [
    '# Generated by gen-api-test-plan.mjs — do not edit.',
    '# Sourced by api-test-suite.sh; calls test_endpoint() per endpoint.',
  ];
  let lastGroup = null;
  for (const e of endpoints) {
    if (e.skip) continue;
    if (e.group !== lastGroup) {
      shLines.push(`print_section ${shQuote(e.group)}`);
      lastGroup = e.group;
    }
    const bodyArg = e.body === null ? '' : JSON.stringify(e.body);
    shLines.push(
      `test_endpoint ${shQuote(e.method)} ${shQuote(e.path)} ${shQuote(e.auth)} ${shQuote(bodyArg)} ${shQuote(e.description)}`,
    );
  }
  const shPath = resolve(dirname(outPath), 'api-test-plan.sh');
  writeFileSync(shPath, shLines.join('\n') + '\n', 'utf8');

  console.log(`[gen-api-test-plan] wrote ${outPath}`);
  console.log(`[gen-api-test-plan] manifest=${plan.counts.manifest} autoCaught=${plan.counts.autoCaught} missing=${plan.counts.missing} total=${plan.counts.total}`);
}

main().catch((err) => {
  console.error(`[gen-api-test-plan] unexpected error: ${err.stack || err.message}`);
  process.exit(1);
});
