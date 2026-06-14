/* @onegoodarea/contracts — Levers (AR-194): per-org tenancy DTOs.
   Every org has at least one owner; every API key belongs to exactly one
   org (nullable column today, becomes NOT NULL after the expand-contract
   window). See ADR 0027 (Foundation) + ADR 0028 (this commit). */

import { z } from "zod";

/** Roles in priority order (owner > admin > member). RBAC checks live in
    the orgs module + endpoint guards. The full admin-honouring rule set
    lands with Levers commit #7 (RBAC); this commit treats anything that
    mutates as owner-only and anything that reads as member+. */
export const OrgRoleSchema = z.enum(["owner", "admin", "member"]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

/** An org as returned to the public API. id + slug + name; timestamps
    rendered as ISO strings (matching how the rest of the API surface
    serialises TIMESTAMPTZ).

    Levers AR-200 added optional white-label fields. `display_name` is
    the customer-facing label; null means "fall back to `name`". `brand_url`
    is the org's public homepage URL — for "Powered by X" links on
    embeds. AR-284 adds `logo_url` for the dashboard's org-mark
    surfaces (sidebar OrgSwitcher, org settings page). All three
    nullable so a caller can clear them with `null`. */
export const OrgSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().nullable().optional(),
  brand_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict();
export type Org = z.infer<typeof OrgSchema>;

/** An org_members row. role is the canonical OrgRole enum.
    AR-310: email + name come from the LEFT JOIN with users — the dashboard
    members surface needs both to render rows without an N+1. email is "" on
    the legacy "user deleted but FK stub remains" path; name is null when the
    user never set a display name. */
export const OrgMemberSchema = z.object({
  org_id: z.string().min(1),
  user_id: z.string().min(1),
  role: OrgRoleSchema,
  joined_at: z.string(),
  email: z.string(),
  name: z.string().nullable(),
}).strict();
export type OrgMember = z.infer<typeof OrgMemberSchema>;

/** A pairing of an org with the caller's role in it. Returned by
    GET /v1/orgs so the client knows what they can do without a
    second round-trip. */
export const OrgWithRoleSchema = OrgSchema.extend({
  role: OrgRoleSchema,
}).strict();
export type OrgWithRole = z.infer<typeof OrgWithRoleSchema>;

/* ── request bodies ──────────────────────────────────────────────────── */

/** POST /v1/orgs — `name` mandatory; slug is derived server-side. */
export const CreateOrgRequestSchema = z.object({
  name: z.string().min(1).max(200),
  /** Optional explicit slug. If omitted, the server derives one from
      the name (lowercased, non-alphanumeric → '-', collision-suffixed). */
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
}).strict();
export type CreateOrgRequest = z.infer<typeof CreateOrgRequestSchema>;

/** PATCH /v1/orgs/:id — every field optional; at least one must be set.
    AR-200 adds white-label fields: `display_name` (customer-facing label;
    explicit `null` clears it back to `name`) and `brand_url` (homepage
    URL; explicit `null` clears it). */
export const UpdateOrgRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  display_name: z.string().min(1).max(200).nullable().optional(),
  brand_url: z.string().url().max(500).nullable().optional(),
  /* AR-284: org logo (paste-URL for v1). Same nullable semantics as
     brand_url — explicit null clears, omitted leaves unchanged. */
  logo_url: z.string().url().max(2000).nullable().optional(),
}).strict().refine(
  (b) =>
    b.name !== undefined ||
    b.slug !== undefined ||
    b.display_name !== undefined ||
    b.brand_url !== undefined ||
    b.logo_url !== undefined,
  { message: "At least one of name, slug, display_name, brand_url, or logo_url must be provided." },
);
export type UpdateOrgRequest = z.infer<typeof UpdateOrgRequestSchema>;

/** POST /v1/orgs/:id/members — add an existing user by id. Email-based
    invite is a future surface; this commit assumes the user already
    exists in `users`. */
export const AddMemberRequestSchema = z.object({
  user_id: z.string().min(1),
  /** Defaults to 'member' if omitted. Owner-only mutation. */
  role: OrgRoleSchema.optional(),
}).strict();
export type AddMemberRequest = z.infer<typeof AddMemberRequestSchema>;

/** PATCH /v1/orgs/:id/members/:userId — change a member's role (AR-273).
    Granting owner remains owner-only; admin-creates-admin/member is OK.
    The endpoint enforces both rules (RBAC + role-elevation guard). */
export const UpdateMemberRoleRequestSchema = z.object({
  role: OrgRoleSchema,
}).strict();
export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleRequestSchema>;

/* ── response shapes (the lists are arrays; the singular reads return
   one row or null/404 at the endpoint layer). ────────────────────────── */

export const ListOrgsResponseSchema = z.array(OrgWithRoleSchema);
export type ListOrgsResponse = z.infer<typeof ListOrgsResponseSchema>;

export const ListMembersResponseSchema = z.array(OrgMemberSchema);
export type ListMembersResponse = z.infer<typeof ListMembersResponseSchema>;
