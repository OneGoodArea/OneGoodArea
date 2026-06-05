import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "../modules/auth/crypto";
import { createApiKey } from "../modules/api-keys";
import { createPersonalOrgForUser } from "../modules/orgs";
import { generateId } from "../infrastructure/utils/id";
import { sql } from "../infrastructure/db/client";
import { row, type UserRow } from "../infrastructure/db/types";
import { PLANS, type PlanId } from "../modules/billing/plans";

type Options = {
  email: string;
  name: string;
  password: string;
  plan: PlanId;
};

function usage(): string {
  return [
    "Usage:",
    "  npm run bootstrap:test-key -w @onegoodarea/api -- [--email test@example.local] [--name 'Local test key'] [--password 'temp-pass'] [--plan sandbox]",
    "",
    "Defaults:",
    "  --email     api-test@onegoodarea.local",
    "  --name      Local test key",
    "  --password  generated automatically",
    "  --plan      sandbox",
  ].join("\n");
}

function parseOptions(): Options {
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
  const plan = (parsed.values.plan ?? "sandbox") as PlanId;

  if (!(plan in PLANS)) {
    throw new Error(`Unknown plan "${plan}".`);
  }
  if (!PLANS[plan].apiAccess) {
    throw new Error(`Plan "${plan}" does not grant API access. Use sandbox or another API-enabled plan.`);
  }

  return { email, name, password, plan };
}

async function upsertTestUser(email: string, password: string): Promise<string> {
  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  const passwordHash = await hashPassword(password);
  const userName = email.split("@")[0] || "api-test";

  if (existing.length > 0) {
    const current = row<Pick<UserRow, "id">>(existing[0]);
    await sql`
      UPDATE users
         SET name = ${userName},
             provider = 'credentials',
             password_hash = ${passwordHash},
             email_verified = TRUE
       WHERE id = ${current.id}
    `;
    return current.id;
  }

  const userId = generateId("user");
  await sql`
    INSERT INTO users (id, email, name, password_hash, provider, email_verified)
    VALUES (${userId}, ${email}, ${userName}, ${passwordHash}, 'credentials', TRUE)
  `;
  return userId;
}

async function ensureSandboxPlan(userId: string, plan: PlanId): Promise<void> {
  await sql`
    INSERT INTO subscriptions (id, user_id, plan, status)
    VALUES (${generateId("sub")}, ${userId}, ${plan}, 'active')
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to bootstrap a test key in production.");
  }

  const { email, name, password, plan } = parseOptions();
  const userId = await upsertTestUser(email, password);
  await createPersonalOrgForUser(userId, email);
  await ensureSandboxPlan(userId, plan);
  const key = await createApiKey(userId, name);

  console.log(`User:  ${email}`);
  console.log(`Plan:  ${plan}`);
  console.log(`Pass:  ${password}`);
  console.log(`Key:   ${key.key}`);
  console.log("");
  console.log("Use it as:");
  console.log(`Authorization: Bearer ${key.key}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
