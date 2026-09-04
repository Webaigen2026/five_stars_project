/**
 * Authoritative booking amount helpers (D12.5 / D13.1).
 * Airfare total and seat fees are separate persisted values.
 */

export function getBookingAmountDueCents(booking: {
  total: number;
  seatFeesTotal?: number | null;
}) {
  const airfare = Number.isInteger(booking.total) ? booking.total : 0;
  const seatFees =
    typeof booking.seatFeesTotal === "number" &&
    Number.isInteger(booking.seatFeesTotal) &&
    booking.seatFeesTotal >= 0
      ? booking.seatFeesTotal
      : 0;

  return airfare + seatFees;
}

export type BookingPriceBreakdown = {
  flightSubtotalCents: number;
  taxesAndFeesCents: number;
  seatFeesCents: number;
  airfareTotalCents: number;
  amountDueCents: number;
};

export function getBookingPriceBreakdown(booking: {
  subtotal: number;
  taxesAndFees: number;
  total: number;
  seatFeesTotal?: number | null;
}): BookingPriceBreakdown {
  const seatFeesCents =
    typeof booking.seatFeesTotal === "number" &&
    Number.isInteger(booking.seatFeesTotal) &&
    booking.seatFeesTotal >= 0
      ? booking.seatFeesTotal
      : 0;

  return {
    flightSubtotalCents: booking.subtotal,
    taxesAndFeesCents: booking.taxesAndFees,
    seatFeesCents,
    airfareTotalCents: booking.total,
    amountDueCents: getBookingAmountDueCents(booking),
  };
}
