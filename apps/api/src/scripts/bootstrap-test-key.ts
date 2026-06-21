/**
 * Bootstrap a test API key for local development.
 * 
 * Creates or updates a test user, logs in, and generates an API key.
 * Prints the plaintext key once (never recoverable after this).
 * 
 * Usage:
 *   npm run bootstrap:test-key -- --email api-test@test.com --plan sandbox
 * 
 * Requires:
 *   - Database connectivity (via DATABASE_URL)
 *   - AUTH_SECRET for session token signing
 */

import { sql } from "../infrastructure/db/client";
import { generateId } from "../infrastructure/utils/id";
import { hashPassword } from "../modules/auth/crypto";
import { createApiKey } from "../modules/api-keys";
import { createPersonalOrgForUser } from "../modules/orgs";

/**
 * Parse command-line arguments: --email USER --plan PLAN
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let email = "api-test@onegoodarea.local";
  let plan = "sandbox";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[i + 1];
      i++;
    }
    if (args[i] === "--plan" && args[i + 1]) {
      plan = args[i + 1];
      i++;
    }
  }

  return { email, plan };
}

/**
 * Ensure test user exists with the given email and plan.
 * Returns the user ID.
 */
async function ensureTestUser(email: string, plan: string): Promise<string> {
  const sanitized = email.trim().toLowerCase();
  
  // Check if user exists
  const existing = await sql`SELECT id FROM users WHERE email = ${sanitized}`;
  if (existing.length > 0) {
    const userId = (existing[0] as Record<string, unknown>).id as string;
    console.log(`✓ User already exists: ${sanitized}`);
    return userId;
  }

  // Create new user
  const id = generateId("user");
  const name = sanitized.split("@")[0];
  const password = "TestPass1234"; // Test-only password
  const hash = await hashPassword(password);

  await sql`
    INSERT INTO users (id, email, name, password_hash, provider, email_verified)
    VALUES (${id}, ${sanitized}, ${name}, ${hash}, 'credentials', TRUE)
  `;

  // Set plan via subscription
  if (plan && plan !== "sandbox") {
    await sql`
      INSERT INTO subscriptions (id, user_id, status, plan)
      VALUES (${generateId("sub")}, ${id}, 'active', ${plan})
      ON CONFLICT (user_id) DO UPDATE SET plan = ${plan}
    `;
  }

  // Create personal org
  try {
    await createPersonalOrgForUser(id, sanitized);
    console.log(`✓ Created personal org for ${sanitized}`);
  } catch (e) {
    console.log(`⚠ Personal org creation failed (non-fatal):`, (e as Error).message);
  }

  console.log(`✓ Created new user: ${sanitized}`);
  return id;
}

async function main() {
  try {
    const { email, plan } = parseArgs();
    console.log(`Bootstrapping test API key...`);
    console.log(`  Email: ${email}`);
    console.log(`  Plan: ${plan}`);
    console.log();

    // 1. Ensure user exists
    const userId = await ensureTestUser(email, plan);

    // 2. Create API key
    const { key, name } = await createApiKey(userId, "bootstrap-test");
    console.log();
    console.log(`✓ API key created!`);
    console.log();
    console.log(`API_KEY=${key}`);
    console.log();
    console.log(`⚠ This is the ONLY time this key will be displayed.`);
    console.log(`  Save it now or generate a new one.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
    process.exit(1);
  }
}

main();
