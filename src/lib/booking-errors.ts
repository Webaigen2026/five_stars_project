export const BOOKING_ERROR_CODES = [
  "INVALID_BOOKING_TRANSITION",
  "PAYMENT_AUTHORITY_REQUIRED",
  "INSUFFICIENT_INVENTORY",
  "INVENTORY_INCONSISTENT",
  "BOOKING_NOT_FOUND",
  "FLIGHT_NOT_FOUND",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

const ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  INVALID_BOOKING_TRANSITION: "That booking status change is not allowed.",
  PAYMENT_AUTHORITY_REQUIRED:
    "Payment status cannot be set manually. Paid and refunded states are controlled by the payment system.",
  INSUFFICIENT_INVENTORY: "Not enough seats are available for this flight.",
  INVENTORY_INCONSISTENT:
    "Seat inventory is inconsistent and was not changed.",
  BOOKING_NOT_FOUND: "Booking not found.",
  FLIGHT_NOT_FOUND: "Flight not found.",
};

export class BookingDomainError extends Error {
  constructor(
    readonly code: BookingErrorCode,
    message = ERROR_MESSAGES[code]
  ) {
    super(message);
    this.name = "BookingDomainError";
  }
}

export function isBookingDomainError(
  error: unknown
): error is BookingDomainError {
  return error instanceof BookingDomainError;
}

export function bookingErrorHttpStatus(error: BookingDomainError) {
  switch (error.code) {
    case "BOOKING_NOT_FOUND":
    case "FLIGHT_NOT_FOUND":
      return 404;
    case "PAYMENT_AUTHORITY_REQUIRED":
      return 403;
    default:
      return 409;
  }
}
