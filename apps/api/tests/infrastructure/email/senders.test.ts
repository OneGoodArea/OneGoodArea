import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("@/infrastructure/email/providers/index", () => ({ getEmailProvider: () => ({ send }) }));

import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "@/infrastructure/email/senders";

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue(undefined);
});

describe("email senders", () => {
  it("sendVerificationEmail sends a verify link to the address", async () => {
    await sendVerificationEmail("a@b.com", "tok123");
    expect(send).toHaveBeenCalledTimes(1);
    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("a@b.com");
    expect(msg.from).toContain("noreply@onegoodarea.com");
    expect(msg.subject).toContain("Verify your email");
    expect(msg.html).toContain("/verify?token=tok123");
  });

  it("sendPasswordResetEmail sends a reset link", async () => {
    await sendPasswordResetEmail("a@b.com", "rtok");
    const msg = send.mock.calls[0][0];
    expect(msg.subject).toContain("Reset your password");
    expect(msg.html).toContain("/reset-password?token=rtok");
  });

  it("sendWelcomeEmail HTML-escapes the user name", async () => {
    await sendWelcomeEmail("a@b.com", "<script>x</script>");
    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Welcome to OneGoodArea");
    expect(msg.html).not.toContain("<script>x</script>");
    expect(msg.html).toContain("&lt;script&gt;");
  });

  /* AR-407: sendReportEmail removed alongside the AR-324 reports kill. */
});
