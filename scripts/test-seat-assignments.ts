/**
 * D12.5 seat assignment DB checks (concurrency + change rollback + release).
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/test-seat-assignments.ts
 */

import { randomInt } from "node:crypto";

import assert from "node:assert/strict";

import {
  assignPassengerSeat,
  releaseSeatAssignmentsForBooking,
  SeatAssignmentError,
} from "../src/lib/seat-assignments";
import { db } from "../src/prisma/db";

const stamp = Date.now();
const createdBookingIds: number[] = [];
const createdFlightIds: number[] = [];
const createdUserIds: number[] = [];

async function cleanup() {
  for (const bookingId of createdBookingIds) {
    await db.orm.public.SeatAssignment.where({ bookingId }).delete().catch(() => undefined);
    await db.orm.public.Passenger.where({ bookingId }).delete().catch(() => undefined);
    await db.orm.public.BookingSegment.where({ bookingId }).delete().catch(() => undefined);
    await db.orm.public.Booking.where({ id: bookingId }).delete().catch(() => undefined);
  }
  for (const flightId of createdFlightIds) {
    await db.orm.public.Flight.where({ id: flightId }).delete().catch(() => undefined);
  }
  for (const userId of createdUserIds) {
    await db.orm.public.User.where({ id: userId }).delete().catch(() => undefined);
  }
}

