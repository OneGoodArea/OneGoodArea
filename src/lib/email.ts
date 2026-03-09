import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "AreaIQ <noreply@area-iq.co.uk>";

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
  const verifyUrl = `${process.env.NEXTAUTH_URL || "https://www.area-iq.co.uk"}/verify?token=${token}`;

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
    from: FROM,
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
        3 reports per month. All 5 data sources included.
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
    from: FROM,
    to: email,
    subject: "Welcome to AreaIQ",
    html: baseTemplate(content),
  });
}
