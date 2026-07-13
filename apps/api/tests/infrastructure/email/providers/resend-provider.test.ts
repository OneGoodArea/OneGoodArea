import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/* AR-459: the provider must surface Resend's { error } (it does not throw
   on API-level failures) so a rejected send becomes a real error, not a
   silent success. Mock the resend SDK so we control the send result. */

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { ResendEmailProvider } from "@/infrastructure/email/providers/resend-provider";

const MSG = {
  from: "OneGoodArea <noreply@onegoodarea.com>",
  to: "buyer@example.com",
  subject: "Hi",
  html: "<p>hi</p>",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
});

afterAll(() => {
  delete process.env.RESEND_API_KEY;
});

describe("ResendEmailProvider.send", () => {
  it("resolves when Resend returns no error", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const provider = new ResendEmailProvider();
    await expect(provider.send(MSG)).resolves.toBeUndefined();
    expect(sendMock).toHaveBeenCalledWith(MSG);
  });

  it("throws when Resend returns an error so failures are not swallowed", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "The onegoodarea.com domain is not verified." },
    });
    const provider = new ResendEmailProvider();
    await expect(provider.send(MSG)).rejects.toThrow(/not verified/);
  });
});
