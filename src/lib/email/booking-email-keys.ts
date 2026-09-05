/**
 * Deterministic Resend idempotency keys for booking emails (D14.3).
 *
 * Same logical event → same key (never random UUID / timestamp / webhook id).
 * Crash/retry after Resend accept but before DB marker write reuses this key
 * so Resend can dedupe within its provider window.
 */

export function bookingCreatedEmailIdempotencyKey(bookingId: number) {
  return `booking-created:${bookingId}`;
}

export function paymentReceivedEmailIdempotencyKey(bookingId: number) {
  return `payment-received:${bookingId}`;
}
