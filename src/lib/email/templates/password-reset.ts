/**
 * Password reset Resend email template (D14.2).
 */

import { CUSTOMER_BRAND, CUSTOMER_BRAND_MARK } from "../../brand";

export const PASSWORD_RESET_EMAIL_SUBJECT = `Your ${CUSTOMER_BRAND} password reset code`;

export function buildPasswordResetCodeEmail(input: {
  code: string;
  expiresInLabel?: string;
}) {
  const expiresInLabel = input.expiresInLabel ?? "10 minutes";
  const subject = PASSWORD_RESET_EMAIL_SUBJECT;

  const text = [
    CUSTOMER_BRAND_MARK,
    "",
    "Reset your password",
    "",
    `We received a request to reset the password for your ${CUSTOMER_BRAND} account.`,
    "",
    `Your verification code is: ${input.code}`,
    "",
    `This code expires in ${expiresInLabel}.`,
    "",
    "If you didn't request a password reset, you can safely ignore this email.",
    "",
    CUSTOMER_BRAND,
    "fivestarsfly.com",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0284c7;">
                ${escapeHtml(CUSTOMER_BRAND_MARK)}
              </p>
              <h1 style="margin:16px 0 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#020617;">
                Reset your password
              </h1>
              <p style="margin:16px 0 0 0;font-size:16px;line-height:1.6;color:#334155;">
                We received a request to reset the password for your ${escapeHtml(CUSTOMER_BRAND)} account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">
                Your verification code
              </p>
              <p style="margin:12px 0 0 0;font-size:36px;line-height:1.2;font-weight:700;letter-spacing:0.28em;color:#020617;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
                ${escapeHtml(input.code)}
              </p>
              <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#64748b;">
                This code expires in ${escapeHtml(expiresInLabel)}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">
                ${escapeHtml(CUSTOMER_BRAND)}<br />
                fivestarsfly.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
