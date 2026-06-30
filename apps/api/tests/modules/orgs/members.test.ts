import { describe, it, expect, vi, beforeEach } from "vitest";

/* AR-388: addMember FK-validates user_id against the `users` table
   before inserting into `org_members`. Pre-AR-388, /v1/orgs/:id/members
   accepted arbitrary user_id strings — surfaced as a security finding
   in api-end-to-end-2026-06-12.md #2. */

const { orgRepoMock, userRepoMock } = vi.hoisted(() => ({
  orgRepoMock: {
    addMember: vi.fn(),
    listMembers: vi.fn(),
  },
  userRepoMock: { findById: vi.fn() },
}));

vi.mock("@/infrastructure/db/dal", () => ({
  OrgRepository: class {
    addMember = orgRepoMock.addMember;
    listMembers = orgRepoMock.listMembers;
  },
  UserRepository: class { findById = userRepoMock.findById; },
}));

import { addMember, listMembers } from "@/modules/orgs";

beforeEach(() => {
  orgRepoMock.addMember.mockReset();
  orgRepoMock.listMembers.mockReset();
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

/* AR-389: row → DTO shapers emit ISO timestamps. The pg driver returns
   TIMESTAMPTZ as JS Date objects; the previous String(date) leaked
   Date.prototype.toString() output ("Wed May 27 2026 23:50:10 GMT...")
   through the API surface. */
describe("listMembers row shaping (AR-389 ISO dates)", () => {
  it("formats joined_at as ISO when the DB returns a Date object", async () => {
    const date = new Date("2026-05-27T23:50:10.000Z");
    orgRepoMock.listMembers.mockResolvedValue([
      { org_id: "org_1", user_id: "u_1", role: "owner", joined_at: date, email: "x@x.com", name: "X" },
    ]);
    const out = await listMembers("org_1");
    expect(out).toHaveLength(1);
    expect(out[0].joined_at).toBe("2026-05-27T23:50:10.000Z");
    expect(out[0].joined_at).not.toMatch(/GMT/); // not Date.toString()
  });

  it("passes through an already-ISO string verbatim", async () => {
    orgRepoMock.listMembers.mockResolvedValue([
      { org_id: "org_1", user_id: "u_1", role: "member", joined_at: "2026-06-30T12:00:00.000Z", email: "y@y.com", name: null },
    ]);
    const out = await listMembers("org_1");
    expect(out[0].joined_at).toBe("2026-06-30T12:00:00.000Z");
  });
});
