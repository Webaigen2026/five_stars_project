/**
 * Payment checkout helpers (D13.1).
 * Server-authoritative amounts; client totals are never trusted.
 */

import { getBookingAmountDueCents } from "./booking-amount";
import { CUSTOMER_BRAND } from "./brand";
import { PaymentError, PAYMENT_CURRENCY, isPayableBookingStatus } from "./payments";

export type PayableBookingSnapshot = {
  id: number;
  bookingReference: string;
  userId: number | null;
  status: string;
  total: number;
  seatFeesTotal?: number | null;
  subtotal: number;
  taxesAndFees: number;
  inventoryHeld: boolean;
  passengerCount: number;
};

export type PayablePaymentSnapshot = {
  id: number;
  status: string;
  amount: number;
  stripeCheckoutId: string | null;
} | null;

export function getAuthoritativeCheckoutAmountCents(booking: {
  total: number;
  seatFeesTotal?: number | null;
}) {
  const amount = getBookingAmountDueCents(booking);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new PaymentError("This booking is not eligible for payment.", 409);
  }

  return amount;
}

export function assertCheckoutAmountMatchesBooking(input: {
  sessionAmountTotal: number | null | undefined;
  bookingTotal: number;
  seatFeesTotal?: number | null;
  currency: string | null | undefined;
}) {
  const currency = (input.currency ?? "").toLowerCase();
  if (currency && currency !== PAYMENT_CURRENCY.toLowerCase()) {
    return false;
  }

  if (
    typeof input.sessionAmountTotal !== "number" ||
    !Number.isInteger(input.sessionAmountTotal)
  ) {
    return false;
  }

  return (
    input.sessionAmountTotal ===
    getBookingAmountDueCents({
      total: input.bookingTotal,
      seatFeesTotal: input.seatFeesTotal,
    })
  );
}

export function validatePayableBookingForCheckout(input: {
  booking: PayableBookingSnapshot;
  /**
   * Pre-checked via evaluateBookingAccess / canAccessBooking.
   * Callers must authorize before invoking this helper.
   */
  accessAuthorized: boolean;
  passengerRows: number;
  segmentCount: number;
  existingPayment: PayablePaymentSnapshot;
}) {
  const { booking, accessAuthorized, passengerRows, segmentCount, existingPayment } =
    input;

  if (!accessAuthorized) {
    throw new PaymentError("Forbidden.", 403);
  }

  if (!isPayableBookingStatus(booking.status)) {
    throw new PaymentError("This booking is not eligible for payment.", 409);
  }

  if (existingPayment?.status === "SUCCEEDED") {
    throw new PaymentError("This booking has already been paid.", 409);
  }

  const amount = getAuthoritativeCheckoutAmountCents(booking);

  if (segmentCount < 1) {
    throw new PaymentError("Flight details are unavailable for this booking.", 409);
  }

  if (passengerRows < 1 && booking.passengerCount < 1) {
    throw new PaymentError("Travelers are required before payment.", 409);
  }

  return { amountCents: amount };
}

export function buildCheckoutLineItem(input: {
  bookingReference: string;
  amountCents: number;
  productName: string;
  productDescription: string;
}) {
  return {
    quantity: 1 as const,
    price_data: {
      currency: PAYMENT_CURRENCY.toLowerCase(),
      unit_amount: input.amountCents,
      product_data: {
        name: input.productName,
        description: input.productDescription,
      },
    },
  };
}

export function buildCheckoutProductCopy(input: {
  isRoundTrip: boolean;
  outboundCode: string;
  returnCode?: string | null;
  originCode: string;
  destinationCode: string;
}) {
  const productName = input.isRoundTrip
    ? `${CUSTOMER_BRAND} Round Trip ${input.outboundCode}/${input.returnCode}`
    : `${CUSTOMER_BRAND} Flight ${input.outboundCode}`;
  const productDescription = input.isRoundTrip
    ? `${input.originCode} ⇄ ${input.destinationCode}`
    : `${input.originCode} → ${input.destinationCode}`;

  return { productName, productDescription };
}

export function buildCheckoutSessionMetadata(input: {
  bookingId: number;
  bookingReference: string;
  userId?: number | null;
}) {
  const metadata: Record<string, string> = {
    bookingId: String(input.bookingId),
    bookingReference: input.bookingReference,
  };

  if (input.userId != null) {
    metadata.userId = String(input.userId);
  }

  return metadata;
}

export function parseBookingIdFromMetadata(
  metadata: Record<string, string> | null | undefined
) {
  const raw = metadata?.bookingId?.trim() ?? "";
  const bookingId = Number(raw);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return null;
  }
  return bookingId;
}

export function shouldReuseOpenCheckoutSession(input: {
  paymentStatus: string | null | undefined;
  stripeCheckoutId: string | null | undefined;
  sessionStatus: string | null | undefined;
  sessionUrl: string | null | undefined;
}) {
  if (!input.stripeCheckoutId || !input.sessionUrl) {
    return false;
  }

  if (input.paymentStatus === "SUCCEEDED") {
    return false;
  }

  return input.sessionStatus === "open";
}

/**
 * D13.2 compensation policy after Checkout Session API failure:
 * restore sale inventory, but keep SeatAssignment rows so the customer
 * does not lose seat selections on a transient Stripe error.
 */
export function shouldReleaseSeatsOnCheckoutSessionFailure() {
  return false;
}
