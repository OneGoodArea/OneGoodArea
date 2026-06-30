import { logger } from "@/lib/logger";
import { APP_URL, EMAIL_FROM } from "@/lib/config";
import { getEmailProvider } from "@/lib/email/providers";

/* ────────────────────────────────────────────────────────────
   OneGoodArea email templates.
   Cream surface, forest-ink text, chartreuse accent.
   Email clients limit CSS to inline styles + a small set of
   properties; no flex, no @import, no custom fonts. We use
   system-stack fonts (Georgia for serif, system sans-serif).
   ──────────────────────────────────────────────────────────── */

const COLORS = {
  ink: "#0A4D3A",
  inkDeep: "#062A1E",
  signal: "#D4F33A",
  signalInk: "#1A2600",
  signalDim: "#E9F69E",
  bg: "#F6F9F4",
  card: "#FFFFFF",
  border: "#E4EAE3",
  borderDim: "#F0F3EE",
  text: "#0B2018",
  text2: "#445A51",
  text3: "#6E8278",
};

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_MONO = "ui-monospace, 'SF Mono', 'Menlo', 'Consolas', monospace";

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:${COLORS.bg}; font-family:${FONT_SANS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg}; padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%;">
          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:28px;">
              <span style="font-family:${FONT_SERIF}; font-size:22px; font-weight:500; letter-spacing:-0.5px; color:${COLORS.inkDeep};">One<span style="font-style:italic; color:${COLORS.ink}; border-bottom:2px solid ${COLORS.signal}; padding-bottom:1px;">Good</span>Area</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:6px; padding:36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:22px; text-align:center;">
              <span style="font-family:${FONT_MONO}; font-size:11px; color:${COLORS.text3}; letter-spacing:1.5px; text-transform:uppercase;">
                onegoodarea.com
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="background-color:${COLORS.signal}; border:1px solid ${COLORS.inkDeep}; border-radius:999px; padding:12px 22px;">
        <a href="${href}" style="font-family:${FONT_MONO}; font-size:12px; font-weight:500; color:${COLORS.signalInk}; text-decoration:none; letter-spacing:1.5px; text-transform:uppercase;">${label} &rarr;</a>
      </td>
    </tr>
  </table>`;
}

function ghostButton(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background-color:transparent; border:1px solid ${COLORS.border}; border-radius:999px; padding:12px 22px;">
        <a href="${href}" style="font-family:${FONT_MONO}; font-size:12px; font-weight:500; color:${COLORS.ink}; text-decoration:none; letter-spacing:1.5px; text-transform:uppercase;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* AR-250 [AR-248-B] magic-link sign-in email. The link signs the
   user in directly when clicked — replaces the "forgot password" flow
   per the AR-248 proposal. 15-min TTL matches industry norm and is
   short enough to limit risk if an email is forwarded or replicated. */
export async function sendMagicLinkEmail(email: string, token: string) {
  const magicUrl = `${APP_URL}/auth/magic-link?token=${token}`;

  const content = `
    <h1 style="font-family:${FONT_SERIF}; font-size:26px; font-weight:400; letter-spacing:-0.5px; color:${COLORS.inkDeep}; margin:0 0 10px 0; line-height:1.15;">
      Sign in to <em style="font-style:italic; color:${COLORS.ink}; border-bottom:2px solid ${COLORS.signal}; padding-bottom:1px;">OneGoodArea</em>.
    </h1>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 26px 0;">
      Click the button below to sign in. This link is single-use and expires in 15 minutes.
    </p>
    ${ctaButton("Sign in", magicUrl)}
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 8px 0; letter-spacing:1.5px; text-transform:uppercase;">
      Or paste this link
    </p>
    <p style="font-family:${FONT_MONO}; font-size:11px; color:${COLORS.ink}; word-break:break-all; margin:0 0 26px 0;">
      ${magicUrl}
    </p>
    <div style="border-top:1px solid ${COLORS.borderDim}; padding-top:18px;">
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text3}; margin:0; line-height:1.5;">
        This link expires in 15 minutes. If you didn&apos;t request this, ignore this email.
      </p>
    </div>
  `;

  await (await getEmailProvider()).send({
    from: EMAIL_FROM,
    to: email,
    subject: "Sign in to OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  const content = `
    <h1 style="font-family:${FONT_SERIF}; font-size:26px; font-weight:400; letter-spacing:-0.5px; color:${COLORS.inkDeep}; margin:0 0 10px 0; line-height:1.15;">
      Verify your <em style="font-style:italic; color:${COLORS.ink}; border-bottom:2px solid ${COLORS.signal}; padding-bottom:1px;">email</em>.
    </h1>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 26px 0;">
      Click the button below to confirm your email address and activate your OneGoodArea account.
    </p>
    ${ctaButton("Verify email", verifyUrl)}
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 8px 0; letter-spacing:1.5px; text-transform:uppercase;">
      Or paste this link
    </p>
    <p style="font-family:${FONT_MONO}; font-size:11px; color:${COLORS.ink}; word-break:break-all; margin:0 0 26px 0;">
      ${verifyUrl}
    </p>
    <div style="border-top:1px solid ${COLORS.borderDim}; padding-top:18px;">
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text3}; margin:0; line-height:1.5;">
        This link expires in 24 hours. If you didn&apos;t create an account, ignore this email.
      </p>
    </div>
  `;

  await (await getEmailProvider()).send({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your email | OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const safeName = escapeHtml(name);
  const content = `
    <h1 style="font-family:${FONT_SERIF}; font-size:26px; font-weight:400; letter-spacing:-0.5px; color:${COLORS.inkDeep}; margin:0 0 10px 0; line-height:1.15;">
      Welcome to <em style="font-style:italic; color:${COLORS.ink}; border-bottom:2px solid ${COLORS.signal}; padding-bottom:1px;">OneGoodArea</em>.
    </h1>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 24px 0;">
      ${safeName}, your account is verified. You start on the Sandbox tier: 35 API calls a month for evaluation, no card required. Make your first call whenever you&apos;re ready.
    </p>
    <div style="background-color:${COLORS.bg}; border:1px solid ${COLORS.border}; border-radius:4px; padding:18px 20px; margin-bottom:24px;">
      <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:2px;">
        Your plan
      </p>
      <p style="font-family:${FONT_SERIF}; font-size:22px; font-weight:500; color:${COLORS.inkDeep}; margin:0 0 4px 0;">
        Sandbox
      </p>
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text2}; margin:0; line-height:1.5;">
        35 API calls per month. All seven public datasets. Engine version pinning, per-dimension confidence, OpenAPI 3.0 spec. No card required.
      </p>
    </div>
    ${ctaButton("Make your first call", "https://www.onegoodarea.com/report")}
  `;

  await (await getEmailProvider()).send({
    from: EMAIL_FROM,
    to: email,
    subject: "Welcome to OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const content = `
    <h1 style="font-family:${FONT_SERIF}; font-size:26px; font-weight:400; letter-spacing:-0.5px; color:${COLORS.inkDeep}; margin:0 0 10px 0; line-height:1.15;">
      Reset your <em style="font-style:italic; color:${COLORS.ink}; border-bottom:2px solid ${COLORS.signal}; padding-bottom:1px;">password</em>.
    </h1>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 26px 0;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${ctaButton("Reset password", resetUrl)}
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 8px 0; letter-spacing:1.5px; text-transform:uppercase;">
      Or paste this link
    </p>
    <p style="font-family:${FONT_MONO}; font-size:11px; color:${COLORS.ink}; word-break:break-all; margin:0 0 26px 0;">
      ${resetUrl}
    </p>
    <div style="border-top:1px solid ${COLORS.borderDim}; padding-top:18px;">
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text3}; margin:0; line-height:1.5;">
        This link expires in 1 hour. If you didn&apos;t request a password reset, ignore this email.
      </p>
    </div>
  `;

  await (await getEmailProvider()).send({
    from: EMAIL_FROM,
    to: email,
    subject: "Reset your password | OneGoodArea",
    html: baseTemplate(content),
  });
}

/* AR-407: sendReportEmail removed alongside the AR-324 reports kill.
   /report/<id> is a 404 on apps/web today; the sender produced broken
   email links. */

/* AR-272: org invitation email. Same template as apps/api's sender; we
   keep separate copies because the two apps have parallel email module
   trees (apps/api/src/infrastructure/email vs apps/web/src/lib/email).
   Plaintext token in the URL is the ONE copy that exists anywhere —
   server stores SHA-256 hash. */
export async function sendOrgInvitationEmail(params: {
  to: string;
  token: string;
  orgName: string;
  role: "member" | "admin";
}) {
  const acceptUrl = `${APP_URL}/accept-invite?token=${encodeURIComponent(params.token)}`;
  const safeOrg = escapeHtml(params.orgName);
  const roleLabel = params.role === "admin" ? "Admin" : "Member";

  const content = `
    <h1 style="font-family:${FONT_SERIF}; font-size:26px; font-weight:400; letter-spacing:-0.5px; color:${COLORS.inkDeep}; margin:0 0 10px 0; line-height:1.15;">
      You&apos;ve been invited to <em style="font-style:italic; color:${COLORS.ink}; border-bottom:2px solid ${COLORS.signal}; padding-bottom:1px;">${safeOrg}</em>.
    </h1>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 24px 0;">
      Join the team on OneGoodArea, the data and intelligence layer for UK property workflows. You&apos;ll join as <strong style="color:${COLORS.inkDeep}; font-weight:500;">${roleLabel}</strong>.
    </p>
    ${ctaButton("Accept invitation", acceptUrl)}
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 8px 0; letter-spacing:1.5px; text-transform:uppercase;">
      Or paste this link
    </p>
    <p style="font-family:${FONT_MONO}; font-size:11px; color:${COLORS.ink}; word-break:break-all; margin:0 0 26px 0;">
      ${acceptUrl}
    </p>
    <div style="border-top:1px solid ${COLORS.borderDim}; padding-top:18px;">
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text3}; margin:0; line-height:1.5;">
        This invitation expires in 7 days. If you weren&apos;t expecting this, ignore the email — the link can only be used once and only by the person it was sent to.
      </p>
    </div>
  `;

  await (await getEmailProvider()).send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `You’ve been invited to ${params.orgName} on OneGoodArea`,
    html: baseTemplate(content),
  });

  logger.info("Org invitation email sent", { to: params.to, orgName: params.orgName, role: params.role });
}
