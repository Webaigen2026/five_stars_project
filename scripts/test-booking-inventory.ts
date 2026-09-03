/**
 * Isolated inventory/lifecycle integration checks against the configured database.
 *
 * Creates dedicated D4TEST flights and bookings, then deletes them.
 * Does not modify production flights or existing bookings.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/test-booking-inventory.ts
 */
import { randomInt } from "node:crypto";

import { isBookingDomainError } from "../src/lib/booking-errors";
import { transitionBookingStatus } from "../src/lib/booking-transitions";
import { db } from "../src/prisma/db";

const FLIGHT_CODE = `D4TEST-${Date.now()}-${randomInt(1000, 9999)}`;

type CreatedBooking = {
  id: number;
  passengerCount: number;
};

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

async function createTestFlight(availableSeats: number, totalSeats = 10) {
  const flight = await db.orm.public.Flight.create({
    code: `${FLIGHT_CODE}-${availableSeats}-${randomInt(100, 999)}`,
    airline: "StarJet",
    aircraft: "Test",
    origin: "Boston",
    originCode: "BOS",
    destination: "Cap-Haïtien",
    destinationCode: "CAP",
    departureTime: "2026-12-01T08:30:00.000-04:00",
    arrivalTime: "2026-12-01T12:15:00.000-04:00",
    durationMinutes: 225,
    price: 10000,
    totalSeats,
    availableSeats,
    status: "SCHEDULED",
  });

  createdFlightIds.push(flight.id);
  return flight;
}

async function createBooking(
  flightId: number,
  passengerCount: number,
  status: string,
  inventoryHeld = false
): Promise<CreatedBooking> {
  const booking = await db.orm.public.Booking.create({
    bookingReference: `D4T-${Date.now().toString(36).toUpperCase()}${randomInt(10, 99)}${createdBookingIds.length}`,
    flightId,
    passengerCount,
    subtotal: 10000 * passengerCount,
    taxesAndFees: 0,
    total: 10000 * passengerCount,
    status,
    inventoryHeld,
  });

  createdBookingIds.push(booking.id);
  return booking;
}

async function readFlight(id: number) {
  const flight = await db.orm.public.Flight.where({ id }).first();

  if (!flight) {
    throw new Error("Test flight disappeared.");
  }

  return flight;
}

async function readBooking(id: number) {
  const booking = await db.orm.public.Booking.where({ id }).first();

  if (!booking) {
    throw new Error("Test booking disappeared.");
  }

  return booking;
}

async function expectCode(error: unknown, code: string) {
  return isBookingDomainError(error) && error.code === code;
}

async function cleanup() {
  for (const id of createdBookingIds.splice(0).reverse()) {
    const passengers = await db.orm.public.Passenger.where({
      bookingId: id,
    }).all();

    for (const passenger of passengers) {
      await db.orm.public.Passenger.where({ id: passenger.id }).delete();
    }

    const payment = await db.orm.public.Payment.where({ bookingId: id }).first();

    if (payment) {
      await db.orm.public.Payment.where({ id: payment.id }).delete();
    }

    await db.orm.public.Booking.where({ id }).delete();
  }

  for (const flightId of createdFlightIds.splice(0).reverse()) {
    await db.orm.public.Flight.where({ id: flightId }).delete();
  }
}

async function reportExistingInventoryHeldCounts() {
  const bookings = await db.orm.public.Booking.select("inventoryHeld").all();
  const heldTrue = bookings.filter((booking) => booking.inventoryHeld).length;
  const heldFalse = bookings.length - heldTrue;

  console.log("\nExisting booking inventoryHeld counts (no row data):");
  console.log(`  total=${bookings.length}`);
  console.log(`  inventoryHeld=true=${heldTrue}`);
  console.log(`  inventoryHeld=false=${heldFalse}`);
}

