/* modules/orgs/invitations — AR-272 (Phase 3 / Levers UI backend).

   The org_invitations table backs the email-driven invite path. The
   existing addMember (apps/api/src/modules/orgs/index.ts) only joins
   an EXISTING userId; this module covers the case where the invitee
   either doesn't have an account yet, or has one but isn't in the org.

   Security model:
     - Token is crypto.randomBytes(32) → base64url (43 chars). Plaintext
       lives only in the outbound email URL.
     - DB stores SHA-256 hex of the token. Lookup hashes the inbound
       token and compares. DB leak → no live tokens exposed.
     - Single-use: accept flips accepted_at; subsequent accepts fail.
     - 7-day expiry. Accept refuses on expired rows.
     - Admin or owner can create. Member+ can list. Admin or owner can
       revoke. RBAC checks are at the endpoint layer (existing pattern)
       so this module trusts its callers; the typed error returns let
       endpoints translate to HTTP cleanly.

   Email goes via sendOrgInvitationEmail (Resend) — same provider every
   other transactional mail uses. */

import { randomBytes, createHash } from "node:crypto";
import { generateId } from "../../infrastructure/utils/id";
import { OrgInvitationRepository, OrgRepository } from "../../infrastructure/db/dal";
import { sendOrgInvitationEmail } from "../../infrastructure/email/senders";
import { sql } from "../../infrastructure/db/client";
import { rows, type OrgInvitationRow } from "../../infrastructure/db/types";
import type { InvitationRole, OrgInvitation } from "@onegoodarea/contracts";

const invitations = new OrgInvitationRepository();
const orgs = new OrgRepository();

/** 7 days is the standard SaaS invite window — long enough for a busy
    teammate to find the email, short enough that revoking a stale invite
    rarely matters in practice. Tune via env if it ever needs to. */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** PURE. Maps an OrgInvitationRow to the public DTO. Drops token_hash
    and accepted/revoked columns since they're never on the surface
    (we only list PENDING invites). */
function invitationFromRow(row: OrgInvitationRow): OrgInvitation {
  return {
    id: row.id,
    org_id: row.org_id,
    email: row.email,
    role: row.role,
    invited_by_user_id: row.invited_by_user_id,
    expires_at: row.expires_at,
    created_at: row.created_at,
  };
}

/** PURE. SHA-256 hex of the plaintext token. Same hash both at create
    time (stored) and at accept time (looked up). */
function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Typed errors the endpoint layer translates to HTTP. Each variant
    carries enough context for the response body's `code` field. */
export type CreateInvitationError =
  | { code: "invitation_already_pending" }
  | { code: "user_already_member" };

export type AcceptInvitationError =
  | { code: "invitation_not_found" }
  | { code: "invitation_expired" }
  | { code: "invitation_revoked" }
  | { code: "invitation_already_accepted" }
  | { code: "email_mismatch" };

/* ── reads ──────────────────────────────────────────────────────────── */

export async function listPendingInvitations(orgId: string): Promise<OrgInvitation[]> {
  const rows = await invitations.listPending(orgId);
  return rows.map(invitationFromRow);
}

/* ── create ─────────────────────────────────────────────────────────── */

/** Issue an invitation. The plaintext token is returned ONLY in the
    email (sent inline here); the caller receives the public DTO with
    no token. The 23505 catch translates the partial-unique-index
    collision into a typed error so the endpoint can return 409. */
export async function createInvitation(params: {
  orgId: string;
  invitedByUserId: string;
  email: string;
  role: InvitationRole;
}): Promise<{ ok: true; invitation: OrgInvitation } | { ok: false; error: CreateInvitationError }> {
  const email = params.email.trim().toLowerCase();

  // Reject inviting someone already a member. Cleaner than waiting for
  // the accept path to 409 — the inviter gets immediate feedback in
  // the dashboard.
  const org = await orgs.findById(params.orgId);
  if (!org) throw new Error(`org ${params.orgId} not found`);
  if (await isExistingMember(params.orgId, email)) {
    return { ok: false, error: { code: "user_already_member" } };
  }

  const id = generateId("inv");
  const plaintextToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(plaintextToken);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();

  try {
    await invitations.create({
      id,
      org_id: params.orgId,
      email,
      role: params.role,
      token_hash: tokenHash,
      invited_by_user_id: params.invitedByUserId,
      expires_at: expiresAt,
    });
  } catch (err) {
    // 23505 = unique_violation. Our only unique index that fires here
    // is uq_org_invitations_pending → there's already an open invite.
    if (isUniqueViolation(err)) {
      return { ok: false, error: { code: "invitation_already_pending" } };
    }
    throw err;
  }

  await sendOrgInvitationEmail({
    to: email,
    token: plaintextToken,
    orgName: org.display_name ?? org.name,
    role: params.role,
  });

  // Re-fetch so created_at reflects the server clock (we don't speculate
  // about NOW() locally — keep one source of truth).
  const row = await invitations.findById(id);
  if (!row) throw new Error("invitation vanished post-insert");
  return { ok: true, invitation: invitationFromRow(row) };
}

/* ── revoke ─────────────────────────────────────────────────────────── */

/** Idempotent. Returns false if no pending invite matched (either it
    doesn't exist, was already accepted, or already revoked). The
    endpoint maps that to 404. */
export async function revokeInvitation(
  invitationId: string,
  orgId: string,
): Promise<boolean> {
  return invitations.revoke(invitationId, orgId);
}

/* ── accept ─────────────────────────────────────────────────────────── */

/** Accept by plaintext token. Caller is the signed-in user; their email
    must match the invitation's email (case-insensitive). The repo's
    atomic accept handles the membership insert. */
export async function acceptInvitation(params: {
  plaintextToken: string;
  userId: string;
  userEmail: string;
}): Promise<
  | { ok: true; org_id: string; role: InvitationRole }
  | { ok: false; error: AcceptInvitationError }
> {
  const row = await invitations.findByTokenHash(hashToken(params.plaintextToken));
  if (!row) return { ok: false, error: { code: "invitation_not_found" } };
  if (row.revoked_at) return { ok: false, error: { code: "invitation_revoked" } };
  if (row.accepted_at) return { ok: false, error: { code: "invitation_already_accepted" } };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: { code: "invitation_expired" } };
  }
  if (row.email.toLowerCase() !== params.userEmail.trim().toLowerCase()) {
    return { ok: false, error: { code: "email_mismatch" } };
  }

  const accepted = await invitations.accept(row.id, row.org_id, params.userId, row.role);
  if (!accepted) {
    // Lost the race against another accept on the same token. The
    // database is the source of truth — re-read and report.
    return { ok: false, error: { code: "invitation_already_accepted" } };
  }
  return { ok: true, org_id: row.org_id, role: row.role };
}

/* ── helpers ────────────────────────────────────────────────────────── */

/** Single JOIN: is there a user with this email already in the org?
    Short-circuits the invite flow so the inviter gets immediate feedback
    instead of the invitee bouncing off the accept endpoint later. */
async function isExistingMember(orgId: string, emailLowered: string): Promise<boolean> {
  const result = rows<{ user_id: string }>(await sql`
    SELECT m.user_id
      FROM org_members m
      JOIN users u ON u.id = m.user_id
     WHERE m.org_id = ${orgId}
       AND LOWER(u.email) = ${emailLowered}
     LIMIT 1
  `);
  return result.length > 0;
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: string }).code;
  return code === "23505";
}
