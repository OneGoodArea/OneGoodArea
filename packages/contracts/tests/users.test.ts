import { describe, it, expect } from "vitest";
import {
  USER_INTENTS,
  USER_ROLE_PREFERENCES,
  UserIntentSchema,
  UserRolePreferenceSchema,
  SignupSourceSchema,
  UserSchema,
  isUserIntent,
  isUserRolePreference,
} from "../src/users";

describe("UserIntentSchema (AR-218)", () => {
  it("accepts every canonical ICP", () => {
    for (const intent of USER_INTENTS) {
      expect(UserIntentSchema.parse(intent)).toBe(intent);
    }
  });

  it("accepts null (user skipped /welcome step 1)", () => {
    expect(UserIntentSchema.parse(null)).toBeNull();
  });

  it("rejects unknown intent values", () => {
    expect(() => UserIntentSchema.parse("buyers")).toThrow();
    expect(() => UserIntentSchema.parse("renters")).toThrow();
    expect(() => UserIntentSchema.parse("")).toThrow();
  });

  it("rejects non-string non-null values", () => {
    expect(() => UserIntentSchema.parse(42)).toThrow();
    expect(() => UserIntentSchema.parse({})).toThrow();
    expect(() => UserIntentSchema.parse(undefined)).toThrow();
  });
});

describe("isUserIntent (AR-218)", () => {
  it("returns true for canonical ICPs", () => {
    expect(isUserIntent("proptech")).toBe(true);
    expect(isUserIntent("lenders")).toBe(true);
    expect(isUserIntent("public-sector")).toBe(true);
  });

  it("returns false for everything else", () => {
    expect(isUserIntent("buyers")).toBe(false);
    expect(isUserIntent(null)).toBe(false);
    expect(isUserIntent(undefined)).toBe(false);
    expect(isUserIntent(42)).toBe(false);
    expect(isUserIntent("")).toBe(false);
  });
});

describe("SignupSourceSchema (AR-218)", () => {
  it("accepts marketing surface slugs", () => {
    expect(SignupSourceSchema.parse("lenders")).toBe("lenders");
    expect(SignupSourceSchema.parse("proptech")).toBe("proptech");
    expect(SignupSourceSchema.parse("homepage")).toBe("homepage");
  });

  it("accepts null (direct sign-up without ?from)", () => {
    expect(SignupSourceSchema.parse(null)).toBeNull();
  });

  it("trims whitespace", () => {
    expect(SignupSourceSchema.parse("  lenders  ")).toBe("lenders");
  });

  it("rejects empty strings (would be ambiguous with null)", () => {
    expect(() => SignupSourceSchema.parse("")).toThrow();
    expect(() => SignupSourceSchema.parse("   ")).toThrow();
  });

  it("rejects values longer than 64 chars (storage bound)", () => {
    const tooLong = "x".repeat(65);
    expect(() => SignupSourceSchema.parse(tooLong)).toThrow();
  });
});

describe("UserRolePreferenceSchema (AR-218)", () => {
  it("accepts every canonical role", () => {
    for (const role of USER_ROLE_PREFERENCES) {
      expect(UserRolePreferenceSchema.parse(role)).toBe(role);
    }
  });

  it("accepts null (user skipped /welcome step 3)", () => {
    expect(UserRolePreferenceSchema.parse(null)).toBeNull();
  });

  it("rejects unknown role values", () => {
    expect(() => UserRolePreferenceSchema.parse("admin")).toThrow();
    expect(() => UserRolePreferenceSchema.parse("developer")).toThrow();
    expect(() => UserRolePreferenceSchema.parse("")).toThrow();
  });

  it("rejects non-string non-null values", () => {
    expect(() => UserRolePreferenceSchema.parse(42)).toThrow();
    expect(() => UserRolePreferenceSchema.parse(undefined)).toThrow();
  });
});

describe("isUserRolePreference (AR-218)", () => {
  it("returns true for canonical roles", () => {
    expect(isUserRolePreference("engineer")).toBe(true);
    expect(isUserRolePreference("analyst")).toBe(true);
    expect(isUserRolePreference("explorer")).toBe(true);
  });

  it("returns false for everything else", () => {
    expect(isUserRolePreference("developer")).toBe(false);
    expect(isUserRolePreference(null)).toBe(false);
    expect(isUserRolePreference(undefined)).toBe(false);
    expect(isUserRolePreference(42)).toBe(false);
    expect(isUserRolePreference("")).toBe(false);
  });
});

describe("UserSchema (AR-218)", () => {
  const baseUser = {
    id: "user_123",
    email: "test@example.com",
    name: "Test User",
    image: null,
    provider: "credentials",
    email_verified: true,
    created_at: "2026-06-05T10:00:00.000Z",
    intent: "lenders" as const,
    signup_source: "lenders",
    role_preference: "engineer" as const,
  };

  it("parses a complete user row", () => {
    const parsed = UserSchema.parse(baseUser);
    expect(parsed.intent).toBe("lenders");
    expect(parsed.signup_source).toBe("lenders");
    expect(parsed.role_preference).toBe("engineer");
  });

  it("allows all three onboarding fields null (existing users + skippers)", () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      intent: null,
      signup_source: null,
      role_preference: null,
    });
    expect(parsed.intent).toBeNull();
    expect(parsed.signup_source).toBeNull();
    expect(parsed.role_preference).toBeNull();
  });

  it("rejects unknown intent on the full shape", () => {
    expect(() => UserSchema.parse({ ...baseUser, intent: "buyers" })).toThrow();
  });

  it("rejects unknown role_preference on the full shape", () => {
    expect(() => UserSchema.parse({ ...baseUser, role_preference: "admin" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => UserSchema.parse({ ...baseUser, email: "not-an-email" })).toThrow();
  });

  it("strict mode rejects extra fields (no silent drift)", () => {
    expect(() => UserSchema.parse({ ...baseUser, extra_field: "x" })).toThrow();
  });
});
