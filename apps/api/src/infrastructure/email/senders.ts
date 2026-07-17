import { logger } from "../../modules/tracking/structured-logger";
import { APP_URL, CONTACT_INBOX, EMAIL_FROM } from "../config";
import { getEmailProvider } from "./providers/index";

/* ────────────────────────────────────────────────────────────
   OneGoodArea transactional email templates.

   Brand v3 (Plotted) restyle, AR-454: warm graphite + warm white, sans
   wordmark + headings that match the site. The old forest-green + lime
   palette was the pre-v3 brand, scrapped on the site 2026-05-18.

   Email clients limit CSS to inline styles + a small set of properties:
   no flex, no @import, no custom web fonts (Geist falls back to the
   system stack), no reliable SVG (so the dot-grid mark is text-only
   here). Layout is table-based; colours are solid hex (no rgba) for
   Outlook safety.
   ──────────────────────────────────────────────────────────── */

const COLORS = {
  ink: "#1A1C1F",       // graphite, primary ink (Brand v3 --oga-ink)
  inkDeep: "#0F1014",   // deepest graphite, button hairline
  bg: "#EFECE6",        // warm canvas (--oga-canvas)
  card: "#FFFFFF",      // card surface
  border: "#E4E1DB",    // warm hairline border
  borderDim: "#EDEAE5", // dimmer divider
  text: "#1A1C1F",      // strong body text
  text2: "#4A4C50",     // secondary text
  text3: "#77787C",     // captions / labels / footer
  white: "#FAF8F4",     // warm white, used for text on graphite
};

const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_MONO = "ui-monospace, 'SF Mono', 'Menlo', 'Consolas', monospace";

/* The Plotted mark (mark.tsx) reconstructed as an HTML dot-grid so it
   renders in every email client: inline SVG is stripped by Gmail, and
   remote images are blocked by default in many clients. 7x7 grid, 5x5
   core + 4 cardinal tips + enlarged centre. Degrades to squares in
   Outlook desktop (no border-radius), which still reads as the mark. */
const MARK_ROWS = ["...X...", ".XXXXX.", ".XXXXX.", "XXXCXXX", ".XXXXX.", ".XXXXX.", "...X..."];

function markGrid(): string {
  const CELL = 7;
  const rows = MARK_ROWS.map((r) => {
    const tds = [...r]
      .map((ch) => {
        if (ch === ".") {
          return `<td width="${CELL}" height="${CELL}" style="padding:0; font-size:0; line-height:0;"><div style="width:${CELL}px; height:${CELL}px; font-size:0; line-height:0;">&nbsp;</div></td>`;
        }
        const d = ch === "C" ? 7 : 4;
        return `<td width="${CELL}" height="${CELL}" align="center" valign="middle" style="padding:0; font-size:0; line-height:0;"><div style="width:${d}px; height:${d}px; background-color:${COLORS.ink}; border-radius:50%; font-size:0; line-height:0;">&nbsp;</div></td>`;
      })
      .join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>${rows}</tbody></table>`;
}

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
          <!-- Wordmark: dot-grid mark + text lockup -->
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:11px;">${markGrid()}</td>
                  <td valign="middle"><span style="font-family:${FONT_SANS}; font-size:20px; font-weight:600; letter-spacing:-0.4px; color:${COLORS.ink};">onegoodarea</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:12px; padding:36px;">
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
      <td style="background-color:${COLORS.ink}; border:1px solid ${COLORS.inkDeep}; border-radius:6px; padding:13px 22px;">
        <a href="${href}" style="font-family:${FONT_SANS}; font-size:14px; font-weight:600; color:${COLORS.white}; text-decoration:none; letter-spacing:-0.2px;">${label} &rarr;</a>
      </td>
    </tr>
  </table>`;
}

/* Brand v3 heading: sans, graphite, with the key word underlined in
   graphite (echoes the site's wordmark underline motif, email-safe). */
function heading(inner: string): string {
  return `<h1 style="font-family:${FONT_SANS}; font-size:25px; font-weight:600; letter-spacing:-0.4px; color:${COLORS.ink}; margin:0 0 12px 0; line-height:1.2;">${inner}</h1>`;
}

function emph(text: string): string {
  return `<span style="border-bottom:2px solid ${COLORS.ink}; padding-bottom:1px;">${text}</span>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  const content = `
    ${heading(`Verify your ${emph("email")}.`)}
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

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your email | OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const safeName = escapeHtml(name);
  const content = `
    ${heading(`Welcome to ${emph("OneGoodArea")}.`)}
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 24px 0;">
      ${safeName}, your account is verified. You start on the Sandbox tier: 200 API calls a month for evaluation, no card required. Make your first call whenever you&apos;re ready.
    </p>
    <div style="background-color:${COLORS.bg}; border:1px solid ${COLORS.border}; border-radius:8px; padding:18px 20px; margin-bottom:24px;">
      <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:2px;">
        Your plan
      </p>
      <p style="font-family:${FONT_SANS}; font-size:22px; font-weight:600; color:${COLORS.ink}; margin:0 0 4px 0;">
        Sandbox
      </p>
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text2}; margin:0; line-height:1.5;">
        200 API calls per month. All seven public datasets. Engine version pinning, per-dimension confidence, OpenAPI 3.0 spec. No card required.
      </p>
    </div>
    ${ctaButton("Make your first call", "https://www.onegoodarea.com/report")}
  `;

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to: email,
    subject: "Welcome to OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const content = `
    ${heading(`Reset your ${emph("password")}.`)}
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

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to: email,
    subject: "Reset your password | OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const magicUrl = `${APP_URL}/auth/magic-link?token=${token}`;

  const content = `
    ${heading(`Sign in to ${emph("OneGoodArea")}.`)}
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

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to: email,
    subject: "Sign in to OneGoodArea",
    html: baseTemplate(content),
  });
}

/* AR-407: sendReportEmail removed. The /v1/report + /reports surface was
   killed by AR-324 (epic, 2026-06-25); the function was orphaned at the
   time and is now genuinely dead. Anything that pointed at /report/<id>
   would 404 in apps/web today, so keeping the sender around could only
   produce broken emails. */

/* AR-272: org invitation email. Sent by createInvitation; the token in
   the URL is the ONE plaintext copy that exists anywhere (the DB only
   has a SHA-256 hash). We escape orgName since admins control it. */
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
    ${heading(`You&apos;ve been invited to ${emph(safeOrg)}.`)}
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 24px 0;">
      Join the team on OneGoodArea, the data and intelligence layer for UK property workflows. You&apos;ll join as <strong style="color:${COLORS.ink}; font-weight:600;">${roleLabel}</strong>.
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
        This invitation expires in 7 days. If you weren&apos;t expecting this, ignore the email. The link can only be used once and only by the person it was sent to.
      </p>
    </div>
  `;

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `You've been invited to ${params.orgName} on OneGoodArea`,
    html: baseTemplate(content),
  });

  logger.info("Org invitation email sent", { to: params.to, orgName: params.orgName, role: params.role });
}

