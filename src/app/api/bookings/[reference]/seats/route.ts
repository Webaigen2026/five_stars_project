import { resolveBookingAccess } from "../../../../../lib/booking-access-server";
import { loadBookingLegsWithFlights } from "../../../../../lib/booking-segments";
import { parseFareFamily } from "../../../../../lib/fare-families";
import { getSeatLayout } from "../../../../../lib/seat-layouts";
import { toSeatPassengerViews } from "../../../../../lib/seat-selection";
import {
  formatDepartureDate,
  formatDepartureTime,
} from "../../../../../lib/trip-formatting";
import { isPayableBookingStatus } from "../../../../../lib/payments";
import { sensitiveJson } from "../../../../../lib/request-security";
import { db } from "../../../../../prisma/db";

function jsonError(message: string, status: number) {
  return sensitiveJson({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference: raw } = await context.params;
  const bookingReference = decodeURIComponent(raw).trim();
  if (!bookingReference) {
    return jsonError("Booking not found.", 404);
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking) {
    return jsonError("Booking not found.", 404);
  }

  const access = await resolveBookingAccess(booking);
  if (!access.authorized) {
    return jsonError("Booking not found.", 404);
  }

  const [legs, passengers, assignments] = await Promise.all([
    loadBookingLegsWithFlights(booking),
    db.orm.public.Passenger.select(
      "id",
      "firstName",
      "lastName",
      "passengerType"
    )
      .where({ bookingId: booking.id })
      .all(),
    db.orm.public.SeatAssignment.select(
      "id",
      "bookingSegmentId",
      "passengerId",
      "flightId",
      "seatNumber",
      "seatFeeCents"
    )
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const segments = await db.orm.public.BookingSegment.where({
    bookingId: booking.id,
  }).all();

  const segmentByKey = new Map(
    segments.map((segment) => [`${segment.segmentType}-${segment.flightId}`, segment])
  );

  const occupiedByFlight = new Map<number, string[]>();
  for (const assignment of assignments) {
    const list = occupiedByFlight.get(assignment.flightId) ?? [];
    list.push(assignment.seatNumber);
    occupiedByFlight.set(assignment.flightId, list);
  }

  const segmentViews = legs.map((leg) => {
    const segment =
      segmentByKey.get(`${leg.segmentType}-${leg.flightId}`) ??
      segments.find((row) => row.flightId === leg.flightId);
    const layout = getSeatLayout(leg.flight.aircraft);
    const fareFamily = parseFareFamily(leg.fareFamily) ?? "BASIC";
    const segmentAssignments = assignments.filter(
      (row) => row.bookingSegmentId === segment?.id
    );

    return {
      bookingSegmentId: segment?.id ?? null,
      segmentType: leg.segmentType,
      segmentLabel: leg.segmentType === "RETURN" ? "Return" : "Outbound",
      flightId: leg.flightId,
      flightCode: leg.flight.code,
      originCode: leg.flight.originCode,
      destinationCode: leg.flight.destinationCode,
      departureLabel: `${formatDepartureDate(leg.flight)} · ${formatDepartureTime(leg.flight)}`,
      aircraft: leg.flight.aircraft,
      fareFamily,
      layoutAvailable: layout != null,
      layout,
      passengers: toSeatPassengerViews(passengers, segmentAssignments),
      occupiedSeatNumbers: occupiedByFlight.get(leg.flightId) ?? [],
    };
  });

  return sensitiveJson({
    bookingReference: booking.bookingReference,
    status: booking.status,
    editable: isPayableBookingStatus(booking.status),
    seatFeesTotal: booking.seatFeesTotal ?? 0,
    total: booking.total,
    segments: segmentViews,
  });
}
