import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("./providers/index", () => ({ getEmailProvider: () => ({ send }) }));

import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendReportEmail,
} from "./senders";

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

  it("sendReportEmail renders score, area, workflow label, and top dimensions", async () => {
    await sendReportEmail("a@b.com", "rpt_1", {
      area: "Manchester",
      intent: "moving",
      areaiq_score: 72,
      area_type: "urban",
      summary: "Solid baseline.",
      sub_scores: [
        { label: "Safety", score: 60, weight: 0.3 },
        { label: "Transport", score: 80, weight: 0.5 },
      ],
    } as never);
    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("a@b.com");
    expect(msg.subject).toContain("Manchester");
    expect(msg.html).toContain("72");
    expect(msg.html).toContain("Top band"); // score >= 70 band label
    expect(msg.html).toContain("Origination"); // intentLabel("moving")
    expect(msg.html).toContain("Transport");
    expect(msg.html).toContain("/report/rpt_1");
  });
});
