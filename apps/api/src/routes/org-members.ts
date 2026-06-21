import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AddMemberRequestSchema, UpdateMemberRoleRequestSchema, CreateInvitationRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { headerString } from "../shared/http";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getOrgIfMember, listMembers, addMember, removeMember, changeMemberRole, countOwners, hasAtLeastRole } from "../modules/orgs";
import { listPendingInvitations, createInvitation, revokeInvitation, acceptInvitation } from "../modules/orgs/invitations";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { trackEvent } from "../modules/tracking/activity";

import { getRoleInOrg } from "../modules/orgs";
import { getUserEmail } from "../modules/usage";
/** org-members route handlers — extracted from app.ts per AR-286. */
export function registerOrgMembersRoutes(app: FastifyInstance): void {
    app.get("/v1/orgs/:id/members",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "List members",
            "description": "List all members of an organization."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id } = request.params as { id: string };
        const role = await getRoleInOrg(id, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const members = await listMembers(id);
        return reply.code(200).send({ members });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/members] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.post("/v1/orgs/:id/members",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "Add member",
            "description": "Add an existing user to the organization."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id } = request.params as { id: string };
        const role = await getRoleInOrg(id, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = AddMemberRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        // Levers AR-199: admin can add admin/member but NOT owner. Granting
        // ownership is the chain-of-authority move that stays owner-only.
        const targetRole = parsed.data.role ?? "member";
        if (targetRole === "owner" && !hasAtLeastRole(role, "owner")) {
          return reply.code(403).send({
            error: "Only an owner can grant the owner role.",
            code: "cannot_grant_owner",
          });
        }
        await addMember({
          orgId: id,
          userId: parsed.data.user_id,
          role: targetRole,
        });
        trackEvent("api.org.member_added", userId, { orgId: id, addedUserId: parsed.data.user_id }, id);
        return reply.code(201).send({ ok: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/members] add error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.patch("/v1/orgs/:id/members/:userId",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "Update member role",
            "description": "Change a member's role in the organization."
        },
      }, async (request, reply) => {
      try {
        const callerId = await authenticateEither(request, reply);
        if (!callerId) return reply;
        const { id: orgId, userId: targetId } = request.params as { id: string; userId: string };
        const callerRole = await getRoleInOrg(orgId, callerId);
        if (!callerRole) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(callerRole, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = UpdateMemberRoleRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const targetRole = parsed.data.role;
        if (targetRole === "owner" && !hasAtLeastRole(callerRole, "owner")) {
          return reply.code(403).send({
            error: "Only an owner can grant the owner role.",
            code: "cannot_grant_owner",
          });
        }
        const currentRole = await getRoleInOrg(orgId, targetId);
        if (!currentRole) return reply.code(404).send({ error: "Member not found in org" });
        // Chain-of-authority: modifying an owner-role member is owner-only,
        // mirroring the DELETE endpoint's cannot_remove_owner_as_admin gate.
        // Applies unconditionally on currentRole === "owner" — without this,
        // an admin in a 2+ owner org could demote any owner to member and
        // take effective control.
        if (currentRole === "owner" && !hasAtLeastRole(callerRole, "owner")) {
          return reply.code(403).send({
            error: "Only an owner can modify an owner.",
            code: "cannot_modify_owner_as_admin",
          });
        }
        // Last-owner protection: refuse to demote the only remaining owner.
        if (currentRole === "owner" && targetRole !== "owner") {
          const owners = await countOwners(orgId);
          if (owners <= 1) {
            return reply.code(409).send({
              error: "Cannot demote the last owner of the org.",
              code: "last_owner",
            });
          }
        }
        const ok = await changeMemberRole(orgId, targetId, targetRole);
        if (!ok) return reply.code(404).send({ error: "Member not found in org" });
        trackEvent("api.org.member_role_changed", callerId, {
          orgId,
          targetUserId: targetId,
          from: currentRole,
          to: targetRole,
        }, orgId);
        return reply.code(200).send({ ok: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/members/:userId] patch error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.delete("/v1/orgs/:id/members/:userId",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "Remove member",
            "description": "Remove a member from the organization."
        },
      }, async (request, reply) => {
      try {
        const callerId = await authenticateEither(request, reply);
        if (!callerId) return reply;
        const { id, userId: targetId } = request.params as { id: string; userId: string };
        const callerRole = await getRoleInOrg(id, callerId);
        if (!callerRole) return reply.code(404).send({ error: "Org not found" });
        // Levers AR-199 RBAC:
        //   self-removal                    -> any role (still bounded by last-owner guard below)
        //   removing a non-owner member     -> admin+
        //   removing an owner-role member   -> owner-only (chain-of-authority)
        const isSelfRemoval = callerId === targetId;
        const targetRole = await getRoleInOrg(id, targetId);
        if (!isSelfRemoval) {
          if (!hasAtLeastRole(callerRole, "admin")) {
            return reply.code(403).send({
              error: "Admin or owner required (unless removing yourself).",
              code: "admin_required",
            });
          }
          if (targetRole === "owner" && !hasAtLeastRole(callerRole, "owner")) {
            return reply.code(403).send({
              error: "Only an owner can remove an owner.",
              code: "cannot_remove_owner_as_admin",
            });
          }
        }
        // Last-owner guard: never let the org be orphaned. Applies to
        // self-removal too — an owner removing themselves can't leave
        // the org without an owner.
        if (targetRole === "owner") {
          const owners = await countOwners(id);
          if (owners <= 1) {
            return reply.code(409).send({
              error: "Cannot remove the last owner. Promote another member to owner first.",
            });
          }
        }
        const ok = await removeMember(id, targetId);
        if (!ok) return reply.code(404).send({ error: "Member not found in org" });
        trackEvent("api.org.member_removed", callerId, { orgId: id, removedUserId: targetId }, id);
        return reply.code(200).send({ deleted: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/members/:userId] delete error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.post("/v1/orgs/:id/invitations",
      {
      schema: {
            "tags": [
                "Invitations"
            ],
            "summary": "Create invitation",
            "description": "Create an invitation to join the organization."
        },
      }, async (request, reply) => {
      try {
        const callerId = await authenticateEither(request, reply);
        if (!callerId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, callerId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = CreateInvitationRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const result = await createInvitation({
          orgId,
          invitedByUserId: callerId,
          email: parsed.data.email,
          role: parsed.data.role,
        });
        if (!result.ok) {
          // 409 covers both "already pending" and "already a member" — same
          // resolution from the caller's perspective: the invite isn't needed.
          return reply.code(409).send({ error: result.error.code, code: result.error.code });
        }
        trackEvent("api.org.invitation_created", callerId, {
          orgId,
          invitationId: result.invitation.id,
          role: result.invitation.role,
        }, orgId);
        return reply.code(201).send({ invitation: result.invitation });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/invitations] create error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs/:id/invitations",
      {
      schema: {
            "tags": [
                "Invitations"
            ],
            "summary": "List invitations",
            "description": "List pending invitations for the organization."
        },
      }, async (request, reply) => {
      try {
        const callerId = await authenticateEither(request, reply);
        if (!callerId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, callerId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const invitations = await listPendingInvitations(orgId);
        return reply.code(200).send({ invitations });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/invitations] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.delete("/v1/orgs/:id/invitations/:invitationId",
      {
      schema: {
            "tags": [
                "Invitations"
            ],
            "summary": "Revoke invitation",
            "description": "Revoke a pending invitation."
        },
      }, async (request, reply) => {
      try {
        const callerId = await authenticateEither(request, reply);
        if (!callerId) return reply;
        const { id: orgId, invitationId } = request.params as { id: string; invitationId: string };
        const role = await getRoleInOrg(orgId, callerId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const ok = await revokeInvitation(invitationId, orgId);
        if (!ok) return reply.code(404).send({ error: "Invitation not found or already resolved" });
        trackEvent("api.org.invitation_revoked", callerId, { orgId, invitationId }, orgId);
        return reply.code(200).send({ revoked: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/invitations/:invitationId] delete error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.post("/v1/invitations/:token/accept",
      {
      schema: {
            "tags": [
                "Invitations"
            ],
            "summary": "Accept invitation",
            "description": "Accept an organization invitation by token."
        },
      }, async (request, reply) => {
      try {
        const callerId = await authenticateEither(request, reply);
        if (!callerId) return reply;
        const callerEmail = await getUserEmail(callerId);
        if (!callerEmail) return reply.code(403).send({ error: "Caller email not available." });
        const { token } = request.params as { token: string };
        const result = await acceptInvitation({
          plaintextToken: token,
          userId: callerId,
          userEmail: callerEmail,
        });
        if (!result.ok) {
          // 410 Gone for expired/revoked/already-accepted (the resource
          // existed but is no longer usable). 403 for email_mismatch (the
          // caller is authenticated, just not the right person). 404 for
          // not_found (no such token).
          const status =
            result.error.code === "invitation_not_found" ? 404 :
            result.error.code === "email_mismatch" ? 403 :
            410;
          return reply.code(status).send({ error: result.error.code, code: result.error.code });
        }
        trackEvent("api.org.invitation_accepted", callerId, {
          orgId: result.org_id,
          role: result.role,
        }, result.org_id);
        // Re-fetch org for the response body so the dashboard knows where
        // to route the user. The accept just made callerId a member, so
        // getOrgIfMember will resolve.
        const orgRow = await getOrgIfMember(result.org_id, callerId);
        if (!orgRow) {
          // Vanishingly rare — invitation pointed at an org that's since
          // been deleted. Acceptance succeeded; just return the ids.
          return reply.code(200).send({
            org_id: result.org_id,
            org_slug: "",
            org_name: "",
            role: result.role,
          });
        }
        return reply.code(200).send({
          org_id: orgRow.id,
          org_slug: orgRow.slug,
          org_name: orgRow.display_name ?? orgRow.name,
          role: result.role,
        });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/invitations/:token/accept] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
