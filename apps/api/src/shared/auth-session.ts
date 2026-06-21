import type { FastifyRequest, FastifyReply } from "fastify";
import { verifySessionToken } from "../modules/auth/session-token";

/** Session (browser-user) auth via the JWT bridge — the counterpart to
   authenticate() (programmatic api-key auth). Verifies the short-lived token
   apps/web's server mints from its NextAuth session and resolves the userId, or
   sends 401 and resolves null. Used by the session-only Stripe routes. */
export async function authenticateSession(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  const session = await verifySessionToken(header.slice(7));
  if (!session) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  return session.userId;
}
