/**
 * Stripe webhook handlers (D13.1).
 * Webhook is payment authority — browser redirects are not.
 */

import { getBookingAmountDueCents } from "./booking-amount";
import {
  assertCheckoutAmountMatchesBooking,
  parseBookingIdFromMetadata,
} from "./payment-checkout";
import { PAYMENT_PROVIDER } from "./payments";

export type WebhookBookingRow = {
  id: number;
  bookingReference: string;
  status: string;
  total: number;
  seatFeesTotal?: number | null;
  inventoryHeld: boolean;
};

export type WebhookPaymentRow = {
  id: number;
  bookingId: number;
  amount: number;
  status: string;
  stripeCheckoutId: string | null;
  stripePaymentIntentId: string | null;
};

export type CheckoutSessionLike = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

export type WebhookDecision =
  | { action: "ignore"; reason: string }
  | { action: "noop_paid"; reason: string }
  | { action: "noop_released"; reason: string }
  | {
      action: "mark_paid";
      bookingId: number;
      sessionId: string;
      paymentIntentId: string | null;
      amountCents: number;
    }
  | {
      action: "expire_unpaid";
      bookingId: number;
      sessionId: string;
    }
  | { action: "reject"; reason: string };

export function decideCheckoutSessionCompleted(input: {
  session: CheckoutSessionLike;
  booking: WebhookBookingRow | null;
  payment: WebhookPaymentRow | null;
}): WebhookDecision {
  const { session, booking, payment } = input;
  const bookingId =
    parseBookingIdFromMetadata(session.metadata) ?? payment?.bookingId ?? null;

  if (bookingId == null) {
    return { action: "reject", reason: "missing_booking_id" };
  }

  if (!booking || booking.id !== bookingId) {
    return { action: "reject", reason: "booking_not_found" };
  }

  if (session.payment_status !== "paid") {
    return { action: "ignore", reason: "not_paid" };
  }

  if (
    payment?.stripeCheckoutId &&
    payment.stripeCheckoutId !== session.id
  ) {
    return { action: "reject", reason: "session_mismatch" };
  }

  if (
    !assertCheckoutAmountMatchesBooking({
      sessionAmountTotal: session.amount_total,
      bookingTotal: booking.total,
      seatFeesTotal: booking.seatFeesTotal,
      currency: session.currency,
    })
  ) {
    return { action: "reject", reason: "amount_mismatch" };
  }

  if (booking.status === "PAID" || payment?.status === "SUCCEEDED") {
    return { action: "noop_paid", reason: "already_paid" };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? payment?.stripePaymentIntentId ?? null;

  return {
    action: "mark_paid",
    bookingId: booking.id,
    sessionId: session.id,
    paymentIntentId,
    amountCents: getBookingAmountDueCents({
      total: booking.total,
      seatFeesTotal: booking.seatFeesTotal,
    }),
  };
}

export function decideCheckoutSessionExpired(input: {
  session: CheckoutSessionLike;
  booking: WebhookBookingRow | null;
  payment: WebhookPaymentRow | null;
}): WebhookDecision {
  const { session, booking, payment } = input;
  const bookingId =
    parseBookingIdFromMetadata(session.metadata) ?? payment?.bookingId ?? null;

  if (bookingId == null) {
    return { action: "reject", reason: "missing_booking_id" };
  }

  if (!booking || booking.id !== bookingId) {
    return { action: "reject", reason: "booking_not_found" };
  }

  if (booking.status === "PAID" || payment?.status === "SUCCEEDED") {
    return { action: "noop_paid", reason: "already_paid" };
  }

  if (
    payment?.stripeCheckoutId &&
    payment.stripeCheckoutId !== session.id
  ) {
    return { action: "ignore", reason: "stale_session" };
  }

  if (
    booking.status === "FAILED" &&
    booking.inventoryHeld !== true &&
    (payment?.status === "CANCELLED" || payment?.status === "FAILED")
  ) {
    return { action: "noop_released", reason: "already_released" };
  }

  return {
    action: "expire_unpaid",
    bookingId: booking.id,
    sessionId: session.id,
  };
}

export function buildSucceededPaymentValues(input: {
  amountCents: number;
  sessionId: string;
  paymentIntentId: string | null;
  paidAt: string;
}) {
  return {
    amount: input.amountCents,
    status: "SUCCEEDED" as const,
    provider: PAYMENT_PROVIDER,
    stripeCheckoutId: input.sessionId,
    stripePaymentIntentId: input.paymentIntentId,
    paidAt: input.paidAt,
  };
}

export function buildExpiredPaymentValues(input: {
  sessionId: string;
}) {
  return {
    status: "CANCELLED" as const,
    provider: PAYMENT_PROVIDER,
    stripeCheckoutId: input.sessionId,
    paidAt: null,
  };
}
