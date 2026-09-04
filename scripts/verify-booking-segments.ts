/**
 * Verify BookingSegment integrity. Counts only — no PII.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/verify-booking-segments.ts
 */
import "dotenv/config";

import { db } from "../src/prisma/db";

async function main() {
  const bookings = await db.orm.public.Booking.select("id", "flightId").all();
  const segments = await db.orm.public.BookingSegment.all();
  const flights = await db.orm.public.Flight.select("id").all();
  const flightIds = new Set(flights.map((flight) => flight.id));

  const segmentsByBooking = new Map<number, typeof segments>();

  for (const segment of segments) {
    const list = segmentsByBooking.get(segment.bookingId) ?? [];
    list.push(segment);
    segmentsByBooking.set(segment.bookingId, list);
  }

  let bookingsWithSegments = 0;
  let bookingsMissingSegments = 0;
  let oneSegmentBookings = 0;
  let twoSegmentBookings = 0;
  let malformedSequence = 0;
  let duplicateSegmentType = 0;
  let missingFlight = 0;

  for (const booking of bookings) {
    const rows = segmentsByBooking.get(booking.id) ?? [];

    if (rows.length === 0) {
      bookingsMissingSegments += 1;
      continue;
    }

    bookingsWithSegments += 1;

    if (rows.length === 1) {
      oneSegmentBookings += 1;
    } else if (rows.length === 2) {
      twoSegmentBookings += 1;
    }

    const sorted = [...rows].sort((a, b) => a.sequence - b.sequence);
    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index].sequence !== index + 1) {
        malformedSequence += 1;
        break;
      }
    }

    const types = new Set(rows.map((row) => row.segmentType));
    if (types.size !== rows.length) {
      duplicateSegmentType += 1;
    }

    for (const row of rows) {
      if (!flightIds.has(row.flightId)) {
        missingFlight += 1;
      }
    }
  }

  const report = {
    totalBookings: bookings.length,
    bookingsWithSegments,
    bookingsMissingSegments,
    oneSegmentBookings,
    twoSegmentBookings,
    malformedSequence,
    duplicateSegmentType,
    segmentPointingToMissingFlight: missingFlight,
  };

  console.log(JSON.stringify(report, null, 2));

  if (
    malformedSequence > 0 ||
    duplicateSegmentType > 0 ||
    missingFlight > 0
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
