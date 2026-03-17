import { Resend } from "resend";
import { AreaReport } from "@/lib/types";
import { logger } from "@/lib/logger";
import { APP_URL, EMAIL_FROM } from "@/lib/config";

const resend = new Resend(process.env.RESEND_API_KEY);

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-family:'Courier New',monospace; font-size:14px; font-weight:700; letter-spacing:2px; color:#ffffff;">
                AREA<span style="color:#3b82f6;">IQ</span>
              </span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color:#111111; border:1px solid #1a1a1a; padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px; text-align:center;">
              <span style="font-family:'Courier New',monospace; font-size:10px; color:#525252;">
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

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  const content = `
    <h1 style="font-family:'Courier New',monospace; font-size:18px; font-weight:600; color:#ffffff; margin:0 0 8px 0;">
      Verify your email
    </h1>
    <p style="font-family:'Courier New',monospace; font-size:12px; color:#737373; margin:0 0 24px 0;">
      Click the button below to verify your email address and activate your account.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#ffffff; padding:10px 24px;">
          <a href="${verifyUrl}" style="font-family:'Courier New',monospace; font-size:12px; font-weight:600; color:#0a0a0a; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
            Verify Email
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family:'Courier New',monospace; font-size:10px; color:#525252; margin:0 0 16px 0;">
      Or copy this link:
    </p>
    <p style="font-family:'Courier New',monospace; font-size:10px; color:#3b82f6; word-break:break-all; margin:0 0 24px 0;">
      ${verifyUrl}
    </p>
    <div style="border-top:1px solid #1a1a1a; padding-top:16px;">
      <p style="font-family:'Courier New',monospace; font-size:10px; color:#525252; margin:0;">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your email | AreaIQ",
    html: baseTemplate(content),
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const content = `
    <h1 style="font-family:'Courier New',monospace; font-size:18px; font-weight:600; color:#ffffff; margin:0 0 8px 0;">
      Welcome to AreaIQ
    </h1>
    <p style="font-family:'Courier New',monospace; font-size:12px; color:#737373; margin:0 0 24px 0;">
      ${name}, your account is verified and ready to go.
    </p>
    <div style="background-color:#0a0a0a; border:1px solid #1a1a1a; padding:16px; margin-bottom:24px;">
      <p style="font-family:'Courier New',monospace; font-size:11px; color:#22c55e; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:1px;">
        Your plan
      </p>
      <p style="font-family:'Courier New',monospace; font-size:16px; font-weight:700; color:#ffffff; margin:0 0 4px 0;">
        Free
      </p>
      <p style="font-family:'Courier New',monospace; font-size:10px; color:#737373; margin:0;">
        3 reports per month. All 7 data sources included.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#ffffff; padding:10px 24px;">
          <a href="https://www.area-iq.co.uk/report" style="font-family:'Courier New',monospace; font-size:12px; font-weight:600; color:#0a0a0a; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
            Generate Your First Report
          </a>
        </td>
      </tr>
    </table>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Welcome to AreaIQ",
    html: baseTemplate(content),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const content = `
    <h1 style="font-family:'Courier New',monospace; font-size:18px; font-weight:600; color:#ffffff; margin:0 0 8px 0;">
      Reset your password
    </h1>
    <p style="font-family:'Courier New',monospace; font-size:12px; color:#737373; margin:0 0 24px 0;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#ffffff; padding:10px 24px;">
          <a href="${resetUrl}" style="font-family:'Courier New',monospace; font-size:12px; font-weight:600; color:#0a0a0a; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family:'Courier New',monospace; font-size:10px; color:#525252; margin:0 0 16px 0;">
      Or copy this link:
    </p>
    <p style="font-family:'Courier New',monospace; font-size:10px; color:#3b82f6; word-break:break-all; margin:0 0 24px 0;">
      ${resetUrl}
    </p>
    <div style="border-top:1px solid #1a1a1a; padding-top:16px;">
      <p style="font-family:'Courier New',monospace; font-size:10px; color:#525252; margin:0;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Reset your password | AreaIQ",
    html: baseTemplate(content),
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendReportEmail(email: string, reportId: string, report: AreaReport) {
  logger.info(`[report-email] Sending report email to ${email} for report ${reportId}`);

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.area-iq.co.uk";
  const reportUrl = `${baseUrl}/report/${reportId}`;

  const score = report.areaiq_score ?? 0;
  const scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#eab308" : "#ef4444";
  const scoreLabel = score >= 70 ? "Strong" : score >= 45 ? "Moderate" : "Low";

  const intentLabels: Record<string, string> = {
    moving: "Moving",
    business: "Business",
    investing: "Investment",
    research: "Research",
  };

  const areaTypeLabels: Record<string, string> = {
    urban: "Urban",
    suburban: "Suburban",
    rural: "Rural",
  };

  // Get top 3 dimensions sorted by weight (highest weight = most important)
  const subScores = Array.isArray(report.sub_scores) ? report.sub_scores : [];
  const topDimensions = [...subScores]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 3);

  const dimensionRows = topDimensions
    .map((d) => {
      const dimColor = d.score >= 70 ? "#22c55e" : d.score >= 45 ? "#eab308" : "#ef4444";
      return `
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid #1a1a1a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family:'Courier New',monospace; font-size:11px; color:#a3a3a3;">
                ${escapeHtml(d.label)}
              </td>
              <td align="right" style="font-family:'Courier New',monospace; font-size:13px; font-weight:700; color:${dimColor};">
                ${d.score}/100
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const areaTypeBadge = report.area_type
    ? `<span style="font-family:'Courier New',monospace; font-size:9px; color:#a3a3a3; background-color:#1a1a1a; padding:3px 8px; letter-spacing:1px; text-transform:uppercase; margin-left:8px;">${areaTypeLabels[report.area_type] || report.area_type}</span>`
    : "";

  // Truncate summary to keep email concise
  const summary = report.summary || "Your report is ready. Click below to view the full analysis.";
  const summaryText = summary.length > 300
    ? summary.slice(0, 297) + "..."
    : summary;

  const content = `
    <h1 style="font-family:'Courier New',monospace; font-size:18px; font-weight:600; color:#ffffff; margin:0 0 4px 0;">
      Report Ready
    </h1>
    <p style="font-family:'Courier New',monospace; font-size:12px; color:#737373; margin:0 0 24px 0;">
      Your area intelligence report has been generated.
    </p>

    <!-- Area + Intent -->
    <div style="margin-bottom:20px;">
      <p style="font-family:'Courier New',monospace; font-size:14px; font-weight:700; color:#ffffff; margin:0 0 4px 0;">
        ${escapeHtml(report.area)} ${areaTypeBadge}
      </p>
      <p style="font-family:'Courier New',monospace; font-size:10px; color:#737373; margin:0; text-transform:uppercase; letter-spacing:1px;">
        ${intentLabels[report.intent] || report.intent} Analysis
      </p>
    </div>

    <!-- Overall Score -->
    <div style="background-color:#0a0a0a; border:1px solid #1a1a1a; padding:20px; margin-bottom:20px; text-align:center;">
      <p style="font-family:'Courier New',monospace; font-size:9px; color:#a3a3a3; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:2px;">
        AreaIQ Score
      </p>
      <p style="font-family:'Courier New',monospace; font-size:36px; font-weight:700; color:${scoreColor}; margin:0 0 4px 0;">
        ${score}
      </p>
      <p style="font-family:'Courier New',monospace; font-size:10px; color:${scoreColor}; margin:0; text-transform:uppercase; letter-spacing:1px;">
        ${scoreLabel}
      </p>
    </div>

    <!-- Top Dimensions -->
    <div style="background-color:#0a0a0a; border:1px solid #1a1a1a; padding:16px; margin-bottom:20px;">
      <p style="font-family:'Courier New',monospace; font-size:9px; color:#a3a3a3; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:2px;">
        Key Dimensions
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${dimensionRows}
      </table>
    </div>

    <!-- Summary -->
    <p style="font-family:'Courier New',monospace; font-size:11px; color:#a3a3a3; line-height:1.6; margin:0 0 24px 0;">
      ${escapeHtml(summaryText)}
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#ffffff; padding:10px 24px;">
          <a href="${reportUrl}" style="font-family:'Courier New',monospace; font-size:12px; font-weight:600; color:#0a0a0a; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
            View Full Report
          </a>
        </td>
      </tr>
    </table>

    <div style="border-top:1px solid #1a1a1a; padding-top:16px;">
      <p style="font-family:'Courier New',monospace; font-size:10px; color:#525252; margin:0;">
        This report is available anytime at area-iq.co.uk.
      </p>
    </div>
  `;

  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Your AreaIQ Report: ${report.area || "Area Analysis"}`,
    html: baseTemplate(content),
  });

  logger.info(`[report-email] Sent successfully:`, result);
}
