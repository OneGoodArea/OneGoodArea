/* Levers (AR-194): unit tests for the orgs module pure helpers.
   Integration tests for the SQL paths are covered by the migration
   verification (ADR 0027) + the live prod proof in this commit's
   acceptance step (see ADR 0028 Proven on prod). */

import { describe, it, expect } from "vitest";
import { slugify, personalOrgSlug, personalOrgId, hasAtLeastRole, ROLE_RANK } from "@/modules/orgs/index";

describe("orgs/slugify", () => {
  it("lowercases + replaces non-alphanumeric with single dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("FOO@bar.com")).toBe("foo-bar-com");
  });

  it("collapses runs of separators into one dash", () => {
    expect(slugify("a___b---c   d")).toBe("a-b-c-d");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("---hello---")).toBe("hello");
    expect(slugify("@@@foo@@@")).toBe("foo");
  });

  it("returns empty string for all-symbol input (caller picks a fallback)", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("is idempotent: slugify(slugify(x)) === slugify(x)", () => {
    const samples = ["Hello World", "FOO@bar.com", "a___b---c", "---hi---"];
    for (const s of samples) {
      expect(slugify(slugify(s))).toBe(slugify(s));
    }
  });
});

describe("orgs/personalOrgId", () => {
  it("prepends 'org_' to the userId — matches the migration backfill formula", () => {
    expect(personalOrgId("user_abc123")).toBe("org_user_abc123");
  });

  it("is deterministic", () => {
    expect(personalOrgId("user_1")).toBe(personalOrgId("user_1"));
  });
});

describe("orgs/personalOrgSlug", () => {
  it("combines email local-part + first 12 chars of user_id (matches migration backfill)", () => {
    // 12 chars of user_id gives 36 bits of entropy on top of the email local-
    // part. The migration uses the same formula; tests pin that contract.
    const slug = personalOrgSlug("cara.robinson0903@example.com", "user_1773084abcdef9999");
    expect(slug).toBe("cara-robinson0903-user_1773084");
  });

  it("normalises the email local-part through slugify", () => {
    const slug = personalOrgSlug("Pedro+test@gmail.com", "user_aaaabbbbcccc");
    expect(slug.startsWith("pedro-test-")).toBe(true);
    expect(slug).toBe("pedro-test-user_aaaabbb");
  });

  it("handles empty email local-part defensively", () => {
    // E.g. malformed "@example.com" — defensive fallback. Real input is
    // sanitised upstream; this guards against the helper crashing.
    const slug = personalOrgSlug("@example.com", "user_xxxxxxxxxxxx");
    expect(slug).toBe("-user_xxxxxxx");
  });

  it("is deterministic for the same (email, userId) pair", () => {
    const a = personalOrgSlug("foo@bar.com", "user_zzzzzzzzzzzz");
    const b = personalOrgSlug("foo@bar.com", "user_zzzzzzzzzzzz");
    expect(a).toBe(b);
  });
});

/* Levers AR-199 — RBAC role-rank precedence. */
describe("orgs/hasAtLeastRole", () => {
  it("owner >= owner | admin | member", () => {
    expect(hasAtLeastRole("owner", "owner")).toBe(true);
    expect(hasAtLeastRole("owner", "admin")).toBe(true);
    expect(hasAtLeastRole("owner", "member")).toBe(true);
  });

  it("admin >= admin | member, but NOT owner", () => {
    expect(hasAtLeastRole("admin", "admin")).toBe(true);
    expect(hasAtLeastRole("admin", "member")).toBe(true);
    expect(hasAtLeastRole("admin", "owner")).toBe(false);
  });

  it("member >= member only", () => {
    expect(hasAtLeastRole("member", "member")).toBe(true);
    expect(hasAtLeastRole("member", "admin")).toBe(false);
    expect(hasAtLeastRole("member", "owner")).toBe(false);
  });

  it("ROLE_RANK is strictly ascending owner > admin > member", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.member);
  });
});
