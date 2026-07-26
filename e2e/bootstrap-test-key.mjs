#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { randomBytes, pbkdf2Sync, createHash } from "node:crypto";
import { parseArgs } from "node:util";

const PLANS = ["free", "starter", "pro", "developer", "business", "growth", "sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];
const API_PLANS = ["developer", "business", "growth", "sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];

function generateId(prefix) {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password, salt, 600000, 32, "sha256");
  const saltB64 = salt.toString("base64");
  const hashB64 = key.toString("base64");
  return `${saltB64}:${hashB64}`;
}

function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

function apiKeyPreview(key) {
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

function usage() {
  return [
    "Usage:",
    "  node e2e/bootstrap-test-key.mjs [--email test@example.local] [--name 'Local test key'] [--password 'temp-pass'] [--plan sandbox]",
    "",
    "Defaults:",
    "  --email     api-test@onegoodarea.local",
    "  --name      Local test key",
    "  --password  generated automatically",
    "  --plan      sandbox",
  ].join("\n");
}

function parseOptions() {
  const parsed = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
      plan: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (parsed.values.help) {
    console.log(usage());
    process.exit(0);
  }

  const email = (parsed.values.email ?? "api-test@onegoodarea.local").trim().toLowerCase();
  const name = (parsed.values.name ?? "Local test key").trim() || "Local test key";
  const password = parsed.values.password ?? randomBytes(18).toString("base64url");
  const plan = parsed.values.plan ?? "sandbox";

  if (!PLANS.includes(plan)) {
    throw new Error(`Unknown plan "${plan}". Valid plans: ${PLANS.join(", ")}`);
  }
  if (!API_PLANS.includes(plan)) {
    throw new Error(`Plan "${plan}" does not grant API access. Use sandbox or another API-enabled plan.`);
  }

  return { email, name, password, plan };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to bootstrap a test key in production.");
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(url);
  const { email, name, password, plan } = parseOptions();
  const userName = email.split("@")[0] || "api-test";

  // Upsert user
  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  const passwordHash = hashPassword(password);

  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    await sql`
      UPDATE users
         SET name = ${userName},
             provider = 'credentials',
             password_hash = ${passwordHash},
             email_verified = TRUE
       WHERE id = ${userId}
    `;
  } else {
    userId = generateId("user");
    await sql`
      INSERT INTO users (id, email, name, password_hash, provider, email_verified)
      VALUES (${userId}, ${email}, ${userName}, ${passwordHash}, 'credentials', TRUE)
    `;
  }

  // Create personal org
  const orgId = `org_${userId}`;
  const slug = `${userName}-${userId.slice(0, 12)}`;
  await sql`
    INSERT INTO orgs (id, slug, name)
    VALUES (${orgId}, ${slug}, ${`${userName} workspace`})
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${orgId}, ${userId}, 'owner')
    ON CONFLICT (org_id, user_id) DO NOTHING
  `;

  // Ensure sandbox plan subscription
  await sql`
    INSERT INTO subscriptions (id, user_id, plan, status)
    VALUES (${generateId("sub")}, ${userId}, ${plan}, 'active')
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;

  // Create API key
  const keyId = generateId("key");
  const key = `oga_${randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(key);
  const preview = apiKeyPreview(key);
  await sql`
    INSERT INTO api_keys (id, key_hash, key_prefix, user_id, name)
    VALUES (${keyId}, ${keyHash}, ${preview}, ${userId}, ${name})
  `;

  console.log(`User:  ${email}`);
  console.log(`Plan:  ${plan}`);
  console.log(`Pass:  ${password}`);
  console.log(`Key:   ${key}`);
  console.log("");
  console.log("Use it as:");
  console.log(`Authorization: Bearer ${key}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
