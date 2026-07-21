import type { FastifyReply } from "fastify";
import { hasLeversAccess } from "../modules/usage";

/* AR-542: Levers (organization configuration: signal bundles, area cohorts,
   scoring presets, members and invitations, white-label, methodology pinning)
   is a paid capability. Every user is auto-given a personal org and is its
   owner, so an org-role check alone does not gate it. This adds the plan
   entitlement gate: it sends a 403 and resolves false when the caller's plan
   is not entitled, otherwise resolves true. Sits alongside the org-role check
   in each Levers write handler. */
export async function requireLeversAccess(userId: string, reply: FastifyReply): Promise<boolean> {
  if (await hasLeversAccess(userId)) return true;
  reply.code(403).send({
    error: "Organization features are available on paid plans. Book a demo to get set up.",
    code: "levers_plan_required",
  });
  return false;
}