async function main() {
  const user = await db.orm.public.User.create({
    email: `seat-test-${stamp}@example.com`,
    password: "x",
    role: "CUSTOMER",
    firstName: "Seat",
    lastName: "Tester",
    emailVerified: true,
  });
  createdUserIds.push(user.id);

  const aircraft = "Airbus A320";
  const flightA = await db.orm.public.Flight.create({
    code: `STA-${stamp % 100000}-${randomInt(100, 999)}`,
    airline: "Five Stars",
    origin: "Boston",
    originCode: "BOS",
    destination: "Port-au-Prince",
    destinationCode: "PAP",
    departureTime: new Date(Date.now() + 86400000).toISOString(),
    arrivalTime: new Date(Date.now() + 90000000).toISOString(),
    durationMinutes: 60,
    price: 38800,
    totalSeats: 168,
    availableSeats: 168,
    aircraft,
    status: "SCHEDULED",
  });
  createdFlightIds.push(flightA.id);

  const flightB = await db.orm.public.Flight.create({
    code: `STB-${stamp % 100000}-${randomInt(100, 999)}`,
    airline: "Five Stars",
    origin: "Port-au-Prince",
    originCode: "PAP",
    destination: "Boston",
    destinationCode: "BOS",
    departureTime: new Date(Date.now() + 7 * 86400000).toISOString(),
    arrivalTime: new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(),
    durationMinutes: 60,
    price: 40000,
    totalSeats: 168,
    availableSeats: 168,
    aircraft,
    status: "SCHEDULED",
  });
  createdFlightIds.push(flightB.id);

  async function createBooking(ref: string) {
    const booking = await db.orm.public.Booking.create({
      bookingReference: ref,
      userId: user.id,
      flightId: flightA.id,
      passengerCount: 2,
      subtotal: 77600,
      taxesAndFees: 13600,
      total: 91200,
      seatFeesTotal: 0,
      status: "DRAFT",
      inventoryHeld: false,
    });
    createdBookingIds.push(booking.id);

    const outbound = await db.orm.public.BookingSegment.create({
      bookingId: booking.id,
      flightId: flightA.id,
      segmentType: "OUTBOUND",
      sequence: 1,
      fareFamily: "BASIC",
      farePriceCents: 38800,
    });
    const inbound = await db.orm.public.BookingSegment.create({
      bookingId: booking.id,
      flightId: flightB.id,
      segmentType: "RETURN",
      sequence: 2,
      fareFamily: "STANDARD",
      farePriceCents: 40000,
    });
    const adult = await db.orm.public.Passenger.create({
      bookingId: booking.id,
      firstName: "Adult",
      lastName: "One",
      dateOfBirth: "1990-01-01",
      gender: "M",
      nationality: "US",
      passengerType: "ADULT",
      passportCountry: "US",
      passportExpiry: "2030-01-01",
    });
    const child = await db.orm.public.Passenger.create({
      bookingId: booking.id,
      firstName: "Child",
      lastName: "One",
      dateOfBirth: "2018-01-01",
      gender: "F",
      nationality: "US",
      passengerType: "CHILD",
      passportCountry: "US",
      passportExpiry: "2030-01-01",
    });
    return { booking, outbound, inbound, adult, child };
  }

  const booking1 = await createBooking(`SJ-SEAT-A-${stamp}`);
  const booking2 = await createBooking(`SJ-SEAT-B-${stamp}`);

  const first = await assignPassengerSeat({
    bookingReference: booking1.booking.bookingReference,
    currentUserId: user.id,
    bookingSegmentId: booking1.outbound.id,
    passengerId: booking1.adult.id,
    seatNumber: "12A",
  });
  assert.equal(first.seatNumber, "12A");
  assert.equal(first.seatFeeCents, 1500 + 2900);

  let conflicted = false;
  try {
    await assignPassengerSeat({
      bookingReference: booking2.booking.bookingReference,
      currentUserId: user.id,
      bookingSegmentId: booking2.outbound.id,
      passengerId: booking2.adult.id,
      seatNumber: "12A",
    });
  } catch (error) {
    conflicted =
      error instanceof SeatAssignmentError && error.code === "SEAT_UNAVAILABLE";
  }
  assert.equal(conflicted, true);

  const returnSeat = await assignPassengerSeat({
    bookingReference: booking1.booking.bookingReference,
    currentUserId: user.id,
    bookingSegmentId: booking1.inbound.id,
    passengerId: booking1.adult.id,
    seatNumber: "12A",
  });
  assert.equal(returnSeat.seatNumber, "12A");
  assert.equal(returnSeat.seatFeeCents, 2900);

  let exitBlocked = false;
  try {
    await assignPassengerSeat({
      bookingReference: booking1.booking.bookingReference,
      currentUserId: user.id,
      bookingSegmentId: booking1.outbound.id,
      passengerId: booking1.child.id,
      seatNumber: "12B",
    });
  } catch (error) {
    exitBlocked =
      error instanceof SeatAssignmentError &&
      error.code === "EXIT_ROW_RESTRICTED";
  }
  assert.equal(exitBlocked, true);

  const changed = await assignPassengerSeat({
    bookingReference: booking1.booking.bookingReference,
    currentUserId: user.id,
    bookingSegmentId: booking1.outbound.id,
    passengerId: booking1.adult.id,
    seatNumber: "14C",
  });
  assert.equal(changed.seatNumber, "14C");

  await assignPassengerSeat({
    bookingReference: booking2.booking.bookingReference,
    currentUserId: user.id,
    bookingSegmentId: booking2.outbound.id,
    passengerId: booking2.adult.id,
    seatNumber: "15A",
  });

  let changeConflict = false;
  try {
    await assignPassengerSeat({
      bookingReference: booking1.booking.bookingReference,
      currentUserId: user.id,
      bookingSegmentId: booking1.outbound.id,
      passengerId: booking1.adult.id,
      seatNumber: "15A",
    });
  } catch (error) {
    changeConflict =
      error instanceof SeatAssignmentError && error.code === "SEAT_UNAVAILABLE";
  }
  assert.equal(changeConflict, true);

  const still14c = await db.orm.public.SeatAssignment.where({
    bookingSegmentId: booking1.outbound.id,
    passengerId: booking1.adult.id,
  }).first();
  assert.equal(still14c?.seatNumber, "14C");

  await releaseSeatAssignmentsForBooking(booking1.booking.id);
  await releaseSeatAssignmentsForBooking(booking1.booking.id);
  const afterRelease = await db.orm.public.SeatAssignment.where({
    bookingId: booking1.booking.id,
  }).all();
  assert.equal(afterRelease.length, 0);
  const bookingAfter = await db.orm.public.Booking.where({
    id: booking1.booking.id,
  }).first();
  assert.equal(bookingAfter?.seatFeesTotal, 0);

  console.log("seat assignment DB checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });
