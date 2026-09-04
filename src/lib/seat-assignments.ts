/**
 * Seat assignment domain (D12.5).
 * Presence of a SeatAssignment row = reserved/assigned.
 * Release = DELETE row. Uniques enforce concurrency.
 */

import "server-only";

import { db } from "../prisma/db";
import { isPayableBookingStatus } from "./payments";
import { parseFareFamily } from "./fare-families";
import { findSeatInLayout, getSeatLayout } from "./seat-layouts";
import { getSeatFeeCents } from "./seat-pricing";
import {
  isPassengerEligibleForSeat,
  sumSeatFeeCents,
} from "./seat-rules";

export class SeatAssignmentError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "NOT_EDITABLE"
      | "LAYOUT_UNAVAILABLE"
      | "INVALID_SEAT"
      | "SEAT_UNAVAILABLE"
      | "EXIT_ROW_RESTRICTED"
      | "VALIDATION",
    message: string
  ) {
    super(message);
    this.name = "SeatAssignmentError";
  }
}

export function isSeatAssignmentError(
  error: unknown
): error is SeatAssignmentError {
  return error instanceof SeatAssignmentError;
}

export function seatAssignmentHttpStatus(error: SeatAssignmentError) {
  switch (error.code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "SEAT_UNAVAILABLE":
    case "NOT_EDITABLE":
    case "EXIT_ROW_RESTRICTED":
    case "LAYOUT_UNAVAILABLE":
    case "INVALID_SEAT":
      return 409;
    default:
      return 400;
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function recomputeSeatFeesTotal(tx: Tx, bookingId: number) {
  const rows = await tx.orm.public.SeatAssignment.select("seatFeeCents")
    .where({ bookingId })
    .all();
  const seatFeesTotal = sumSeatFeeCents(rows);
  await tx.orm.public.Booking.where({ id: bookingId }).update({
    seatFeesTotal,
  });
  return seatFeesTotal;
}

function assertEditableBooking(status: string) {
  if (!isPayableBookingStatus(status)) {
    throw new SeatAssignmentError(
      "NOT_EDITABLE",
      "Seats can only be changed before payment is completed."
    );
  }
}

function isUniqueViolation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /unique/i.test(message) ||
    /duplicate/i.test(message) ||
    /seatAssignment_flightId_seatNumber/i.test(message) ||
    /seatAssignment_bookingSegmentId_passengerId/i.test(message)
  );
}

export async function releaseSeatAssignmentsForBooking(bookingId: number) {
  await db.transaction(async (tx) => {
    await tx.orm.public.SeatAssignment.where({ bookingId }).delete();
    await tx.orm.public.Booking.where({ id: bookingId }).update({
      seatFeesTotal: 0,
    });
  });
}

