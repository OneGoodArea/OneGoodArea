#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { parseArgs } from "node:util";

const IPIFY_URL = "https://api.ipify.org";

function usage() {
  return [
    "Usage:",
    "  node scripts/reset-playground-rate-limit.mjs [--ip 1.2.3.4] [--confirm]",
    "",
    "Reset the daily playground IP rate limit for a given IP address.",
    "Without --confirm the script runs in dry-run mode (shows count only).",
    "",
    "Flags:",
    "  --ip       IP address to clear (default: auto-detect via ipify.org)",
    "  --confirm  Actually delete rows (default: dry-run)",
    "  --help, -h Show this help text",
  ].join("\n");
}

function parseOptions() {
  const parsed = parseArgs({
    options: {
      ip: { type: "string" },
      confirm: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (parsed.values.help) {
    console.log(usage());
    process.exit(0);
  }

  return { ip: parsed.values.ip, confirm: parsed.values.confirm };
}

async function detectIp() {
  const res = await fetch(IPIFY_URL);
  if (!res.ok) throw new Error(`Failed to detect IP: ${res.status}`);
  return (await res.text()).trim();
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run in production.");
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const { ip: providedIp, confirm } = parseOptions();
  const ip = providedIp ?? (await detectIp());
  const sql = neon(url);
  const identifier = `playground:ip:${ip}`;

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM rate_limit_entries WHERE identifier = ${identifier}`;

  if (!confirm) {
    console.log(`IP: ${ip}`);
    console.log(`Rows found: ${count}`);
    console.log("[DRY RUN] Run with --confirm to delete.");
    return;
  }

  await sql`DELETE FROM rate_limit_entries WHERE identifier = ${identifier}`;
  console.log(`IP: ${ip}`);
  console.log(`Deleted ${count} rate-limit rows for ${identifier}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
