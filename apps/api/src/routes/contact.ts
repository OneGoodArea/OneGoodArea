import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendContactEmail, sendContactConfirmationEmail } from "../infrastructure/email/senders";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { headerString } from "../shared/http";
import { logger } from "../modules/tracking/structured-logger";

const ContactOkResponse = z.object({ ok: z.literal(true) });
const ContactErrorResponse = z.object({ error: z.string() });

/* Public contact-form endpoint (AR-451). No auth. Spam defence is
   layered and dependency-free (Turnstile was intentionally left off
   here; verifyTurnstile is available to bolt on later if organic spam
   ever gets through):
     1. Honeypot field `website`: real users never fill it; naive bots
        do. Filled => accept silently (200) without sending, so a bot
        can't tell it was rejected.
     2. Per-IP sliding-window rate limit (5/hour, RATE_LIMITS.contact).
     3. Strict Zod validation (valid email, message length bounds). */

const CONTACT_ROLES = ["lender", "insurer", "proptech", "cre", "public-sector", "estate-agent", "other"] as const;

const ROLE_LABELS: Record<(typeof CONTACT_ROLES)[number], string> = {
  lender: "Lender",
  insurer: "Insurer",
  proptech: "PropTech",
  cre: "Commercial real estate",
  "public-sector": "Public sector",
  "estate-agent": "Estate agent",
  other: "Other",
};

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email: z.string().trim().email("Please enter a valid email.").max(200),
  company: z.string().trim().max(160).optional(),
  role: z.enum(CONTACT_ROLES).optional(),
  message: z.string().trim().min(10, "Please add a little more detail.").max(4000),
  // Honeypot. Not surfaced in the UI; any non-empty value marks a bot.
  website: z.string().max(200).optional(),
});

export function registerContactRoutes(app: FastifyInstance): void {
  app.post("/contact",
    {
      schema: {
        tags: ["Contact"],
        summary: "Submit contact form",
        description: "Send a contact enquiry. Public endpoint, no auth required.",
        security: [],
        body: {
          type: "object",
          required: ["name", "email", "message"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            company: { type: "string" },
            role: { type: "string" },
            message: { type: "string" },
            website: { type: "string" },
          },
        },
        response: {
          200: ContactOkResponse,
          400: ContactErrorResponse,
          429: ContactErrorResponse,
          502: ContactErrorResponse,
        },
      },
    },
    async (request, reply) => {
    const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";

    const rl = await rateLimit(`contact:${ip}`, RATE_LIMITS.contact);
    if (!rl.success) {
      reply.headers(rateLimitHeaders(RATE_LIMITS.contact.max, rl));
      return reply.code(429).send({ error: "Too many messages. Please try again later." });
    }

    const parsed = ContactSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid submission." });
    }

    const { name, email, company, role, message, website } = parsed.data;

    // Honeypot tripped: accept silently so bots see success, but drop it.
    if (website && website.trim()) {
      logger.warn("[contact] honeypot tripped, dropping submission", { ip });
      return reply.code(200).send({ ok: true });
    }

    try {
      await sendContactEmail({
        name,
        email,
        company: company || null,
        role: role ? ROLE_LABELS[role] : null,
        message,
      });
    } catch (err) {
      logger.error("[contact] failed to send enquiry email", err);
      return reply.code(502).send({
        error: "We couldn't send your message. Please email operation@onegoodarea.co.uk directly.",
      });
    }

    // Best-effort confirmation to the submitter. Never fail the request on this.
    try {
      await sendContactConfirmationEmail(email, name);
    } catch (err) {
      logger.warn("[contact] confirmation email failed (non-fatal)", err);
    }

    logger.info("[contact] enquiry received", { ip, company: company || null, role: role ?? null });
    return reply.code(200).send({ ok: true });
  });
}