/* AR-451: public contact-form notification. Sent to the operations
   inbox (CONTACT_INBOX) when someone submits /contact. All values are
   attacker-controlled, so every field is HTML-escaped and the subject
   line is stripped of CR/LF to prevent header injection. The submitter's
   email is rendered as a mailto so the operator can reply in one click. */
export async function sendContactEmail(params: {
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  message: string;
}) {
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safeCompany = params.company ? escapeHtml(params.company) : "Not provided";
  const safeRole = params.role ? escapeHtml(params.role) : "Not specified";
  const safeMessage = escapeHtml(params.message).replace(/\n/g, "<br>");

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0; font-family:${FONT_MONO}; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:${COLORS.text3}; vertical-align:top; width:110px;">${label}</td>
      <td style="padding:8px 0; font-family:${FONT_SANS}; font-size:14px; color:${COLORS.text}; vertical-align:top;">${value}</td>
    </tr>`;

  const content = `
    ${heading(`New ${emph("enquiry")}.`)}
    <p style="font-family:${FONT_SANS}; font-size:14px; line-height:1.55; color:${COLORS.text2}; margin:0 0 22px 0;">
      Submitted through the contact form at onegoodarea.com.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%; border-top:1px solid ${COLORS.borderDim}; border-bottom:1px solid ${COLORS.borderDim}; margin-bottom:22px;">
      ${detailRow("Name", safeName)}
      ${detailRow("Email", `<a href="mailto:${safeEmail}" style="color:${COLORS.ink}; text-decoration:none;">${safeEmail}</a>`)}
      ${detailRow("Company", safeCompany)}
      ${detailRow("Role", safeRole)}
    </table>
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 8px 0; letter-spacing:1.5px; text-transform:uppercase;">
      Message
    </p>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.6; color:${COLORS.text}; margin:0;">
      ${safeMessage}
    </p>
  `;

  const subjectName = params.name.replace(/[\r\n]+/g, " ").slice(0, 80);

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to: CONTACT_INBOX,
    subject: `New enquiry: ${subjectName}`,
    html: baseTemplate(content),
  });

  logger.info("Contact enquiry email sent", { to: CONTACT_INBOX, company: params.company ?? null });
}

/* AR-455: confirmation sent back to whoever submitted the contact form,
   so they know it landed. Copy is deliberately pivot-agnostic ("your
   message") so it still fits if /contact becomes a book-a-demo form.
   Best-effort at the call site: a failed confirmation must never fail
   the submission itself. */
export async function sendContactConfirmationEmail(to: string, name: string) {
  const safeName = escapeHtml(name);
  const content = `
    ${heading(`Thanks for ${emph("reaching out")}.`)}
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 20px 0;">
      ${safeName}, we&apos;ve received your message. Someone from the team will get back to you shortly.
    </p>
    <p style="font-family:${FONT_SANS}; font-size:15px; line-height:1.55; color:${COLORS.text2}; margin:0 0 26px 0;">
      While you wait, here is how OneGoodArea works under the hood.
    </p>
    ${ctaButton("Read the methodology", `${APP_URL}/methodology`)}
    <div style="border-top:1px solid ${COLORS.borderDim}; padding-top:18px;">
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text3}; margin:0; line-height:1.5;">
        You&apos;re receiving this because you contacted us through onegoodarea.com. No action is needed.
      </p>
    </div>
  `;

  await getEmailProvider().send({
    from: EMAIL_FROM,
    to,
    subject: "Thanks for reaching out | OneGoodArea",
    html: baseTemplate(content),
  });

  logger.info("Contact confirmation email sent", { to });
}
