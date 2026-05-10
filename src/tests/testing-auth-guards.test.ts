import { afterEach, describe, expect, it } from "vitest";
import { resolveTestingRouteAccess } from "@/lib/runtime/testing/guards";

const envKeys = ["NODE_ENV", "OGA_ENABLE_TESTING_AUTH_ROUTES", "OGA_TESTING_AUTH_TOKEN"];

describe("testing auth guards", () => {
  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("blocks routes when disabled", () => {
    process.env.NODE_ENV = "development";
    process.env.OGA_ENABLE_TESTING_AUTH_ROUTES = "false";

    const result = resolveTestingRouteAccess({ headers: new Headers() });

    expect(result).toEqual({
      status: 403,
      body: { error: "Testing auth routes are disabled" },
    });
  });

  it("requires the auth token when configured", () => {
    process.env.NODE_ENV = "development";
    process.env.OGA_ENABLE_TESTING_AUTH_ROUTES = "true";
    process.env.OGA_TESTING_AUTH_TOKEN = "secret-token";

    const result = resolveTestingRouteAccess({
      headers: new Headers({ "x-test-auth-token": "wrong-token" }),
    });

    expect(result).toEqual({
      status: 401,
      body: { error: "Invalid testing auth token" },
    });
  });
});
