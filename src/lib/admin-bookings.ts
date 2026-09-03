export const BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "TICKETED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type SafeBooking = {
  id: number;
  bookingReference: string;
  userId: number | null;
  flightId: number;
  passengerCount: number;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export class AdminBookingRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function parsePositiveInt(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function toSafeBooking(booking: SafeBooking): SafeBooking {
  return {
    id: booking.id,
    bookingReference: booking.bookingReference,
    userId: booking.userId,
    flightId: booking.flightId,
    passengerCount: booking.passengerCount,
    subtotal: booking.subtotal,
    taxesAndFees: booking.taxesAndFees,
    total: booking.total,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function parseBookingStatusUpdate(body: unknown): BookingStatus {
  if (!body || typeof body !== "object") {
    throw new AdminBookingRequestError("Invalid booking payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const status =
    typeof payload.status === "string" ? payload.status.trim().toUpperCase() : "";

  if (!status) {
    throw new AdminBookingRequestError("Status is required.", 400);
  }

  if (!isBookingStatus(status)) {
    throw new AdminBookingRequestError("Status is invalid.", 400);
  }

  return status;
}
