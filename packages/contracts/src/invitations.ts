/* @onegoodarea/contracts — Levers (AR-272): org invitation flow DTOs.

   An invitation is the email-driven side of org membership. The existing
   POST /v1/orgs/:id/members endpoint only adds an EXISTING userId, so
   real onboarding (invite a teammate who hasn't signed up yet, or who has
   but isn't in the org) needs a token + email pair handled separately.

   Owner cannot be granted via invitation — the OrgRoleSchema below
   excludes it deliberately. Owner promotion stays a member-update on an
   already-joined user. */

import { z } from "zod";

/** Roles an invitation may grant. NOT a full OrgRoleSchema — owner is
    excluded by design: only an existing owner can promote another
    existing member to owner, never via the invite path. */
export const InvitationRoleSchema = z.enum(["member", "admin"]);
export type InvitationRole = z.infer<typeof InvitationRoleSchema>;

/** Public DTO returned by GET /v1/orgs/:id/invitations and POST create.
    Token is NEVER in this payload — it lives only in the recipient's
    email. The server stores token_hash; plaintext is unrecoverable. */
export const OrgInvitationSchema = z.object({
  id: z.string().min(1),
  org_id: z.string().min(1),
  email: z.string().email(),
  role: InvitationRoleSchema,
  invited_by_user_id: z.string().min(1),
  expires_at: z.string(),
  created_at: z.string(),
}).strict();
export type OrgInvitation = z.infer<typeof OrgInvitationSchema>;

/** Body for POST /v1/orgs/:id/invitations. Email is lowercased before
    storage so case differences don't bypass the (org_id, email) partial
    unique index. */
export const CreateInvitationRequestSchema = z.object({
  email: z.string().email().max(254),
  role: InvitationRoleSchema.default("member"),
}).strict();
export type CreateInvitationRequest = z.infer<typeof CreateInvitationRequestSchema>;

/** Response from POST /v1/invitations/:token/accept. Tells the caller
    which org they just joined + at what role, so the dashboard can
    route them straight to the new context. */
export const AcceptInvitationResponseSchema = z.object({
  org_id: z.string().min(1),
  org_slug: z.string().min(1),
  org_name: z.string().min(1),
  role: InvitationRoleSchema,
}).strict();
export type AcceptInvitationResponse = z.infer<typeof AcceptInvitationResponseSchema>;
