import { describe, it, expect, vi, beforeEach } from "vitest";

/* AR-388: addMember FK-validates user_id against the `users` table
   before inserting into `org_members`. Pre-AR-388, /v1/orgs/:id/members
   accepted arbitrary user_id strings — surfaced as a security finding
   in api-end-to-end-2026-06-12.md #2. */

const { orgRepoMock, userRepoMock } = vi.hoisted(() => ({
  orgRepoMock: { addMember: vi.fn() },
  userRepoMock: { findById: vi.fn() },
}));

vi.mock("@/infrastructure/db/dal", () => ({
  OrgRepository: class { addMember = orgRepoMock.addMember; },
  UserRepository: class { findById = userRepoMock.findById; },
}));

import { addMember } from "@/modules/orgs";

beforeEach(() => {
  orgRepoMock.addMember.mockReset();
  userRepoMock.findById.mockReset();
});

describe("addMember (AR-388 FK validation)", () => {
  it("returns false when the target user_id does NOT exist in users", async () => {
    userRepoMock.findById.mockResolvedValue(null);
    const result = await addMember({ orgId: "org_1", userId: "ghost_user", role: "member" });
    expect(result).toBe(false);
    // Critical: never reached the org_members INSERT.
    expect(orgRepoMock.addMember).not.toHaveBeenCalled();
  });

  it("returns true and inserts when the user exists", async () => {
    userRepoMock.findById.mockResolvedValue({ id: "user_real", email: "x@x.com" });
    orgRepoMock.addMember.mockResolvedValue(undefined);
    const result = await addMember({ orgId: "org_1", userId: "user_real", role: "admin" });
    expect(result).toBe(true);
    expect(orgRepoMock.addMember).toHaveBeenCalledWith("org_1", "user_real", "admin");
  });

  it("checks user existence BEFORE touching org_members (no privilege-escalation race)", async () => {
    userRepoMock.findById.mockResolvedValue(null);
    await addMember({ orgId: "org_1", userId: "ghost", role: "owner" });
    // The crucial security invariant: even when 'role: owner' is requested,
    // no DB write happens for a non-existent user.
    expect(orgRepoMock.addMember).not.toHaveBeenCalled();
  });
});
