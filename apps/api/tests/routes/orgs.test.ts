import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({
  hasApiAccess: vi.fn(),
  canMakeApiCall: vi.fn(),
  hasLeversAccess: vi.fn(async () => true),
  getUserEmail: vi.fn(),
}));
vi.mock("@/modules/tiers", async (orig) => ({
  ...(await orig() as object),
  resolveTier: vi.fn(async () => "basic"),
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn(), query: vi.fn() }));
vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));

vi.mock("@/modules/orgs", () => ({
  createOrgWithOwner: vi.fn(),
  listOrgsForUser: vi.fn(),
  getOrgIfMember: vi.fn(),
  updateOrg: vi.fn(),
  deleteOrg: vi.fn(),
  getRoleInOrg: vi.fn(),
  hasAtLeastRole: vi.fn((actual: string, required: string) => {
    const rank: Record<string, number> = { member: 1, admin: 2, owner: 3 };
    return (rank[actual] ?? 0) >= (rank[required] ?? 0);
  }),
  listMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  changeMemberRole: vi.fn(),
  countOwners: vi.fn(),
}));

vi.mock("@/modules/orgs/cohorts", () => ({
  listCohorts: vi.fn(),
  getCohort: vi.fn(),
  createCohort: vi.fn(),
  updateCohort: vi.fn(),
  deleteCohort: vi.fn(),
}));

vi.mock("@/modules/orgs/invitations", () => ({
  listPendingInvitations: vi.fn(),
  createInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
}));

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess, getUserEmail } from "@/modules/usage";
import { trackEvent } from "@/modules/tracking/activity";
import { verifySessionToken } from "@/modules/auth/session-token";
import * as orgs from "@/modules/orgs";
import * as cohorts from "@/modules/orgs/cohorts";
import * as invitations from "@/modules/orgs/invitations";

const app = await buildApp();
afterAll(() => app.close());

const auth = { authorization: "Bearer bridge_token" };

const mockOrg = {
  id: "org_1", slug: "test-org", name: "Test Org",
  display_name: null, brand_url: null, logo_url: null,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySessionToken).mockResolvedValue({ userId: "user_1" });
  vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  vi.mocked(hasApiAccess).mockResolvedValue(true);
});

// ── orgs CRUD ──────────────────────────────────────────────────────

