/**
 * Booking created (DRAFT / unpaid) email template (D14.3).
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

function renderSegmentHtml(segment: BookingEmailContent["segments"][number]) {
  return `<tr>
  <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0284c7;">
      ${escapeHtml(segment.segmentLabel)}
    </p>
    <p style="margin:8px 0 0 0;font-size:16px;font-weight:700;color:#020617;">
      ${escapeHtml(segment.flightCode)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
      <tr>
        <td valign="top" style="width:46%;padding-right:8px;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#020617;">${escapeHtml(segment.originLabel)}</p>
          <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#020617;">${escapeHtml(segment.departureTimeLabel)}</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#64748b;">${escapeHtml(segment.departureDateLabel)}</p>
        </td>
        <td valign="middle" align="center" style="width:8%;color:#94a3b8;font-size:18px;">→</td>
        <td valign="top" style="width:46%;padding-left:8px;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#020617;">${escapeHtml(segment.destinationLabel)}</p>
          <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#020617;">${escapeHtml(segment.arrivalTimeLabel)}</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#64748b;">${escapeHtml(segment.arrivalDateLabel)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0 0;font-size:13px;color:#475569;">
      ${escapeHtml(segment.durationLabel)} · ${escapeHtml(segment.stopsLabel)}
    </p>
    <p style="margin:6px 0 0 0;font-size:13px;color:#475569;">
      Fare: ${escapeHtml(segment.fareLabel)}
    </p>
  </td>
</tr>`;
}

function renderSeatBlockHtml(content: BookingEmailContent) {
  if (content.seatLines.length === 0) {
    return "";
  }

  const bySegment = new Map<string, typeof content.seatLines>();
  for (const line of content.seatLines) {
    const key = `${line.segmentLabel} ${line.flightCode}`;
    const existing = bySegment.get(key) ?? [];
    existing.push(line);
    bySegment.set(key, existing);
  }

  const blocks = [...bySegment.entries()]
    .map(([heading, lines]) => {
      const rows = lines
        .map(
          (line) =>
            `<p style="margin:4px 0 0 0;font-size:14px;color:#334155;">${escapeHtml(line.passengerName)} — ${escapeHtml(line.seatNumber)}</p>`
        )
        .join("");
      return `<p style="margin:12px 0 0 0;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(heading)}</p>${rows}`;
    })
    .join("");

  return `<tr>
  <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">
      Seats
    </p>
    ${blocks}
  </td>
</tr>`;
}

export function buildBookingCreatedEmail(content: BookingEmailContent) {
  const subject = `Your ${content.brand} booking — ${content.bookingReference}`;

  const travelerLines = content.travelers.map(
    (traveler) =>
      `${traveler.displayName} — ${traveler.passengerTypeLabel}`
  );

  const segmentText = content.segments
    .map((segment) =>
      [
        segment.segmentLabel,
        segment.flightCode,
        `${segment.originLabel}`,
        `${segment.departureTimeLabel}`,
        segment.departureDateLabel,
        "→",
        `${segment.destinationLabel}`,
        `${segment.arrivalTimeLabel}`,
        segment.arrivalDateLabel,
        `${segment.durationLabel} · ${segment.stopsLabel}`,
        `Fare: ${segment.fareLabel}`,
      ].join("\n")
    )
    .join("\n\n");

  const seatText =
    content.seatLines.length === 0
      ? []
      : [
          "Seats",
          ...content.seatLines.map(
            (line) =>
              `${line.segmentLabel} ${line.flightCode}: ${line.passengerName} — ${line.seatNumber}`
          ),
        ];

  const priceLines = [
    `Flight subtotal        ${content.flightSubtotalLabel}`,
    `Taxes & fees           ${content.taxesAndFeesLabel}`,
  ];
  if (content.seatFeesCents > 0) {
    priceLines.push(`Seat selection         ${content.seatFeesLabel}`);
  }
  priceLines.push(
    `Total                  ${content.amountDueLabel} ${content.currencyLabel}`
  );

  const text = [
    content.brandMark,
    "",
    "Your booking has been received",
    "",
    `Booking reference: ${content.bookingReference}`,
    `Status: ${content.statusLabel}`,
    "Payment has not been completed.",
    "",
    content.routeHeading,
    content.datesLabel,
    "",
    segmentText,
    "",
    "Travelers",
    ...travelerLines,
    "",
    ...seatText,
    ...(seatText.length ? [""] : []),
    ...priceLines,
    "",
    `Your ${content.brand} booking has been created.`,
    "Payment has not been completed.",
    "Your reservation is not ticketed until payment is successfully completed.",
    "",
    `${content.cta.label}: ${content.cta.url}`,
    ...(content.cta.secondaryLabel && content.cta.secondaryUrl
      ? [`${content.cta.secondaryLabel}: ${content.cta.secondaryUrl}`]
      : []),
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

  const travelersHtml = content.travelers
    .map(
      (traveler) =>
        `<p style="margin:6px 0 0 0;font-size:14px;color:#334155;">${escapeHtml(traveler.displayName)} — ${escapeHtml(traveler.passengerTypeLabel)}</p>`
    )
    .join("");

  const seatFeesRow =
    content.seatFeesCents > 0
      ? `<tr>
          <td style="padding:4px 0;font-size:14px;color:#475569;">Seat selection</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#0f172a;">${escapeHtml(content.seatFeesLabel)}</td>
        </tr>`
      : "";

  const secondaryCta =
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
                Your booking has been received
              </h1>
              <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">Booking reference</p>
              <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;letter-spacing:0.04em;color:#020617;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
                ${escapeHtml(content.bookingReference)}
              </p>
              <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">Status</p>
              <p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#020617;">${escapeHtml(content.statusLabel)}</p>
              <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#b45309;">
                Payment has not been completed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#020617;">${escapeHtml(content.routeHeading)}</p>
              <p style="margin:6px 0 0 0;font-size:14px;color:#475569;">${escapeHtml(content.datesLabel)}</p>
            </td>
          </tr>
          ${content.segments.map(renderSegmentHtml).join("")}
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">
                Travelers
              </p>
              ${travelersHtml}
            </td>
          </tr>
          ${renderSeatBlockHtml(content)}
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#475569;">Flight subtotal</td>
                  <td align="right" style="padding:4px 0;font-size:14px;color:#0f172a;">${escapeHtml(content.flightSubtotalLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#475569;">Taxes &amp; fees</td>
                  <td align="right" style="padding:4px 0;font-size:14px;color:#0f172a;">${escapeHtml(content.taxesAndFeesLabel)}</td>
                </tr>
                ${seatFeesRow}
                <tr>
                  <td style="padding:12px 0 4px 0;font-size:15px;font-weight:700;color:#020617;border-top:1px solid #e2e8f0;">Total</td>
                  <td align="right" style="padding:12px 0 4px 0;font-size:15px;font-weight:700;color:#020617;border-top:1px solid #e2e8f0;">${escapeHtml(content.amountDueLabel)} ${escapeHtml(content.currencyLabel)}</td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#334155;">
                Your ${escapeHtml(content.brand)} booking has been created. Payment has not been completed. Your reservation is not ticketed until payment is successfully completed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;">
              <a href="${escapeHtml(content.cta.url)}" style="display:inline-block;background-color:#0284c7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 20px;border-radius:10px;">
                ${escapeHtml(content.cta.label)}
              </a>
              ${secondaryCta}
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
