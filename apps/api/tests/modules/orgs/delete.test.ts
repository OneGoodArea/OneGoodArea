import { describe, it, expect, vi, beforeEach } from "vitest";

/* AR-399: deleteOrg routing. Owner-only, blocks personal-org deletion,
   cascades through every per-org child table via OrgRepository.deleteOrgEntirely. */

const { orgRepoMock } = vi.hoisted(() => ({
  orgRepoMock: {
    getRoleInOrg: vi.fn(),
    deleteOrgEntirely: vi.fn(),
  },
}));

vi.mock("@/infrastructure/db/dal", () => ({
  OrgRepository: class {
    getRoleInOrg = orgRepoMock.getRoleInOrg;
    deleteOrgEntirely = orgRepoMock.deleteOrgEntirely;
  },
  UserRepository: class { findById = vi.fn(); },
}));

import { deleteOrg, personalOrgId } from "@/modules/orgs";

beforeEach(() => {
  orgRepoMock.getRoleInOrg.mockReset();
  orgRepoMock.deleteOrgEntirely.mockReset();
});

describe("deleteOrg (AR-399)", () => {
  it("returns 'not_found' when the caller isn't a member of the org", async () => {
    orgRepoMock.getRoleInOrg.mockResolvedValue(null);
    const out = await deleteOrg("org_other", "user_1");
    expect(out).toBe("not_found");
    expect(orgRepoMock.deleteOrgEntirely).not.toHaveBeenCalled();
  });

  it("returns 'forbidden' when the caller is a non-owner member", async () => {
    orgRepoMock.getRoleInOrg.mockResolvedValue("admin");
    const out = await deleteOrg("org_real", "user_1");
    expect(out).toBe("forbidden");
    expect(orgRepoMock.deleteOrgEntirely).not.toHaveBeenCalled();
  });

  it("blocks deleting the caller's personal org even when they're the owner", async () => {
    /* Personal-org id formula is `org_${userId}` (see personalOrgId).
       Owner role on personal-org is the default for every signup, so
       without this guard a user could one-shot orphan themselves. */
    orgRepoMock.getRoleInOrg.mockResolvedValue("owner");
    const personalId = personalOrgId("user_1");
    const out = await deleteOrg(personalId, "user_1");
    expect(out).toBe("personal");
    expect(orgRepoMock.deleteOrgEntirely).not.toHaveBeenCalled();
  });

  it("deletes when the caller is owner of a non-personal org", async () => {
    orgRepoMock.getRoleInOrg.mockResolvedValue("owner");
    orgRepoMock.deleteOrgEntirely.mockResolvedValue(true);
    const out = await deleteOrg("org_test_xyz", "user_1");
    expect(out).toBe("deleted");
    expect(orgRepoMock.deleteOrgEntirely).toHaveBeenCalledWith("org_test_xyz");
  });

  it("returns 'not_found' when the cascade delete races (org disappeared between role check and delete)", async () => {
    orgRepoMock.getRoleInOrg.mockResolvedValue("owner");
    orgRepoMock.deleteOrgEntirely.mockResolvedValue(false);
    const out = await deleteOrg("org_test_xyz", "user_1");
    expect(out).toBe("not_found");
  });
});
