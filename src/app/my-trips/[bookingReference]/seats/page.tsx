import { notFound } from "next/navigation";

import Footer from "../../../../components/layout/Footer";
import Header from "../../../../components/layout/Header";
import SeatSelectionContent from "../../../../components/seats/SeatSelectionContent";
import { requireUser } from "../../../../lib/authorization";
import { loadBookingLegsWithFlights } from "../../../../lib/booking-segments";
import { parseFareFamily } from "../../../../lib/fare-families";
import { getSeatLayout } from "../../../../lib/seat-layouts";
import { toSeatPassengerViews } from "../../../../lib/seat-selection";
import { isPayableBookingStatus } from "../../../../lib/payments";
import {
  formatDepartureDate,
  formatDepartureTime,
} from "../../../../lib/trip-formatting";
import { db } from "../../../../prisma/db";

export default async function BookingSeatsPage({
  params,
}: {
  params: Promise<{ bookingReference: string }>;
}) {
  const currentUser = await requireUser();
  const { bookingReference: raw } = await params;
  const bookingReference = decodeURIComponent(raw).trim();

  if (!bookingReference) {
    notFound();
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking || booking.userId !== currentUser.id) {
    notFound();
  }

  const [legs, passengers, assignments, segments] = await Promise.all([
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
      "bookingSegmentId",
      "passengerId",
      "flightId",
      "seatNumber",
      "seatFeeCents"
    )
      .where({ bookingId: booking.id })
      .all(),
    db.orm.public.BookingSegment.where({ bookingId: booking.id }).all(),
  ]);

  const occupiedByFlight = new Map<number, string[]>();
  for (const assignment of assignments) {
    const list = occupiedByFlight.get(assignment.flightId) ?? [];
    list.push(assignment.seatNumber);
    occupiedByFlight.set(assignment.flightId, list);
  }

  const initialSegments = legs.map((leg) => {
    const segment =
      segments.find(
        (row) =>
          row.flightId === leg.flightId && row.segmentType === leg.segmentType
      ) ?? segments.find((row) => row.flightId === leg.flightId);
    const layout = getSeatLayout(leg.flight.aircraft);
    const fareFamily = parseFareFamily(leg.fareFamily) ?? "BASIC";
    const segmentAssignments = assignments.filter(
      (row) => row.bookingSegmentId === segment?.id
    );

    return {
      bookingSegmentId: segment?.id ?? null,
      segmentType: leg.segmentType,
      segmentLabel: leg.segmentType === "RETURN" ? "Return" : "Outbound",
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

  const confirmationHref = `/booking/confirmation/${encodeURIComponent(booking.bookingReference)}`;
  const tripHref = `/my-trips/${encodeURIComponent(booking.bookingReference)}`;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-7xl px-6 py-12">
          <SeatSelectionContent
            bookingReference={booking.bookingReference}
            editable={isPayableBookingStatus(booking.status)}
            initialSegments={initialSegments}
            initialSeatFeesTotal={booking.seatFeesTotal ?? 0}
            confirmationHref={confirmationHref}
            tripHref={tripHref}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
