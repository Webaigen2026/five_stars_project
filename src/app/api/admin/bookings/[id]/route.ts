import { getCurrentUser } from "../../../../../lib/auth";
import { isStaffOrAdmin } from "../../../../../lib/authorization";
import {
  AdminBookingRequestError,
  parseBookingStatusUpdate,
  parsePositiveInt,
  toSafeBooking,
} from "../../../../../lib/admin-bookings";
import {
  bookingErrorHttpStatus,
  isBookingDomainError,
} from "../../../../../lib/booking-errors";
import { transitionBookingStatus } from "../../../../../lib/booking-transitions";
import { db } from "../../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    if (!isStaffOrAdmin(user.role)) {
      return jsonError("Forbidden.", 403);
    }

    const { id: rawId } = await params;
    const id = parsePositiveInt(rawId);

    if (id == null) {
      return jsonError("Booking not found.", 404);
    }

    const existing = await db.orm.public.Booking.where({ id }).first();

    if (!existing) {
      return jsonError("Booking not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AdminBookingRequestError("Invalid JSON body.", 400);
    }

    const status = parseBookingStatusUpdate(body);

    const { booking } = await transitionBookingStatus({
      bookingId: id,
      toStatus: status,
      source: "ADMIN",
      actor: {
        userId: user.id,
        role: user.role,
      },
    });

    return Response.json({ booking: toSafeBooking(booking) });
  } catch (error) {
    if (error instanceof AdminBookingRequestError) {
      return jsonError(error.message, error.status);
    }

    if (isBookingDomainError(error)) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: bookingErrorHttpStatus(error) }
      );
    }

    console.error("Failed to update booking:", error);
    return jsonError("Unable to update booking.", 500);
  }
}
