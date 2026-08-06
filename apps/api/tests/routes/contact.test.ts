import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/infrastructure/email/senders", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendOrgInvitationEmail: vi.fn(),
  sendContactEmail: vi.fn(),
  sendContactConfirmationEmail: vi.fn(),
}));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/billing/stripe-client", () => ({
  stripe: { subscriptions: { retrieve: vi.fn() } },
}));

import { buildApp } from "@/app";
import { rateLimit } from "@/infrastructure/rate-limit";
import { sendContactEmail, sendContactConfirmationEmail } from "@/infrastructure/email/senders";

const app = await buildApp();

const mockRate = vi.mocked(rateLimit);
const mockSend = vi.mocked(sendContactEmail);
const mockConfirm = vi.mocked(sendContactConfirmationEmail);

const JSON_HEADERS = { "content-type": "application/json" };
function post(body: unknown) {
  return app.inject({ method: "POST", url: "/contact", headers: JSON_HEADERS, payload: JSON.stringify(body) });
}

const VALID = {
  name: "Dana Cole",
  email: "dana@lender.co.uk",
  company: "Northgate Lending",
  role: "lender",
  message: "We'd like to evaluate the Scores API for our underwriting workflow.",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
  mockSend.mockResolvedValue(undefined as never);
  mockConfirm.mockResolvedValue(undefined as never);
});

describe("POST /contact", () => {
  it("429s when the IP is rate-limited, without sending", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await post(VALID);
    expect(res.statusCode).toBe(429);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("400s on an invalid email", async () => {
    const res = await post({ ...VALID, email: "not-an-email" });
    expect(res.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("400s on a too-short message", async () => {
    const res = await post({ ...VALID, message: "hi" });
    expect(res.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends the enquiry and 200s on a valid submission", async () => {
    const res = await post(VALID);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      name: "Dana Cole",
      email: "dana@lender.co.uk",
      company: "Northgate Lending",
      role: "Lender",
      message: "We'd like to evaluate the Scores API for our underwriting workflow.",
    });
    expect(mockConfirm).toHaveBeenCalledWith("dana@lender.co.uk", "Dana Cole");
  });

  it("accepts silently and does not send when the honeypot is filled", async () => {
    const res = await post({ ...VALID, website: "http://spam.example" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it("treats company and role as optional", async () => {
    const res = await post({
      name: "Sam",
      email: "sam@firm.io",
      message: "Interested in the Signals API for a pilot.",
    });
    expect(res.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ company: null, role: null }));
  });

  it("accepts the estate agent role", async () => {
    const res = await post({ ...VALID, role: "estate-agent" });
    expect(res.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ role: "Estate agent" }));
  });

  it("rejects an unknown role", async () => {
    const res = await post({ ...VALID, role: "landlords" });
    expect(res.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("still 200s and sends the notification even if the confirmation email fails", async () => {
    mockConfirm.mockRejectedValue(new Error("smtp down"));
    const res = await post(VALID);
    expect(res.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });
});
