import { resolveBookingAccess } from "../../../../../../lib/booking-access-server";
import {
  assignPassengerSeat,
  isSeatAssignmentError,
  seatAssignmentHttpStatus,
} from "../../../../../../lib/seat-assignments";
import { db } from "../../../../../../prisma/db";
import { sensitiveJson } from "../../../../../../lib/request-security";

function jsonError(message: string, status: number) {
  return sensitiveJson({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference: raw } = await context.params;
  const bookingReference = decodeURIComponent(raw).trim();

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking) {
    return jsonError("Booking not found.", 404);
  }

  const access = await resolveBookingAccess(booking);
  if (!access.authorized) {
    return jsonError("Forbidden.", 403);
  }

  if (access.currentUser && access.currentUser.role !== "CUSTOMER") {
    return jsonError("Forbidden.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const bookingSegmentId = Number(payload.bookingSegmentId);
  const passengerId = Number(payload.passengerId);
  const seatNumber =
    typeof payload.seatNumber === "string" ? payload.seatNumber : "";

  // Ignore any client-supplied seatFeeCents / seatFeesTotal.
  if (
    !Number.isInteger(bookingSegmentId) ||
    bookingSegmentId <= 0 ||
    !Number.isInteger(passengerId) ||
    passengerId <= 0
  ) {
    return jsonError("Invalid seat assignment payload.", 400);
  }

  try {
    const result = await assignPassengerSeat({
      bookingReference,
      accessAuthorized: true,
      bookingSegmentId,
      passengerId,
      seatNumber,
    });

    return sensitiveJson({
      success: true,
      seatNumber: result.seatNumber,
      passengerId: result.passengerId,
      bookingSegmentId: result.bookingSegmentId,
      seatFeeCents: result.seatFeeCents,
      seatFeesTotal:
        "seatFeesTotal" in result ? result.seatFeesTotal : undefined,
    });
  } catch (error) {
    if (isSeatAssignmentError(error)) {
      return jsonError(error.message, seatAssignmentHttpStatus(error));
    }
    console.error("Seat assignment failed", {
      bookingReference,
      operation: "assign-seat",
    });
    return jsonError("Unable to assign that seat.", 500);
  }
}
