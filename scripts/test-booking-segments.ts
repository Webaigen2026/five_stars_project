/**
 * Round-trip / multi-leg booking integration checks.
 * Creates temporary flights/bookings and deletes them.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/test-booking-segments.ts
 */
import { randomInt } from "node:crypto";

import { calculateBookingTotals } from "../src/lib/booking-legs";
import { isBookingDomainError } from "../src/lib/booking-errors";
import { loadBookingLegs } from "../src/lib/booking-segments";
import { transitionBookingStatus } from "../src/lib/booking-transitions";
import { db } from "../src/prisma/db";

const stamp = `${Date.now()}-${randomInt(1000, 9999)}`;
const createdBookingIds: number[] = [];
const createdFlightIds: number[] = [];
let failures = 0;

function ok(label: string, passed: boolean, detail?: string) {
  if (passed) {
    console.log(`  PASS  ${label}`);
    return;
  }

  failures += 1;
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function createFlight(input: {
  codeSuffix: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  price: number;
}) {
  const flight = await db.orm.public.Flight.create({
    code: `D113-${stamp}-${input.codeSuffix}`,
    airline: "StarJet",
    aircraft: "Test",
    origin: input.originCode,
    originCode: input.originCode,
    destination: input.destinationCode,
    destinationCode: input.destinationCode,
    departureTime: input.departureTime,
    arrivalTime: input.arrivalTime,
    durationMinutes: 60,
    price: input.price,
    totalSeats: 10,
    availableSeats: input.availableSeats,
    status: "SCHEDULED",
  });
  createdFlightIds.push(flight.id);
  return flight;
}

async function cleanup() {
  for (const bookingId of createdBookingIds.splice(0).reverse()) {
    const segments = await db.orm.public.BookingSegment.where({
      bookingId,
    }).all();
    for (const segment of segments) {
      await db.orm.public.BookingSegment.where({ id: segment.id }).delete();
    }
    const passengers = await db.orm.public.Passenger.where({
      bookingId,
    }).all();
    for (const passenger of passengers) {
      await db.orm.public.Passenger.where({ id: passenger.id }).delete();
    }
    await db.orm.public.Booking.where({ id: bookingId }).delete();
  }

  for (const flightId of createdFlightIds.splice(0).reverse()) {
    await db.orm.public.Flight.where({ id: flightId }).delete();
  }
}

async function main() {
  console.log("\nD11.3 booking segments");

  try {
    const outbound = await createFlight({
      codeSuffix: "OUT",
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: "2026-12-01T12:00:00.000Z",
      arrivalTime: "2026-12-01T16:00:00.000Z",
      availableSeats: 4,
      price: 30000,
    });
    const returnFlight = await createFlight({
      codeSuffix: "RET",
      originCode: "CAP",
      destinationCode: "BOS",
      departureTime: "2026-12-08T14:00:00.000Z",
      arrivalTime: "2026-12-08T18:00:00.000Z",
      availableSeats: 4,
      price: 35000,
    });

    const passengerCount = 2;
    const totals = calculateBookingTotals({
      unitPricesCents: [outbound.price, returnFlight.price],
      passengerCount,
    });

    const booking = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Booking.create({
        bookingReference: `D113-${stamp}`,
        flightId: outbound.id,
        passengerCount,
        subtotal: totals.subtotal,
        taxesAndFees: totals.taxesAndFees,
        total: totals.total,
        status: "DRAFT",
        inventoryHeld: false,
      });

      await tx.orm.public.BookingSegment.create({
        bookingId: created.id,
        flightId: outbound.id,
        segmentType: "OUTBOUND",
        sequence: 1,
      });
      await tx.orm.public.BookingSegment.create({
        bookingId: created.id,
        flightId: returnFlight.id,
        segmentType: "RETURN",
        sequence: 2,
      });

      return created;
    });
    createdBookingIds.push(booking.id);

    const legs = await loadBookingLegs(booking);
    ok("creates two segments in order", legs.length === 2);
    ok("Booking.flightId is outbound", booking.flightId === outbound.id);
    ok("combined subtotal", booking.subtotal === 130000);
    ok("taxes use per-passenger rule", booking.taxesAndFees === 13600);

    await db.orm.public.Booking.where({ id: booking.id }).update({
      status: "PENDING_PAYMENT",
    });

    const paid = await transitionBookingStatus({
      bookingId: booking.id,
      toStatus: "PAID",
      source: "PAYMENT",
    });

    const outboundAfter = await db.orm.public.Flight.where({
      id: outbound.id,
    }).first();
    const returnAfter = await db.orm.public.Flight.where({
      id: returnFlight.id,
    }).first();

    ok("PAID acquires inventory on both legs", paid.booking.inventoryHeld === true);
    ok(
      "outbound seats decremented",
      outboundAfter?.availableSeats === 2
    );
    ok("return seats decremented", returnAfter?.availableSeats === 2);

    // Insufficient return capacity: acquire should fail and roll back both.
    const outbound2 = await createFlight({
      codeSuffix: "OUT2",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: "2026-12-02T12:00:00.000Z",
      arrivalTime: "2026-12-02T16:00:00.000Z",
      availableSeats: 3,
      price: 20000,
    });
    const returnTight = await createFlight({
      codeSuffix: "RET2",
      originCode: "PAP",
      destinationCode: "BOS",
      departureTime: "2026-12-09T14:00:00.000Z",
      arrivalTime: "2026-12-09T18:00:00.000Z",
      availableSeats: 1,
      price: 20000,
    });

    const tightBooking = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Booking.create({
        bookingReference: `D113T-${stamp}`,
        flightId: outbound2.id,
        passengerCount: 2,
        subtotal: 80000,
        taxesAndFees: 13600,
        total: 93600,
        status: "PENDING_PAYMENT",
        inventoryHeld: false,
      });
      await tx.orm.public.BookingSegment.create({
        bookingId: created.id,
        flightId: outbound2.id,
        segmentType: "OUTBOUND",
        sequence: 1,
      });
      await tx.orm.public.BookingSegment.create({
        bookingId: created.id,
        flightId: returnTight.id,
        segmentType: "RETURN",
        sequence: 2,
      });
      return created;
    });
    createdBookingIds.push(tightBooking.id);

    let failedAsExpected = false;
    try {
      await transitionBookingStatus({
        bookingId: tightBooking.id,
        toStatus: "PAID",
        source: "PAYMENT",
      });
    } catch (error) {
      failedAsExpected = isBookingDomainError(error);
    }

    const outbound2After = await db.orm.public.Flight.where({
      id: outbound2.id,
    }).first();
    const returnTightAfter = await db.orm.public.Flight.where({
      id: returnTight.id,
    }).first();
    const tightAfter = await db.orm.public.Booking.where({
      id: tightBooking.id,
    }).first();

    ok("insufficient return seats fails acquire", failedAsExpected);
    ok(
      "outbound seats unchanged after failed acquire",
      outbound2After?.availableSeats === 3
    );
    ok(
      "return seats unchanged after failed acquire",
      returnTightAfter?.availableSeats === 1
    );
    ok(
      "booking remains PENDING_PAYMENT without hold",
      tightAfter?.status === "PENDING_PAYMENT" &&
        tightAfter.inventoryHeld === false
    );

    // Legacy normalize path
    const legacyFlight = await createFlight({
      codeSuffix: "LEG",
      originCode: "MIA",
      destinationCode: "PAP",
      departureTime: "2026-12-03T12:00:00.000Z",
      arrivalTime: "2026-12-03T15:00:00.000Z",
      availableSeats: 5,
      price: 10000,
    });
    const legacy = await db.orm.public.Booking.create({
      bookingReference: `D113L-${stamp}`,
      flightId: legacyFlight.id,
      passengerCount: 1,
      subtotal: 10000,
      taxesAndFees: 6800,
      total: 16800,
      status: "DRAFT",
      inventoryHeld: false,
    });
    createdBookingIds.push(legacy.id);
    const legacyLegs = await loadBookingLegs(legacy);
    ok(
      "legacy booking without segments still renders as one OUTBOUND",
      legacyLegs.length === 1 && legacyLegs[0].flightId === legacyFlight.id
    );
  } finally {
    await cleanup();
    await db.close();
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
  } finally {
    await db.close();
  }
  process.exitCode = 1;
});