describe("orgs CRUD", () => {
  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/orgs" });
    expect(res.statusCode).toBe(401);
  });

  it("POST /v1/orgs: creates org and returns OrgSchema", async () => {
    vi.mocked(orgs.createOrgWithOwner).mockResolvedValue(mockOrg);
    const res = await app.inject({
      method: "POST", url: "/v1/orgs",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ name: "Test Org" }),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe("org_1");
    expect(body.slug).toBe("test-org");
    expect(body.name).toBe("Test Org");
    expect(body.created_at).toBeDefined();
  });

  it("POST /v1/orgs: 400 on missing name", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/orgs",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /v1/orgs: returns list of OrgWithRole", async () => {
    vi.mocked(orgs.listOrgsForUser).mockResolvedValue([
      { ...mockOrg, role: "owner" },
      { ...mockOrg, id: "org_2", slug: "second", name: "Second", role: "member" },
    ]);
    const res = await app.inject({ method: "GET", url: "/v1/orgs", headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.orgs).toHaveLength(2);
    expect(body.orgs[0].role).toBe("owner");
    expect(body.orgs[1].role).toBe("member");
  });

  it("GET /v1/orgs/:id: returns OrgSchema", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.getOrgIfMember).mockResolvedValue(mockOrg);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_1", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("org_1");
  });

  it("GET /v1/orgs/:id: 404 when not member", async () => {
    vi.mocked(orgs.getOrgIfMember).mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_x", headers: auth });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /v1/orgs/:id: updates org", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.updateOrg).mockResolvedValue({ ...mockOrg, name: "Renamed" });
    const res = await app.inject({
      method: "PATCH", url: "/v1/orgs/org_1",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Renamed");
  });

  it("PATCH /v1/orgs/:id: 403 for non-admin", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("member");
    const res = await app.inject({
      method: "PATCH", url: "/v1/orgs/org_1",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ name: "X" }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("DELETE /v1/orgs/:id: owner deletes successfully", async () => {
    vi.mocked(orgs.deleteOrg).mockResolvedValue("deleted");
    const res = await app.inject({ method: "DELETE", url: "/v1/orgs/org_1", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().deleted).toBe(true);
  });

  it("DELETE /v1/orgs/:id: 403 for non-owner", async () => {
    vi.mocked(orgs.deleteOrg).mockResolvedValue("forbidden");
    const res = await app.inject({ method: "DELETE", url: "/v1/orgs/org_1", headers: auth });
    expect(res.statusCode).toBe(403);
  });

  it("DELETE /v1/orgs/:id: 409 for personal org", async () => {
    vi.mocked(orgs.deleteOrg).mockResolvedValue("personal");
    const res = await app.inject({ method: "DELETE", url: "/v1/orgs/org_1", headers: auth });
    expect(res.statusCode).toBe(409);
  });
});

// ── org-members ────────────────────────────────────────────────────

describe("org-members", () => {
  const mockMember = {
    org_id: "org_1", user_id: "user_1", role: "member" as const,
    joined_at: "2026-01-01T00:00:00.000Z", email: "a@b.com", name: "Alice",
  };

  it("GET /v1/orgs/:id/members: returns list with org_id and caller_role", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.listMembers).mockResolvedValue([mockMember]);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_1/members", headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.org_id).toBe("org_1");
    expect(body.caller_role).toBe("owner");
    expect(body.members).toHaveLength(1);
    expect(body.members[0].email).toBe("a@b.com");
  });

  it("GET /v1/orgs/:id/members: 404 when org not found", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_x/members", headers: auth });
    expect(res.statusCode).toBe(404);
  });

  it("POST /v1/orgs/:id/members: 201 when added", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.addMember).mockResolvedValue(true);
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/members",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ user_id: "user_2" }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it("POST /v1/orgs/:id/members: 404 when user not found", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.addMember).mockResolvedValue(false);
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/members",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ user_id: "nonexistent" }),
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /v1/orgs/:id/members: 403 for non-admin", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("member");
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/members",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ user_id: "user_2" }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("PATCH /v1/orgs/:id/members/:userId: changes role", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.changeMemberRole).mockResolvedValue(true);
    const res = await app.inject({
      method: "PATCH", url: "/v1/orgs/org_1/members/user_2",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ role: "admin" }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("DELETE /v1/orgs/:id/members/:userId: removes member", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(orgs.removeMember).mockResolvedValue(true);
    const res = await app.inject({
      method: "DELETE", url: "/v1/orgs/org_1/members/user_2",
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().deleted).toBe(true);
  });

  it("DELETE /v1/orgs/:id/members/:userId: self-removal", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("member");
    vi.mocked(orgs.removeMember).mockResolvedValue(true);
    const res = await app.inject({
      method: "DELETE", url: "/v1/orgs/org_1/members/user_1",
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── org-cohorts ────────────────────────────────────────────────────

describe("org-cohorts", () => {
  const mockCohort = {
    id: "coh_1", org_id: "org_1", slug: "central", name: "Central",
    geo_codes: ["E01000001"], created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("POST /v1/orgs/:id/cohorts: creates cohort", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(cohorts.createCohort).mockResolvedValue(mockCohort);
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/cohorts",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ name: "Central", geo_codes: ["E01000001"] }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe("coh_1");
    expect(res.json().geo_codes).toEqual(["E01000001"]);
  });

  it("POST /v1/orgs/:id/cohorts: 403 for non-admin", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("member");
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/cohorts",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ name: "X", geo_codes: ["E01000001"] }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET /v1/orgs/:id/cohorts: returns list with org_id and caller_role", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("admin");
    vi.mocked(cohorts.listCohorts).mockResolvedValue([mockCohort]);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_1/cohorts", headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.org_id).toBe("org_1");
    expect(body.caller_role).toBe("admin");
    expect(body.cohorts).toHaveLength(1);
    expect(body.cohorts[0].slug).toBe("central");
  });

  it("GET /v1/orgs/:id/cohorts/:cohortId: returns single cohort", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("member");
    vi.mocked(cohorts.getCohort).mockResolvedValue(mockCohort);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_1/cohorts/coh_1", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("coh_1");
  });

  it("GET /v1/orgs/:id/cohorts/:cohortId: 404 when not found", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("member");
    vi.mocked(cohorts.getCohort).mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_1/cohorts/coh_x", headers: auth });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /v1/orgs/:id/cohorts/:cohortId: updates cohort", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(cohorts.updateCohort).mockResolvedValue({ ...mockCohort, name: "Renamed" });
    const res = await app.inject({
      method: "PATCH", url: "/v1/orgs/org_1/cohorts/coh_1",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Renamed");
  });

  it("DELETE /v1/orgs/:id/cohorts/:cohortId: deletes cohort", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(cohorts.deleteCohort).mockResolvedValue(true);
    const res = await app.inject({
      method: "DELETE", url: "/v1/orgs/org_1/cohorts/coh_1",
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().deleted).toBe(true);
  });

  it("DELETE /v1/orgs/:id/cohorts/:cohortId: 404 when not found", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(cohorts.deleteCohort).mockResolvedValue(false);
    const res = await app.inject({
      method: "DELETE", url: "/v1/orgs/org_1/cohorts/coh_x",
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
  });
});

// ── org-invitations ────────────────────────────────────────────────

describe("org-invitations", () => {
  const mockInvitation = {
    id: "inv_1", org_id: "org_1", email: "new@user.com", role: "member" as const,
    invited_by_user_id: "user_1", expires_at: "2026-12-31T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z",
  };

  it("POST /v1/orgs/:id/invitations: creates invitation", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(invitations.createInvitation).mockResolvedValue({ ok: true, invitation: mockInvitation });
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/invitations",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ email: "new@user.com", role: "member" }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().invitation.email).toBe("new@user.com");
  });

  it("POST /v1/orgs/:id/invitations: 409 when already pending", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(invitations.createInvitation).mockResolvedValue({ ok: false, error: { code: "invitation_already_pending" } });
    const res = await app.inject({
      method: "POST", url: "/v1/orgs/org_1/invitations",
      headers: { ...auth, "content-type": "application/json" },
      payload: JSON.stringify({ email: "new@user.com" }),
    });
    expect(res.statusCode).toBe(409);
  });

  it("GET /v1/orgs/:id/invitations: returns list", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(invitations.listPendingInvitations).mockResolvedValue([mockInvitation]);
    const res = await app.inject({ method: "GET", url: "/v1/orgs/org_1/invitations", headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().invitations).toHaveLength(1);
    expect(res.json().invitations[0].email).toBe("new@user.com");
  });

  it("DELETE /v1/orgs/:id/invitations/:invitationId: revokes invitation", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(invitations.revokeInvitation).mockResolvedValue(true);
    const res = await app.inject({
      method: "DELETE", url: "/v1/orgs/org_1/invitations/inv_1",
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().revoked).toBe(true);
  });

  it("DELETE /v1/orgs/:id/invitations/:invitationId: 404 when not found", async () => {
    vi.mocked(orgs.getRoleInOrg).mockResolvedValue("owner");
    vi.mocked(invitations.revokeInvitation).mockResolvedValue(false);
    const res = await app.inject({
      method: "DELETE", url: "/v1/orgs/org_1/invitations/inv_x",
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
  });
});
