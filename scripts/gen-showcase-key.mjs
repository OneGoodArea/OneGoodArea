#!/usr/bin/env node
/* Generates a one-time showcase API key and prints the exact dashboard
   snippets for Render (SEED_SHOWCASE_API_KEY) + Vercel (SHOWCASE_API_KEY).

   The key is NEVER written to git or the DB here — the API's seed step
   (migrate.cjs -> runSeeds) sha-256 hashes it and inserts the hash + preview
   at deploy time. This script only prints the one value you paste into BOTH
   dashboards, so the two sides agree on the same plaintext.

   Usage:
     node scripts/gen-showcase-key.mjs
*/
import { randomBytes, createHash } from "node:crypto";

function apiKeyPreview(key) {
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to generate a key in production.");
  process.exit(1);
}

const key = `oga_${randomBytes(24).toString("hex")}`;
const keyHash = hashApiKey(key);
const preview = apiKeyPreview(key);

console.log("Showcase API key (generate once, paste into BOTH dashboards):");
console.log("");
console.log(`  ${key}`);
console.log("");
console.log("Render  -> dashboard.render.com -> service onegoodarea-api -> Environment -> Add");
console.log(`  SEED_SHOWCASE_API_KEY = ${key}`);
console.log("");
console.log("Vercel  -> vercel.com -> one-good-area-stable -> Settings -> Environment Variables -> Add New");
console.log(`  SHOWCASE_API_KEY = ${key}`);
console.log("  Environments: Production");
console.log("");
console.log("Expected DB rows after deploy (the seed hashes this key):");
console.log(`  api_keys.key_prefix = ${preview}`);
console.log(`  api_keys.key_hash  = ${keyHash}`);