async function runFreshAcquisitionAndIdempotency() {
  console.log("\nA/B Fresh acquisition and no double decrement");

  const flight = await createTestFlight(5, 10);
  const pending = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);

  const paid = await transitionBookingStatus({
    bookingId: pending.id,
    toStatus: "PAID",
    source: "PAYMENT",
  });
  const afterPaid = await readFlight(flight.id);
  const paidRow = await readBooking(pending.id);
  ok(
    "A: PAYMENT PENDING_PAYMENT -> PAID decrements 5 -> 3 and sets inventoryHeld=true",
    paid.booking.status === "PAID" &&
      afterPaid.availableSeats === 3 &&
      paidRow.inventoryHeld === true
  );

  const paidAgain = await transitionBookingStatus({
    bookingId: pending.id,
    toStatus: "PAID",
    source: "PAYMENT",
  });
  const afterPaidNoop = await readFlight(flight.id);
  const paidNoopRow = await readBooking(pending.id);
  ok(
    "same-status PAID -> PAID does not mutate inventory",
    paidAgain.noop &&
      afterPaidNoop.availableSeats === 3 &&
      paidNoopRow.inventoryHeld === true
  );

  const confirmed = await transitionBookingStatus({
    bookingId: pending.id,
    toStatus: "CONFIRMED",
    source: "ADMIN",
  });
  const afterConfirm = await readFlight(flight.id);
  const confirmedRow = await readBooking(pending.id);
  ok(
    "B: PAID -> CONFIRMED does not decrement and keeps inventoryHeld=true",
    confirmed.booking.status === "CONFIRMED" &&
      afterConfirm.availableSeats === 3 &&
      confirmedRow.inventoryHeld === true
  );

  const ticketed = await transitionBookingStatus({
    bookingId: pending.id,
    toStatus: "TICKETED",
    source: "ADMIN",
  });
  const afterTicketed = await readFlight(flight.id);
  const ticketedRow = await readBooking(pending.id);
  ok(
    "CONFIRMED -> TICKETED does not decrement and keeps inventoryHeld=true",
    ticketed.booking.status === "TICKETED" &&
      afterTicketed.availableSeats === 3 &&
      ticketedRow.inventoryHeld === true
  );

  const completed = await transitionBookingStatus({
    bookingId: pending.id,
    toStatus: "COMPLETED",
    source: "ADMIN",
  });
  const afterCompleted = await readFlight(flight.id);
  const completedRow = await readBooking(pending.id);
  ok(
    "F: TICKETED -> COMPLETED does not restore seats and sets inventoryHeld=false",
    completed.booking.status === "COMPLETED" &&
      afterCompleted.availableSeats === 3 &&
      completedRow.inventoryHeld === false
  );
}

async function runNormalRelease() {
  console.log("\nC Normal release when inventoryHeld=true");
  await cleanup();

  const flight = await createTestFlight(5, 10);
  const booking = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);

  await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "PAID",
    source: "PAYMENT",
  });
  await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "CONFIRMED",
    source: "ADMIN",
  });

  const beforeCancel = await readFlight(flight.id);
  const cancelled = await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "CANCELLED",
    source: "ADMIN",
  });
  const afterCancel = await readFlight(flight.id);
  const cancelledRow = await readBooking(booking.id);

  ok(
    "C: CONFIRMED -> CANCELLED with inventoryHeld=true restores 2 seats",
    cancelled.booking.status === "CANCELLED" &&
      beforeCancel.availableSeats === 3 &&
      afterCancel.availableSeats === 5 &&
      cancelledRow.inventoryHeld === false
  );
  ok(
    "inventory release never exceeds totalSeats",
    afterCancel.availableSeats <= afterCancel.totalSeats
  );
}

async function runLegacyConfirmedCancel() {
  console.log("\nD LEGACY SAFETY: CONFIRMED -> CANCELLED with inventoryHeld=false");
  await cleanup();

  const flight = await createTestFlight(5, 10);
  const booking = await createBooking(flight.id, 2, "CONFIRMED", false);

  const cancelled = await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "CANCELLED",
    source: "ADMIN",
  });
  const after = await readFlight(flight.id);
  const row = await readBooking(booking.id);

  ok(
    "D: legacy CONFIRMED -> CANCELLED does not increment seats",
    cancelled.booking.status === "CANCELLED" &&
      after.availableSeats === 5 &&
      row.inventoryHeld === false
  );
}

async function runLegacyRefund() {
  console.log("\nE Legacy PAID -> REFUNDED with inventoryHeld=false");
  await cleanup();

  const flight = await createTestFlight(4, 10);
  const booking = await createBooking(flight.id, 2, "PAID", false);

  const refunded = await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "REFUNDED",
    source: "PAYMENT",
  });
  const after = await readFlight(flight.id);
  const row = await readBooking(booking.id);

  ok(
    "E: legacy PAID -> REFUNDED does not increment seats",
    refunded.booking.status === "REFUNDED" &&
      after.availableSeats === 4 &&
      row.inventoryHeld === false
  );
}

async function runHeldRefund() {
  console.log("\nTrusted PAYMENT PAID -> REFUNDED with inventoryHeld=true");
  await cleanup();

  const flight = await createTestFlight(4, 10);
  const booking = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);

  await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "PAID",
    source: "PAYMENT",
  });

  const refunded = await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "REFUNDED",
    source: "PAYMENT",
  });
  const after = await readFlight(flight.id);
  const row = await readBooking(booking.id);

  ok(
    "PAYMENT PAID -> REFUNDED restores seats once and clears inventoryHeld",
    refunded.booking.status === "REFUNDED" &&
      after.availableSeats === 4 &&
      row.inventoryHeld === false
  );

  const refundedAgain = await transitionBookingStatus({
    bookingId: booking.id,
    toStatus: "REFUNDED",
    source: "PAYMENT",
  });
  const afterNoop = await readFlight(flight.id);
  ok(
    "REFUNDED -> REFUNDED does not restore inventory again",
    refundedAgain.noop && afterNoop.availableSeats === 4
  );
}

