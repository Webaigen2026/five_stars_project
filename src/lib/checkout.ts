import { isPayableBookingStatus } from "./payments";

export type CheckoutPaymentAction =
  | "signin"
  | "hidden"
  | "ineligible"
  | "unavailable"
  | "ready";

export function canReviewCheckoutBooking(
  bookingUserId: number | null,
  currentUserId: number | null
) {
  if (bookingUserId == null || currentUserId == null) {
    return true;
  }

  return bookingUserId === currentUserId;
}

export function getCheckoutPaymentAction({
  bookingUserId,
  bookingStatus,
  currentUserId,
  currentUserRole,
  stripeConfigured,
}: {
  bookingUserId: number | null;
  bookingStatus: string;
  currentUserId: number | null;
  currentUserRole: string | null;
  stripeConfigured: boolean;
}): CheckoutPaymentAction {
  if (!isPayableBookingStatus(bookingStatus)) {
    return "ineligible";
  }

  const isOwnerCustomer =
    currentUserId != null &&
    currentUserRole === "CUSTOMER" &&
    bookingUserId === currentUserId;

  if (!isOwnerCustomer) {
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