export async function assignPassengerSeat(input: {
  bookingReference: string;
  currentUserId: number;
  bookingSegmentId: number;
  passengerId: number;
  seatNumber: string;
}) {
  const seatNumber = input.seatNumber.trim().toUpperCase();
  if (!seatNumber) {
    throw new SeatAssignmentError("VALIDATION", "A seat number is required.");
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference: input.bookingReference,
  }).first();

  if (!booking) {
    throw new SeatAssignmentError("NOT_FOUND", "Booking not found.");
  }

  if (booking.userId !== input.currentUserId) {
    throw new SeatAssignmentError("FORBIDDEN", "Forbidden.");
  }

  assertEditableBooking(booking.status);

  const [segment, passenger] = await Promise.all([
    db.orm.public.BookingSegment.where({
      id: input.bookingSegmentId,
      bookingId: booking.id,
    }).first(),
    db.orm.public.Passenger.where({
      id: input.passengerId,
      bookingId: booking.id,
    }).first(),
  ]);

  if (!segment) {
    throw new SeatAssignmentError("NOT_FOUND", "Flight segment not found.");
  }

  if (!passenger) {
    throw new SeatAssignmentError("NOT_FOUND", "Passenger not found.");
  }

  const flight = await db.orm.public.Flight.where({
    id: segment.flightId,
  }).first();

  if (!flight) {
    throw new SeatAssignmentError("NOT_FOUND", "Flight not found.");
  }

  const layout = getSeatLayout(flight.aircraft);
  if (!layout) {
    throw new SeatAssignmentError(
      "LAYOUT_UNAVAILABLE",
      "Seat selection is not available for this aircraft."
    );
  }

  const seat = findSeatInLayout(layout, seatNumber);
  if (!seat) {
    throw new SeatAssignmentError(
      "INVALID_SEAT",
      "That seat is not available on this aircraft."
    );
  }

  if (
    !isPassengerEligibleForSeat({
      isExitRow: seat.isExitRow,
      passengerType: passenger.passengerType,
    })
  ) {
    throw new SeatAssignmentError(
      "EXIT_ROW_RESTRICTED",
      "Exit-row seats are not available for children or infants in a seat."
    );
  }

  const fareFamily = parseFareFamily(segment.fareFamily) ?? "BASIC";
  const seatFeeCents = getSeatFeeCents({
    fareFamily,
    zone: seat.zone,
  });

  const existing = await db.orm.public.SeatAssignment.where({
    bookingSegmentId: segment.id,
    passengerId: passenger.id,
  }).first();

  try {
    const result = await db.transaction(async (tx) => {
      if (existing) {
        if (existing.seatNumber === seatNumber) {
          return {
            seatNumber: existing.seatNumber,
            seatFeeCents: existing.seatFeeCents,
            passengerId: passenger.id,
            bookingSegmentId: segment.id,
            noop: true,
          };
        }

        // Atomic change: claim new seat via update. Unique constraint rolls back
        // if 14C is taken — old seat remains assigned.
        const updatedRows = await tx.orm.public.SeatAssignment.where({
          id: existing.id,
        }).update({
          seatNumber,
          seatFeeCents,
          flightId: flight.id,
        });

        // Some drivers return count; re-read for safety.
        void updatedRows;
        const updated = await tx.orm.public.SeatAssignment.where({
          id: existing.id,
        }).first();

        if (!updated || updated.seatNumber !== seatNumber) {
          throw new SeatAssignmentError(
            "SEAT_UNAVAILABLE",
            "That seat is no longer available. Please choose another seat."
          );
        }

        const seatFeesTotal = await recomputeSeatFeesTotal(tx, booking.id);
        return {
          seatNumber: updated.seatNumber,
          seatFeeCents: updated.seatFeeCents,
          passengerId: passenger.id,
          bookingSegmentId: segment.id,
          seatFeesTotal,
          noop: false,
        };
      }

      await tx.orm.public.SeatAssignment.create({
        bookingId: booking.id,
        bookingSegmentId: segment.id,
        passengerId: passenger.id,
        flightId: flight.id,
        seatNumber,
        seatFeeCents,
      });

      const seatFeesTotal = await recomputeSeatFeesTotal(tx, booking.id);
      return {
        seatNumber,
        seatFeeCents,
        passengerId: passenger.id,
        bookingSegmentId: segment.id,
        seatFeesTotal,
        noop: false,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof SeatAssignmentError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new SeatAssignmentError(
        "SEAT_UNAVAILABLE",
        "That seat is no longer available. Please choose another seat."
      );
    }
    throw error;
  }
}

export async function clearPassengerSeat(input: {
  bookingReference: string;
  currentUserId: number;
  bookingSegmentId: number;
  passengerId: number;
}) {
  const booking = await db.orm.public.Booking.where({
    bookingReference: input.bookingReference,
  }).first();

  if (!booking) {
    throw new SeatAssignmentError("NOT_FOUND", "Booking not found.");
  }

  if (booking.userId !== input.currentUserId) {
    throw new SeatAssignmentError("FORBIDDEN", "Forbidden.");
  }

  assertEditableBooking(booking.status);

  await db.transaction(async (tx) => {
    await tx.orm.public.SeatAssignment.where({
      bookingId: booking.id,
      bookingSegmentId: input.bookingSegmentId,
      passengerId: input.passengerId,
    }).delete();
    await recomputeSeatFeesTotal(tx, booking.id);
  });
}