async function runInsufficientInventory() {
  console.log("\nG Insufficient inventory");
  await cleanup();

  const flight = await createTestFlight(1, 10);
  const booking = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);

  try {
    await transitionBookingStatus({
      bookingId: booking.id,
      toStatus: "PAID",
      source: "PAYMENT",
    });
    ok("G: PAYMENT PENDING_PAYMENT -> PAID fails when seats are insufficient", false);
  } catch (error) {
    ok(
      "G: PAYMENT PENDING_PAYMENT -> PAID fails when seats are insufficient",
      await expectCode(error, "INSUFFICIENT_INVENTORY")
    );
  }

  const unchangedFlight = await readFlight(flight.id);
  const unchangedBooking = await readBooking(booking.id);
  ok(
    "failed acquisition leaves seats, status, and inventoryHeld unchanged",
    unchangedFlight.availableSeats === 1 &&
      unchangedBooking.status === "PENDING_PAYMENT" &&
      unchangedBooking.inventoryHeld === false
  );
}

async function runDraftCreateDoesNotDecrement() {
  console.log("\nDRAFT creation does not decrement seats");
  await cleanup();

  const flight = await createTestFlight(6, 10);
  const before = flight.availableSeats;
  const booking = await createBooking(flight.id, 2, "DRAFT");
  const after = await readFlight(flight.id);
  const row = await readBooking(booking.id);
  ok(
    "creating a DRAFT booking leaves availableSeats unchanged and inventoryHeld=false",
    after.availableSeats === before && row.inventoryHeld === false
  );
}

async function runAdminPaymentAuthority() {
  console.log("\nAdmin cannot create payment truth");
  await cleanup();

  const flight = await createTestFlight(5, 10);
  const pending = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);

  try {
    await transitionBookingStatus({
      bookingId: pending.id,
      toStatus: "PAID",
      source: "ADMIN",
    });
    ok("ADMIN PENDING_PAYMENT -> PAID is rejected", false);
  } catch (error) {
    ok(
      "ADMIN PENDING_PAYMENT -> PAID is rejected",
      await expectCode(error, "PAYMENT_AUTHORITY_REQUIRED")
    );
  }

  const after = await readBooking(pending.id);
  const seats = await readFlight(flight.id);
  ok(
    "rejected admin PAID leaves inventoryHeld=false and seats unchanged",
    after.status === "PENDING_PAYMENT" &&
      after.inventoryHeld === false &&
      seats.availableSeats === 5
  );
}

async function runConcurrencyCase() {
  console.log("\nH Concurrent inventory acquisition");
  await cleanup();

  const flight = await createTestFlight(2, 2);
  const bookingA = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);
  const bookingB = await createBooking(flight.id, 2, "PENDING_PAYMENT", false);

  const results = await Promise.allSettled([
    transitionBookingStatus({
      bookingId: bookingA.id,
      toStatus: "PAID",
      source: "PAYMENT",
    }),
    transitionBookingStatus({
      bookingId: bookingB.id,
      toStatus: "PAID",
      source: "PAYMENT",
    }),
  ]);

  const succeeded = results.filter((result) => result.status === "fulfilled");
  const failed = results.filter((result) => result.status === "rejected");
  const insufficient = failed.filter(
    (result) =>
      result.status === "rejected" &&
      isBookingDomainError(result.reason) &&
      result.reason.code === "INSUFFICIENT_INVENTORY"
  );

  const finalFlight = await readFlight(flight.id);
  const rowA = await readBooking(bookingA.id);
  const rowB = await readBooking(bookingB.id);
  const heldTrue = [rowA, rowB].filter((row) => row.inventoryHeld).length;
  const heldFalse = [rowA, rowB].filter((row) => !row.inventoryHeld).length;
  const paidCount = [rowA, rowB].filter((row) => row.status === "PAID").length;
  const pendingCount = [rowA, rowB].filter(
    (row) => row.status === "PENDING_PAYMENT"
  ).length;

  ok("exactly one concurrent payment transition succeeds", succeeded.length === 1);
  ok(
    "the other concurrent transition fails with INSUFFICIENT_INVENTORY",
    failed.length === 1 && insufficient.length === 1
  );
  ok(
    "final availableSeats = 0, never negative",
    finalFlight.availableSeats === 0
  );
  ok(
    "winner inventoryHeld=true and loser inventoryHeld=false",
    heldTrue === 1 && heldFalse === 1 && paidCount === 1 && pendingCount === 1
  );
}

async function main() {
  try {
    await reportExistingInventoryHeldCounts();
    await runFreshAcquisitionAndIdempotency();
    await runNormalRelease();
    await runLegacyConfirmedCancel();
    await runLegacyRefund();
    await runHeldRefund();
    await runInsufficientInventory();
    await runDraftCreateDoesNotDecrement();
    await runAdminPaymentAuthority();
    await runConcurrencyCase();
  } finally {
    await cleanup();
    await db.close();
  }

  if (failures > 0) {
    console.error(`\n${failures} inventory test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll inventory tests passed.");
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
  } catch (cleanupError) {
    console.error(cleanupError);
  }
  await db.close();
  process.exit(1);
});
