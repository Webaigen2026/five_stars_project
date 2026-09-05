import { isPayableBookingStatus } from "./payments";
import {
  canAccessBooking,
  type BookingAccessInput,
} from "./booking-access";

export type CheckoutPaymentAction =
  | "signin"
  | "hidden"
  | "ineligible"
  | "unavailable"
  | "ready";

/**
 * @deprecated Prefer canAccessBooking / evaluateBookingAccess.
 * Kept for transitional call sites; D15.1 no longer treats null userId as public.
 */
export function canReviewCheckoutBooking(
  bookingUserId: number | null,
  currentUserId: number | null
) {
  // Legacy signature cannot express guest cookie auth.
  // Account owners only; guests must use canAccessBooking with guest auth.
  if (bookingUserId == null || currentUserId == null) {
    return false;
  }

  return bookingUserId === currentUserId;
}

export function canReviewCheckoutBookingAccess(input: BookingAccessInput) {
  return canAccessBooking(input);
}

export function getCheckoutPaymentAction({
  bookingUserId,
  bookingStatus,
  currentUserId,
  currentUserRole,
  stripeConfigured,
  guestAuthorized = false,
}: {
  bookingUserId: number | null;
  bookingStatus: string;
  currentUserId: number | null;
  currentUserRole: string | null;
  stripeConfigured: boolean;
  guestAuthorized?: boolean;
}): CheckoutPaymentAction {
  if (!isPayableBookingStatus(bookingStatus)) {
    return "ineligible";
  }

  const isOwnerCustomer =
    currentUserId != null &&
    currentUserRole === "CUSTOMER" &&
    bookingUserId === currentUserId;

  const isAuthorizedGuest =
    bookingUserId == null && guestAuthorized === true;

  if (!isOwnerCustomer && !isAuthorizedGuest) {
    if (currentUserId == null && bookingUserId == null && !guestAuthorized) {
      return "signin";
    }

    if (currentUserId == null || bookingUserId == null) {
      return "signin";
    }

    return "hidden";
  }

  if (!stripeConfigured) {
    return "unavailable";
  }

  return "ready";
}
