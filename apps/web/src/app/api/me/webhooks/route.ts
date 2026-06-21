import { NextResponse, type NextRequest } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-281: webhook subscriptions BFF — list + create.

   Mirrors the /v1/webhooks contract: subscriptions are user-scoped
   (not org-scoped in the current backend), HMAC secret returned ONCE
   on POST (the secret persists in the row but the dashboard never
   reveals it again — same pattern as API keys), GET omits the
   secret. Direct-DB pattern matching the other /api/me/* BFFs. */

/* AR-283: dropped score.changed (was never fired). Keep mirror with
   apps/api/src/modules/webhooks/index.ts SUPPORTED_EVENT_TYPES. */
const SUPPORTED_EVENT_TYPES = ["report.created", "signal.changed"] as const;
type WebhookEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

const SECRET_PREFIX = "whsec_";

interface SubscriptionRow {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  status: string;
  created_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
}

/* AR-281 SSRF gate. The dashboard's BFF writes to webhook_subscriptions
   directly (matches the other /api/me/* surfaces), so the apps/api
   /v1/webhooks validateWebhookUrl protection doesn't fire on this path.
   Ported from apps/api/src/modules/webhooks/index.ts validateWebhookUrl
   verbatim, with two extra gates the original didn't have:
     - userinfo (url.username/password) MUST be empty -- a webhook URL
       carrying basic-auth credentials would leak them on every retry log
       + every operator who eyeballs the row
     - hostname's trailing dot normalised so foo.com. doesn't bypass the
       literal localhost / 127.0.0.1 comparisons
   Deeper SSRF hardening (DNS resolution + IPv6 unique-local + per-hop
   re-validation to defeat DNS rebinding) is a separate audit ticket
   that needs to land in apps/api's deliverer too -- the dashboard BFF
   can only ever match what the apps/api worker enforces at delivery
   time. */
function validateWebhookUrl(input: string): { ok: true; sanitized: string } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "Webhook URL must be a valid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Webhook URL must use HTTPS" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Webhook URL must not embed credentials (no user:pass@host)" };
  }
  /* Trailing dot normalisation: foo.com. resolves identically to foo.com
     but bypasses literal hostname comparisons. */
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return { ok: false, error: "Webhook URL cannot point at localhost or a private network" };
  }
  return { ok: true, sanitized: parsed.toString() };
}

const CreateBodySchema = z.object({
  url: z.string().url().refine((u) => {
    const v = validateWebhookUrl(u);
    return v.ok;
  }, { message: "Webhook URL must be a public HTTPS endpoint (no localhost / private / link-local / credentials)" }),
  events: z.array(z.enum(SUPPORTED_EVENT_TYPES)).min(1),
}).strict();

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = (await sql`
      SELECT id, user_id, url, events, status,
             created_at, last_success_at, last_failure_at
        FROM webhook_subscriptions
       WHERE user_id = ${userId} AND status = 'active'
       ORDER BY created_at DESC
    `) as SubscriptionRow[];
    return NextResponse.json({ subscriptions: rows });
  } catch {
    /* webhook_subscriptions may not exist on a fresh DB. */
    return NextResponse.json({ subscriptions: [] });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const secret = `${SECRET_PREFIX}${randomBytes(24).toString("hex")}`;

  try {
    await sql`
      INSERT INTO webhook_subscriptions (id, user_id, url, secret, events, status)
      VALUES (${id}, ${userId}, ${parsed.data.url}, ${secret}, ${parsed.data.events as readonly WebhookEventType[]}, 'active')
    `;
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "A webhook for that URL already exists.", code: "duplicate_url" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json(
    {
      subscription: {
        id,
        user_id: userId,
        url: parsed.data.url,
        events: parsed.data.events,
        status: "active",
        created_at: new Date().toISOString(),
        last_success_at: null,
        last_failure_at: null,
      },
      /* Plaintext secret returned ONCE. The dashboard surfaces it in
         the one-time reveal panel; subsequent GETs omit it. */
      secret,
    },
    { status: 201 },
  );
}
