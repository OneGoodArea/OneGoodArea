import { afterEach, describe, expect, it } from "vitest";
import { getRuntimeConfig, getRuntimeDiagnostics, resetRuntimeConfigForTests } from "@/lib/runtime/env";

const envKeys = [
  "OGA_LOCAL_RUNTIME_ENABLED",
  "OGA_SERVICE_MODE",
  "OGA_LOG_LEVEL",
  "DATABASE_URL",
  "POSTCODES_API_BASE_URL",
  "OGA_AI_PROVIDER",
  "OGA_EMAIL_PROVIDER",
];

describe("runtime env", () => {
  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    resetRuntimeConfigForTests();
  });

  it("loads layered defaults", async () => {
    process.env.OGA_LOCAL_RUNTIME_ENABLED = "true";
    process.env.OGA_SERVICE_MODE = "local-test";
    process.env.OGA_LOG_LEVEL = "verbose";
    process.env.DATABASE_URL = "postgres://oga_user:oga_test_password_local@localhost:55432/oga_local";
    process.env.POSTCODES_API_BASE_URL = "https://api.postcodes.io";

    const config = await getRuntimeConfig();

    expect(config.localRuntimeEnabled).toBe(true);
    expect(config.serviceMode).toBe("local-test");
    expect(config.logLevel).toBe("verbose");
    expect(config.databaseUrl).toContain("localhost:55432");
  });

  it("exposes safe diagnostics", async () => {
    process.env.OGA_LOCAL_RUNTIME_ENABLED = "true";
    process.env.DATABASE_URL = "postgres://oga_user:oga_test_password_local@localhost:55432/oga_local";
    process.env.POSTCODES_API_BASE_URL = "https://api.postcodes.io";

    const diagnostics = await getRuntimeDiagnostics();

    expect(diagnostics.hasDatabaseUrl).toBe(true);
    expect(diagnostics.postcodesApiBaseUrl).toBe("https://api.postcodes.io");
    expect(diagnostics.debug.composeFile).toBe("container-compose.yml");
    expect(diagnostics.debug.serviceUrls.app).toContain("http://localhost:");
  });
});
