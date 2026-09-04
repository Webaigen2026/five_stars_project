export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const PAYABLE_BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "FAILED",
] as const;

export const REUSABLE_PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "FAILED",
  "CANCELLED",
] as const;

export const PAYMENT_CURRENCY = "USD";
export const PAYMENT_PROVIDER = "STRIPE";

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PayableBookingStatus = (typeof PAYABLE_BOOKING_STATUSES)[number];

export type SafePayment = {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  stripeCheckoutId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_APP_URL?.trim()
  );
}

export function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/**
 * D13.2: classify Stripe secret mode without exposing the key.
 * Returns "missing" | "test" | "live" | "unknown".
 */
export function getStripeSecretMode(
  secretKey: string | null | undefined = process.env.STRIPE_SECRET_KEY
) {
  const key = secretKey?.trim() ?? "";
  if (!key) {
    return "missing" as const;
  }
  if (key.startsWith("sk_test_")) {
    return "test" as const;
  }
  if (key.startsWith("sk_live_")) {
    return "live" as const;
  }
  return "unknown" as const;
}

export function isStripeSecretTestMode(
  secretKey: string | null | undefined = process.env.STRIPE_SECRET_KEY
) {
  return getStripeSecretMode(secretKey) === "test";
}

/**
 * True when Stripe Checkout may run in this environment:
 * configured + test-mode secret (live keys are rejected).
 */
export function isStripeTestModeReady() {
  return isStripeConfigured() && isStripeSecretTestMode();
}

export function isPayableBookingStatus(
  value: string
): value is PayableBookingStatus {
  return (PAYABLE_BOOKING_STATUSES as readonly string[]).includes(value);
}

export function isReusablePaymentStatus(value: string) {
  return (REUSABLE_PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function formatCents(cents: number, currency = PAYMENT_CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function toSafePayment(payment: SafePayment): SafePayment {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    stripeCheckoutId: payment.stripeCheckoutId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function parseCreateSessionInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new PaymentError("Invalid payment payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const bookingReference =
    typeof payload.bookingReference === "string"
      ? payload.bookingReference.trim()
      : "";

  if (!bookingReference) {
    throw new PaymentError("A booking reference is required.", 400);
  }

  return { bookingReference };
}
