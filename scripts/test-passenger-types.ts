/**
 * Passenger type persistence checks (ORM-level).
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/test-passenger-types.ts
 */
import { randomInt } from "node:crypto";

import { resolvePassengerTypesForBooking } from "../src/lib/passenger-composition";
import { passportWriteFields } from "../src/lib/traveler-encryption";
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

async function cleanup() {
  for (const bookingId of createdBookingIds.splice(0).reverse()) {
    const passengers = await db.orm.public.Passenger.where({
      bookingId,
    }).all();
    for (const passenger of passengers) {
      await db.orm.public.Passenger.where({ id: passenger.id }).delete();
    }
    const segments = await db.orm.public.BookingSegment.where({
      bookingId,
    }).all();
    for (const segment of segments) {
      await db.orm.public.BookingSegment.where({ id: segment.id }).delete();
    }
    await db.orm.public.Booking.where({ id: bookingId }).delete();
  }

  for (const flightId of createdFlightIds.splice(0).reverse()) {
    await db.orm.public.Flight.where({ id: flightId }).delete();
  }
}

async function main() {
  console.log("Passenger type persistence\n");

  const flight = await db.orm.public.Flight.create({
    code: `D117-${stamp}`,
    airline: "StarJet",
    aircraft: "Test",
    origin: "BOS",
    originCode: "BOS",
    destination: "PAP",
    destinationCode: "PAP",
    departureTime: "2026-09-06T20:55:00.000Z",
    arrivalTime: "2026-09-07T01:00:00.000Z",
    durationMinutes: 245,
    price: 29900,
    totalSeats: 12,
    availableSeats: 12,
    status: "SCHEDULED",
  });
  createdFlightIds.push(flight.id);

  const types = resolvePassengerTypesForBooking({
    passengerCount: 3,
    adults: 1,
    seniors: 0,
    children: 1,
    infants: 1,
  });

  const booking = await db.orm.public.Booking.create({
    bookingReference: `SJ-T${stamp.slice(-5)}`,
    flightId: flight.id,
    passengerCount: 3,
    subtotal: 89700,
    taxesAndFees: 0,
    total: 89700,
    status: "DRAFT",
    inventoryHeld: false,
  });
  createdBookingIds.push(booking.id);

  await db.orm.public.BookingSegment.create({
    bookingId: booking.id,
    flightId: flight.id,
    segmentType: "OUTBOUND",
    sequence: 1,
  });

  for (const [index, passengerType] of types.entries()) {
    await db.orm.public.Passenger.create({
      bookingId: booking.id,
      firstName: `Traveler${index + 1}`,
      lastName: "Test",
      dateOfBirth: "1990-01-01",
      gender: "X",
      nationality: "Haitian",
      passengerType,
      ...passportWriteFields(`P${stamp}${index}`),
      passportCountry: "HT",
      passportExpiry: "2030-01-01",
    });
  }

  const passengers = await db.orm.public.Passenger.where({
    bookingId: booking.id,
  }).all();
  const sorted = [...passengers].sort((a, b) => a.id - b.id);

  ok("creates exactly 3 passenger rows", sorted.length === 3);
  ok(
    "persists ADULT, CHILD, INFANT_IN_SEAT",
    sorted.map((row) => row.passengerType).join(",") ===
      "ADULT,CHILD,INFANT_IN_SEAT",
    sorted.map((row) => row.passengerType).join(",")
  );

  const defaulted = await db.orm.public.Passenger.create({
    bookingId: booking.id,
    firstName: "Legacy",
    lastName: "Adult",
    dateOfBirth: "1980-01-01",
    gender: "X",
    nationality: "Haitian",
    ...passportWriteFields(`P${stamp}legacy`),
    passportCountry: "HT",
    passportExpiry: "2030-01-01",
  });

  ok(
    "legacy create without passengerType defaults to ADULT",
    defaulted.passengerType === "ADULT",
    String(defaulted.passengerType)
  );

  const roundTripTypes = resolvePassengerTypesForBooking({
    passengerCount: 3,
    adults: 2,
    seniors: 0,
    children: 1,
    infants: 0,
  });
  ok(
    "round-trip composition yields 3 types (not duplicated per segment)",
    roundTripTypes.join(",") === "ADULT,ADULT,CHILD"
  );

  await cleanup();
  await db.close();

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }

  console.log("\nAll passenger-type checks passed.");
}

main().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => undefined);
  await db.close().catch(() => undefined);
  process.exit(1);
});
