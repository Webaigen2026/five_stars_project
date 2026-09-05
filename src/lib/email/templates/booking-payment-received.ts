/**
 * Payment received email template (D14.3).
 * Wording follows persisted booking status — does not invent "Ticketed".
 */

import type { BookingEmailContent } from "../booking-email-content";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildBookingPaymentReceivedEmail(content: BookingEmailContent) {
  const subject = `Payment received for your ${content.brand} booking — ${content.bookingReference}`;

  const statusNote =
    content.status === "TICKETED"
      ? "Your ticket has been issued."
      : content.status === "CONFIRMED"
        ? "Your booking is confirmed."
        : "Your payment has been received successfully.";

  const secondaryCta =
    content.cta.secondaryLabel && content.cta.secondaryUrl
      ? `${content.cta.secondaryLabel}: ${content.cta.secondaryUrl}`
      : null;

  const text = [
    content.brandMark,
    "",
    "Payment received",
    "",
    `Booking reference: ${content.bookingReference}`,
    `Status: ${content.statusLabel}`,
    `Amount paid: ${content.amountDueLabel} ${content.currencyLabel}`,
    "",
    content.routeHeading,
    content.datesLabel,
    "",
    statusNote,
    "",
    `${content.cta.label}: ${content.cta.url}`,
    ...(secondaryCta ? [secondaryCta] : []),
    ...(content.isGuest
      ? [
          "",
          "To access your trip, use Find My Trip with your booking reference and contact email. A verification code will be sent.",
        ]
      : []),
    "",
    content.brand,
    "fivestarsfly.com",
  ].join("\n");

  const secondaryHtml =
    content.cta.secondaryLabel && content.cta.secondaryUrl
      ? `<p style="margin:16px 0 0 0;font-size:14px;">
            <a href="${escapeHtml(content.cta.secondaryUrl)}" style="color:#0284c7;text-decoration:underline;">${escapeHtml(content.cta.secondaryLabel)}</a>
          </p>`
      : "";

  const guestNote = content.isGuest
    ? `<p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#64748b;">
            To access your trip, open Find My Trip and enter your booking reference plus contact email. A verification code is required.
          </p>`
    : "";

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
                ${escapeHtml(content.brandMark)}
              </p>
              <h1 style="margin:16px 0 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#020617;">
                Payment received
              </h1>
              <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">Booking reference</p>
              <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;letter-spacing:0.04em;color:#020617;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
                ${escapeHtml(content.bookingReference)}
              </p>
              <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">Status</p>
              <p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#020617;">${escapeHtml(content.statusLabel)}</p>
              <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">Amount paid</p>
              <p style="margin:4px 0 0 0;font-size:22px;font-weight:700;color:#020617;">
                ${escapeHtml(content.amountDueLabel)} ${escapeHtml(content.currencyLabel)}
              </p>
              <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#334155;">
                ${escapeHtml(statusNote)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#020617;">${escapeHtml(content.routeHeading)}</p>
              <p style="margin:6px 0 0 0;font-size:14px;color:#475569;">${escapeHtml(content.datesLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;">
              <a href="${escapeHtml(content.cta.url)}" style="display:inline-block;background-color:#0284c7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 20px;border-radius:10px;">
                ${escapeHtml(content.cta.label)}
              </a>
              ${secondaryHtml}
              ${guestNote}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">
                ${escapeHtml(content.brand)}<br />
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
