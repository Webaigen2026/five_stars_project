import "server-only";

import { db } from "../prisma/db";
import {
  normalizeBookingLegs,
  type BookingLeg,
  type BookingSegmentType,
} from "./booking-legs";

export type { BookingLeg, BookingSegmentType };
export {
  BOOKING_SEGMENT_TYPES,
  calculateBookingTotals,
  isRoundTripLegs,
  normalizeBookingLegs,
  TAXES_AND_FEES_PER_PASSENGER,
  validateRoundTripFlights,
} from "./booking-legs";

export type BookingLegWithFlight = BookingLeg & {
  fareFamily?: string;
  farePriceCents?: number | null;
  flight: {
    id: number;
    code: string;
    airline: string;
    aircraft: string | null;
    origin: string;
    originCode: string;
    destination: string;
    destinationCode: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    price: number;
    availableSeats: number;
    status: string;
  };
};

export async function loadBookingSegmentRows(bookingId: number) {
  const rows = await db.orm.public.BookingSegment.where({ bookingId }).all();
  return [...rows].sort((left, right) => left.sequence - right.sequence);
}

export async function loadBookingLegs(booking: {
  id: number;
  flightId: number;
}): Promise<BookingLeg[]> {
  const segments = await loadBookingSegmentRows(booking.id);
  return normalizeBookingLegs({
    flightId: booking.flightId,
    segments,
  });
}

/**
 * Flight ids that inventory must acquire/release for this booking.
 * Uses segment rows when present; otherwise Booking.flightId.
 */
export async function loadInventoryFlightIds(
  tx: {
    orm: typeof db.orm;
  },
  booking: { id: number; flightId: number }
): Promise<number[]> {
  const segments = await tx.orm.public.BookingSegment.where({
    bookingId: booking.id,
  }).all();

  const legs = normalizeBookingLegs({
    flightId: booking.flightId,
    segments,
  });

  const ids: number[] = [];
  const seen = new Set<number>();

  for (const leg of legs) {
    if (seen.has(leg.flightId)) {
      continue;
    }
    seen.add(leg.flightId);
    ids.push(leg.flightId);
  }

  return ids;
}

const FLIGHT_SELECT = [
  "id",
  "code",
  "airline",
  "aircraft",
  "origin",
  "originCode",
  "destination",
  "destinationCode",
  "departureTime",
  "arrivalTime",
  "durationMinutes",
  "price",
  "availableSeats",
  "status",
] as const;

export async function loadBookingLegsWithFlights(booking: {
  id: number;
  flightId: number;
}): Promise<BookingLegWithFlight[]> {
  const legs = await loadBookingLegs(booking);

  const flights = await Promise.all(
    legs.map((leg) =>
      db.orm.public.Flight.select(...FLIGHT_SELECT)
        .where({ id: leg.flightId })
        .first()
    )
  );

  const result: BookingLegWithFlight[] = [];

  for (let index = 0; index < legs.length; index += 1) {
    const flight = flights[index];
    if (!flight) {
      continue;
    }

    result.push({
      ...legs[index],
      flight,
    });
  }

  return result;
}
