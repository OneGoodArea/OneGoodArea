import { Resend } from "resend";
import { AreaReport } from "@/lib/types";
import { logger } from "@/lib/logger";
import { APP_URL, EMAIL_FROM } from "@/lib/config";

let resendClient: Resend | null = null;

function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

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
                area-iq.co.uk
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

  await getResendClient().emails.send({
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
      ${safeName}, your account is verified. Three reports a month are on us. Run your first one whenever you&apos;re ready.
    </p>
    <div style="background-color:${COLORS.bg}; border:1px solid ${COLORS.border}; border-radius:4px; padding:18px 20px; margin-bottom:24px;">
      <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:2px;">
        Your plan
      </p>
      <p style="font-family:${FONT_SERIF}; font-size:22px; font-weight:500; color:${COLORS.inkDeep}; margin:0 0 4px 0;">
        Free
      </p>
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text2}; margin:0; line-height:1.5;">
        3 reports per month. All seven public datasets. No card needed.
      </p>
    </div>
    ${ctaButton("Generate your first report", "https://www.area-iq.co.uk/report")}
  `;

  await getResendClient().emails.send({
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

  await getResendClient().emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Reset your password | OneGoodArea",
    html: baseTemplate(content),
  });
}

export async function sendReportEmail(email: string, reportId: string, report: AreaReport) {
  logger.info(`[report-email] Sending report email to ${email} for report ${reportId}`);

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.area-iq.co.uk";
  const reportUrl = `${baseUrl}/report/${reportId}`;

  const score = report.areaiq_score ?? 0;
  const scoreColor = score >= 70 ? COLORS.ink : score >= 45 ? "#B8860B" : "#A01B00";
  const scoreLabel = score >= 70 ? "Strong fit" : score >= 45 ? "Moderate fit" : "Weak fit";

  const intentLabels: Record<string, string> = {
    moving: "Moving home",
    business: "Opening a business",
    investing: "Property investing",
    research: "Market research",
  };

  const areaTypeLabels: Record<string, string> = {
    urban: "Urban", suburban: "Suburban", rural: "Rural",
  };

  const subScores = Array.isArray(report.sub_scores) ? report.sub_scores : [];
  const topDimensions = [...subScores]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 3);

  const dimensionRows = topDimensions
    .map((d) => {
      const dimColor = d.score >= 70 ? COLORS.ink : d.score >= 45 ? "#B8860B" : "#A01B00";
      return `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid ${COLORS.borderDim};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family:${FONT_SANS}; font-size:14px; color:${COLORS.text}; font-weight:500;">
                ${escapeHtml(d.label)}
              </td>
              <td align="right" style="font-family:${FONT_MONO}; font-size:14px; font-weight:600; color:${dimColor};">
                ${d.score}<span style="color:${COLORS.text3}; font-weight:400;"> / 100</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const areaTypeBadge = report.area_type
    ? `<span style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text2}; background-color:${COLORS.bg}; border:1px solid ${COLORS.border}; padding:3px 8px; border-radius:2px; letter-spacing:1.5px; text-transform:uppercase; margin-left:8px;">${areaTypeLabels[report.area_type] || report.area_type}</span>`
    : "";

  const summary = report.summary || "Your report is ready. Click below to view the full analysis.";
  const summaryText = summary.length > 320 ? summary.slice(0, 317) + "..." : summary;

  // Methodology + aggregate confidence footer (optional, gracefully omitted on old reports)
  const aggConf = typeof report.confidence === "number" ? report.confidence : null;
  const aggConfLabel =
    aggConf === null ? null
    : aggConf >= 0.85 ? "HIGH"
    : aggConf >= 0.6 ? "MEDIUM"
    : aggConf >= 0.3 ? "LOW"
    : "NONE";
  const methodologyParts: string[] = [];
  if (report.engine_version) methodologyParts.push(`Methodology v${report.engine_version}`);
  if (aggConf !== null && aggConfLabel) {
    methodologyParts.push(`Confidence ${aggConf.toFixed(2)} (${aggConfLabel})`);
  }
  const methodologyLine = methodologyParts.length > 0
    ? `<p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 18px 0; letter-spacing:1.5px; text-transform:uppercase;">
         ${methodologyParts.join(" &middot; ")}
       </p>`
    : "";

  const content = `
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 14px 0; text-transform:uppercase; letter-spacing:2px;">
      Report ready &middot; ${intentLabels[report.intent] || report.intent}
    </p>
    <h1 style="font-family:${FONT_SERIF}; font-size:30px; font-weight:400; letter-spacing:-0.6px; color:${COLORS.inkDeep}; margin:0 0 6px 0; line-height:1.1;">
      ${escapeHtml(report.area)}
    </h1>
    <p style="margin:0 0 24px 0;">${areaTypeBadge}</p>

    <!-- Overall Score -->
    <div style="background-color:${COLORS.bg}; border:1px solid ${COLORS.border}; border-radius:6px; padding:24px; margin-bottom:22px; text-align:center;">
      <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:2px;">
        Overall score
      </p>
      <p style="font-family:${FONT_SERIF}; font-size:54px; font-weight:500; color:${scoreColor}; margin:0; line-height:1; letter-spacing:-2px;">
        ${score}
      </p>
      <p style="font-family:${FONT_MONO}; font-size:11px; color:${scoreColor}; margin:8px 0 0 0; letter-spacing:2px; text-transform:uppercase;">
        ${scoreLabel}
      </p>
    </div>

    <!-- Top Dimensions -->
    <p style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.text3}; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:2px;">
      Top dimensions
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      ${dimensionRows}
    </table>

    ${methodologyLine}

    <!-- Summary -->
    <p style="font-family:${FONT_SANS}; font-size:14.5px; color:${COLORS.text}; line-height:1.6; margin:0 0 28px 0;">
      ${escapeHtml(summaryText)}
    </p>

    ${ctaButton("View full report", reportUrl)}

    <div style="border-top:1px solid ${COLORS.borderDim}; padding-top:18px;">
      <p style="font-family:${FONT_SANS}; font-size:13px; color:${COLORS.text3}; margin:0; line-height:1.5;">
        Your report is saved to your dashboard at OneGoodArea.
      </p>
    </div>
  `;

  const result = await getResendClient().emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Your OneGoodArea report: ${report.area || "Area Analysis"}`,
    html: baseTemplate(content),
  });

  logger.info(`[report-email] Sent successfully:`, result);
}
