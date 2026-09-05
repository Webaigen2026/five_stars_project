/**
 * Server helpers for booking access (D15.1).
 */

import "server-only";

import { getCurrentUser } from "./auth";
import {
  evaluateBookingAccess,
  type BookingAccessResult,
} from "./booking-access";
import {
  getGuestBookingAuthorization,
  type GuestBookingAuthorization,
} from "./guest-booking-auth";
import type { CurrentUser } from "./auth";

export async function resolveBookingAccess(booking: {
  id: number;
  bookingReference: string;
  userId: number | null;
}): Promise<{
  currentUser: CurrentUser | null;
  guestAuthorization: GuestBookingAuthorization | null;
} & BookingAccessResult> {
  const [currentUser, guestAuthorization] = await Promise.all([
    getCurrentUser(),
    getGuestBookingAuthorization(),
  ]);

  const access = evaluateBookingAccess({
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    bookingUserId: booking.userId,
    currentUserId: currentUser?.id ?? null,
    guestAuthorization,
  });

  return {
    currentUser,
    guestAuthorization,
    ...access,
  };
}
