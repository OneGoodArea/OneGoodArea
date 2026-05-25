import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/* resetModules per test so the module-level provider cache is fresh. */

beforeEach(() => {
  vi.resetModules();
  delete process.env.OGA_EMAIL_PROVIDER;
  delete process.env.RESEND_API_KEY;
});

afterAll(() => {
  delete process.env.OGA_EMAIL_PROVIDER;
  delete process.env.RESEND_API_KEY;
});

describe("getEmailProvider", () => {
  it("selects MailHog when OGA_EMAIL_PROVIDER=mailhog", async () => {
    process.env.OGA_EMAIL_PROVIDER = "mailhog";
    const { getEmailProvider } = await import("./index");
    const { MailhogEmailProvider } = await import("./mailhog-provider");
    expect(getEmailProvider()).toBeInstanceOf(MailhogEmailProvider);
  });

  it("defaults to Resend and constructs it with RESEND_API_KEY", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const { getEmailProvider } = await import("./index");
    const { ResendEmailProvider } = await import("./resend-provider");
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });

  it("caches the provider instance across calls", async () => {
    process.env.OGA_EMAIL_PROVIDER = "mailhog";
    const { getEmailProvider } = await import("./index");
    expect(getEmailProvider()).toBe(getEmailProvider());
  });

  it("fails loud when Resend is selected without an API key", async () => {
    const { getEmailProvider } = await import("./index");
    expect(() => getEmailProvider()).toThrow("Missing RESEND_API_KEY");
  });
});
