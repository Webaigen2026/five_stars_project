/**
 * Centralized booking access policy (D15.1).
 *
 * ACCOUNT: authenticated session + booking.userId === currentUser.id
 * GUEST:   booking.userId === null + valid scoped guest booking authorization
 *
 * bookingReference and contactEmail alone never authorize access.
 */

import type { GuestBookingAuthorization } from "./guest-booking-auth";

export type BookingAccessInput = {
  bookingId: number;
  bookingReference: string;
  bookingUserId: number | null;
  currentUserId: number | null;
  guestAuthorization: GuestBookingAuthorization | null;
};

export type BookingAccessResult =
  | { authorized: true; mode: "account" | "guest" }
  | { authorized: false; mode: null };

export function evaluateBookingAccess(
  input: BookingAccessInput
): BookingAccessResult {
  if (
    input.currentUserId != null &&
    input.bookingUserId != null &&
    input.bookingUserId === input.currentUserId
  ) {
    return { authorized: true, mode: "account" };
  }

  if (
    input.bookingUserId == null &&
    input.guestAuthorization != null &&
    input.guestAuthorization.bookingId === input.bookingId &&
    input.guestAuthorization.bookingReference === input.bookingReference
  ) {
    return { authorized: true, mode: "guest" };
  }

  return { authorized: false, mode: null };
}

export function canAccessBooking(input: BookingAccessInput) {
  return evaluateBookingAccess(input).authorized;
}

/**
 * Seat / checkout mutations must trust evaluateBookingAccess alone.
 * Do NOT re-gate on role === "CUSTOMER" after authorization — that blocks:
 * - STAFF/ADMIN who own a booking they created while logged in
 * - logged-in STAFF/ADMIN holding a valid D15.2 guest JWT for a guest booking
 * while the seat page (which has no role gate) still renders the map.
 */
export function canMutateAuthorizedBooking(
  access: BookingAccessResult
): access is { authorized: true; mode: "account" | "guest" } {
  return access.authorized === true;
}

/** Customer-facing denial copy for seat mutation 403s. */
export function seatMutationAccessDeniedMessage(bookingUserId: number | null) {
  if (bookingUserId == null) {
    return "Your booking access has expired. Verify your trip to continue.";
  }
  return "You do not have access to manage seats for this booking.";
}

/** Normalize booking contact email (same convention as login/register). */
export function normalizeBookingContactEmail(email: string) {
  return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidBookingContactEmail(email: string) {
  const normalized = normalizeBookingContactEmail(email);
  return normalized.length > 3 && EMAIL_PATTERN.test(normalized);
}

/**
 * Resolve authoritative contactEmail for create.
 * Guest: required from client (normalized).
 * Account: session email (never trust client userId).
 */
export function resolveBookingContactEmail(input: {
  currentUserEmail: string | null | undefined;
  submittedContactEmail: string | null | undefined;
}): { contactEmail: string } {
  if (input.currentUserEmail) {
    const contactEmail = normalizeBookingContactEmail(input.currentUserEmail);
    if (!isValidBookingContactEmail(contactEmail)) {
      throw new Error("Account email is invalid.");
    }
    return { contactEmail };
  }

  const submitted = input.submittedContactEmail ?? "";
  const contactEmail = normalizeBookingContactEmail(submitted);

  if (!isValidBookingContactEmail(contactEmail)) {
    throw new Error("A valid contact email is required.");
  }

  return { contactEmail };
}
