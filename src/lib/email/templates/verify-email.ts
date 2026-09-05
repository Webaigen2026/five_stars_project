/**
 * Five Stars verification email template (D14.1).
 * Email-safe HTML + plain text. No StarJet branding.
 */

import { CUSTOMER_BRAND, CUSTOMER_BRAND_MARK } from "../../brand";

export const VERIFY_EMAIL_SUBJECT = `Verify your ${CUSTOMER_BRAND} email`;

export type VerifyEmailTemplateInput = {
  verificationUrl: string;
  /** Human-readable expiry, e.g. "24 hours". */
  expiresInLabel: string;
  recipientEmail?: string;
};

export type EmailTemplateContent = {
  subject: string;
  html: string;
  text: string;
};

export function buildVerifyEmailTemplate(
  input: VerifyEmailTemplateInput
): EmailTemplateContent {
  const { verificationUrl, expiresInLabel } = input;
  const subject = VERIFY_EMAIL_SUBJECT;

  const text = [
    CUSTOMER_BRAND_MARK,
    "",
    "Verify your email address",
    "",
    `Thanks for creating your ${CUSTOMER_BRAND} account.`,
    "Please verify your email address to finish setting up your account.",
    "",
    `Verify email: ${verificationUrl}`,
    "",
    `This verification link expires after ${expiresInLabel}.`,
    "",
    `If you did not create a ${CUSTOMER_BRAND} account, you can ignore this email.`,
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
                Verify your email address
              </h1>
              <p style="margin:16px 0 0 0;font-size:16px;line-height:1.6;color:#334155;">
                Thanks for creating your ${escapeHtml(CUSTOMER_BRAND)} account.
              </p>
              <p style="margin:12px 0 0 0;font-size:16px;line-height:1.6;color:#334155;">
                Please verify your email address to finish setting up your account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <a href="${escapeHtml(verificationUrl)}" style="display:inline-block;background-color:#0284c7;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 22px;border-radius:10px;">
                Verify email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                This verification link expires after ${escapeHtml(expiresInLabel)}.
              </p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#64748b;">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${escapeHtml(verificationUrl)}" style="color:#0284c7;word-break:break-all;">${escapeHtml(verificationUrl)}</a>
              </p>
              <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#64748b;">
                If you did not create a ${escapeHtml(CUSTOMER_BRAND)} account, you can ignore this email.
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
