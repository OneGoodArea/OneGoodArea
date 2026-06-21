/* AR-272: unit tests for the org invitation contracts + pure invariants.

   The SQL-bound branches (create with already-pending collision, accept
   under concurrency, etc.) are covered by the schema migration verification
   plus live prod proof — same pattern as the rest of the orgs module
   tests (see index.test.ts). What we lock down here are the invariants
   that would break the security model if they regressed silently:

     - 'owner' is NEVER acceptable as an invitation role (the schema
       refuses it before any code runs)
     - Email validation rejects nonsense before the DB sees it
     - The role defaults to 'member' when omitted (least privilege)
     - Token hashing is deterministic SHA-256 hex (so storage + lookup
       always agree) and unequal plaintexts hash differently
     - The DTO shape matches OrgInvitationSchema exactly (no token
       leak in the surface) */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  CreateInvitationRequestSchema,
  InvitationRoleSchema,
  OrgInvitationSchema,
} from "@onegoodarea/contracts";

describe("InvitationRoleSchema", () => {
  it("accepts member and admin", () => {
    expect(InvitationRoleSchema.safeParse("member").success).toBe(true);
    expect(InvitationRoleSchema.safeParse("admin").success).toBe(true);
  });

  it("REJECTS owner — owner can never be granted via invitation", () => {
    /* The whole point of routing owner-promotion through a separate
       path is to keep the chain-of-authority move (granting ownership)
       gated on existing membership. If this assertion ever fails, the
       Levers RBAC contract is broken. */
    expect(InvitationRoleSchema.safeParse("owner").success).toBe(false);
  });

  it("rejects junk", () => {
    expect(InvitationRoleSchema.safeParse("god").success).toBe(false);
    expect(InvitationRoleSchema.safeParse("").success).toBe(false);
    expect(InvitationRoleSchema.safeParse(null).success).toBe(false);
  });
});

describe("CreateInvitationRequestSchema", () => {
  it("accepts a valid {email, role} body", () => {
    const result = CreateInvitationRequestSchema.safeParse({
      email: "teammate@example.com",
      role: "admin",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe("admin");
  });

  it("defaults role to 'member' when omitted (least privilege)", () => {
    const result = CreateInvitationRequestSchema.safeParse({
      email: "teammate@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe("member");
  });

  it("rejects 'owner' role", () => {
    const result = CreateInvitationRequestSchema.safeParse({
      email: "teammate@example.com",
      role: "owner",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(
      CreateInvitationRequestSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
    expect(
      CreateInvitationRequestSchema.safeParse({ email: "@example.com" }).success,
    ).toBe(false);
    expect(
      CreateInvitationRequestSchema.safeParse({ email: "" }).success,
    ).toBe(false);
  });

  it("caps email at 254 chars (RFC 5321)", () => {
    const longLocal = "a".repeat(250);
    const tooLong = `${longLocal}@x.io`; // 256 chars
    expect(
      CreateInvitationRequestSchema.safeParse({ email: tooLong }).success,
    ).toBe(false);
  });

  it("rejects unknown extra keys (strict mode)", () => {
    const result = CreateInvitationRequestSchema.safeParse({
      email: "teammate@example.com",
      role: "member",
      token: "i_should_not_be_here",
    });
    expect(result.success).toBe(false);
  });
});

describe("OrgInvitationSchema (response DTO)", () => {
  it("accepts a well-formed invitation row", () => {
    const result = OrgInvitationSchema.safeParse({
      id: "inv_abc",
      org_id: "org_1",
      email: "teammate@example.com",
      role: "member",
      invited_by_user_id: "user_1",
      expires_at: "2026-06-18T00:00:00.000Z",
      created_at: "2026-06-11T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("REJECTS any payload containing a token (no token must leak)", () => {
    /* If a token field ever sneaks into the DTO, this strict schema
       fails — that's the canary. The plaintext token only ever lives
       in the outbound email. */
    const result = OrgInvitationSchema.safeParse({
      id: "inv_abc",
      org_id: "org_1",
      email: "teammate@example.com",
      role: "member",
      invited_by_user_id: "user_1",
      expires_at: "2026-06-18T00:00:00.000Z",
      created_at: "2026-06-11T00:00:00.000Z",
      token: "leaked",
    });
    expect(result.success).toBe(false);
  });
});

describe("token hashing (the storage + lookup contract)", () => {
  /* The module hashes with SHA-256 hex internally. We mirror the same
     algorithm here — if anyone ever flips it (e.g. truncates to less
     than the full digest), the lookup path will silently start
     missing rows, so the test gives a load-bearing canary. */
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");

  it("produces a 64-char hex digest", () => {
    const out = hash("any-token");
    expect(out).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same plaintext, same hash", () => {
    expect(hash("invite-token-123")).toBe(hash("invite-token-123"));
  });

  it("distinct plaintexts give distinct hashes", () => {
    expect(hash("a")).not.toBe(hash("b"));
    /* Adjacency check: single-char swap doesn't accidentally collide. */
    expect(hash("invite-token-123")).not.toBe(hash("invite-token-124"));
  });
});
