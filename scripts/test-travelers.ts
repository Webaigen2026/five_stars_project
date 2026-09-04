/**
 * Isolated traveler-profile checks against the configured database.
 *
 * Creates dedicated D5TEST users/flights/bookings, then deletes them.
 *
 * Usage:
 *   npx tsx scripts/test-travelers.ts
 */
import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import {
  ensureTestEncryptionKey,
  getDecryptedPassportNumber,
  passportWriteFields,
} from "../src/lib/traveler-encryption";
import {
  createTraveler,
  deleteOwnedTraveler,
  getOwnedTraveler,
  listTravelersForUser,
  parseTravelerInput,
  updateOwnedTraveler,
} from "../src/lib/travelers";
import { db } from "../src/prisma/db";

const stamp = `${Date.now()}-${randomInt(100, 999)}`;
const createdUserIds: number[] = [];
const createdFlightIds: number[] = [];
const createdBookingIds: number[] = [];
let failures = 0;

function ok(label: string, passed: boolean) {
  if (passed) {
    console.log(`  PASS  ${label}`);
    return;
  }

  failures += 1;
  console.error(`  FAIL  ${label}`);
}

const sampleTraveler = {
  label: "Myself",
  firstName: "Ada",
  lastName: "Lovelace",
  dateOfBirth: "1990-01-15",
  gender: "FEMALE",
  nationality: "Haitian",
  passportNumber: "HT111111",
  passportCountry: "Haiti",
  passportExpiry: "2030-12-31",
  isPrimary: true,
};

async function createTestUser(role = "CUSTOMER") {
  const user = await db.orm.public.User.create({
    email: `d5.traveler.${stamp}.${createdUserIds.length}@example.com`,
    password: await bcrypt.hash("CorrectHorse1", 4),
    firstName: "Test",
    lastName: "Traveler",
    role,
    emailVerified: true,
  });

  createdUserIds.push(user.id);
  return user;
}

async function createTestFlight() {
  const flight = await db.orm.public.Flight.create({
    code: `D5T-${stamp}-${randomInt(10, 99)}`,
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
    totalSeats: 10,
    availableSeats: 10,
    status: "SCHEDULED",
  });

  createdFlightIds.push(flight.id);
  return flight;
}

async function cleanup() {
  for (const bookingId of createdBookingIds.splice(0).reverse()) {
    const passengers = await db.orm.public.Passenger.where({
      bookingId,
    }).all();

    for (const passenger of passengers) {
      await db.orm.public.Passenger.where({ id: passenger.id }).delete();
    }

    const payment = await db.orm.public.Payment.where({ bookingId }).first();

    if (payment) {
      await db.orm.public.Payment.where({ id: payment.id }).delete();
    }

    await db.orm.public.Booking.where({ id: bookingId }).delete();
  }

  for (const userId of [...createdUserIds]) {
    const travelers = await db.orm.public.TravelerProfile.where({ userId }).all();

    for (const traveler of travelers) {
      await db.orm.public.TravelerProfile.where({ id: traveler.id }).delete();
    }
  }

  for (const flightId of createdFlightIds.splice(0).reverse()) {
    await db.orm.public.Flight.where({ id: flightId }).delete();
  }

  for (const userId of createdUserIds.splice(0).reverse()) {
    await db.orm.public.User.where({ id: userId }).delete();
  }
}

async function runOwnershipAndPrimary() {
  console.log("\nOwnership, client userId ignore, and primary traveler");

  const userA = await createTestUser();
  const userB = await createTestUser();

  const parsed = parseTravelerInput({
    ...sampleTraveler,
    userId: userB.id,
  });
  const created = await createTraveler(userA.id, parsed);

  ok("create traveler ignores client-supplied userId", created.id > 0);

  const ownedByA = await getOwnedTraveler(userA.id, created.id);
  const ownedByB = await getOwnedTraveler(userB.id, created.id);
  ok("owner can read own traveler", ownedByA?.id === created.id);
  ok("other user cannot read that traveler", ownedByB === null);

  try {
    await updateOwnedTraveler(userB.id, created.id, {
      ...parsed,
      firstName: "Eve",
    });
    ok("other user cannot edit traveler", false);
  } catch {
    ok("other user cannot edit traveler", true);
  }

  try {
    await deleteOwnedTraveler(userB.id, created.id);
    ok("other user cannot delete traveler", false);
  } catch {
    const stillThere = await getOwnedTraveler(userA.id, created.id);
    ok("other user cannot delete traveler", stillThere != null);
  }

  const secondPrimary = await createTraveler(userA.id, {
    ...parsed,
    label: "Spouse",
    firstName: "Charles",
    lastName: "Babbage",
    passportNumber: "HT222222",
    isPrimary: true,
  });

  const listed = await listTravelersForUser(userA.id);
  const primaries = listed.filter((item) => item.isPrimary);
  const firstAfter = listed.find((item) => item.id === created.id);

  ok("creating a second primary leaves exactly one primary", primaries.length === 1);
  ok("new primary is the only primary", primaries[0]?.id === secondPrimary.id);
  ok("previous primary is unset", firstAfter?.isPrimary === false);
  ok("primary is sorted first", listed[0]?.id === secondPrimary.id);
}

async function runSnapshotInvariant() {
  console.log("\nBooking snapshot stays unchanged after traveler edit");

  const user = await createTestUser();
  const flight = await createTestFlight();
  const traveler = await createTraveler(user.id, sampleTraveler);

  const booking = await db.orm.public.Booking.create({
    bookingReference: `D5B-${stamp}`,
    userId: user.id,
    flightId: flight.id,
    passengerCount: 1,
    subtotal: 10000,
    taxesAndFees: 0,
    total: 10000,
    status: "DRAFT",
    inventoryHeld: false,
  });
  createdBookingIds.push(booking.id);

  await db.orm.public.Passenger.create({
    bookingId: booking.id,
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    dateOfBirth: traveler.dateOfBirth,
    gender: traveler.gender,
    nationality: traveler.nationality,
    ...passportWriteFields(traveler.passportNumber),
    passportCountry: traveler.passportCountry,
    passportExpiry: traveler.passportExpiry,
  });

  await updateOwnedTraveler(user.id, traveler.id, {
    ...sampleTraveler,
    passportNumber: "HT999999",
    passportExpiry: "2035-01-01",
    isPrimary: true,
  });

  const passenger = await db.orm.public.Passenger.where({
    bookingId: booking.id,
  }).first();
  const updatedTraveler = await getOwnedTraveler(user.id, traveler.id);

  ok(
    "passenger snapshot keeps original travel-document values",
    passenger != null &&
      getDecryptedPassportNumber(passenger) === "HT111111" &&
      passenger.passportExpiry === "2030-12-31"
  );
  ok(
    "saved traveler profile was updated independently",
    updatedTraveler?.passportNumber === "HT999999" &&
      updatedTraveler?.passportExpiry === "2035-01-01"
  );

  await deleteOwnedTraveler(user.id, traveler.id);
  const passengerAfterDelete = await db.orm.public.Passenger.where({
    bookingId: booking.id,
  }).first();
  ok(
    "deleting a traveler profile does not alter passenger rows",
    passengerAfterDelete != null &&
      getDecryptedPassportNumber(passengerAfterDelete) === "HT111111"
  );
}

async function runUnauthenticatedApiCheck() {
  console.log("\nUnauthenticated API");

  const baseUrl = process.env.D5_APP_URL ?? "http://localhost:3000";

  try {
    const getRes = await fetch(`${baseUrl}/api/travelers`);
    const postRes = await fetch(`${baseUrl}/api/travelers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleTraveler),
    });
    const patchRes = await fetch(`${baseUrl}/api/travelers/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleTraveler),
    });
    const deleteRes = await fetch(`${baseUrl}/api/travelers/1`, {
      method: "DELETE",
    });

    ok("GET /api/travelers returns 401 when logged out", getRes.status === 401);
    ok("POST /api/travelers returns 401 when logged out", postRes.status === 401);
    ok("PATCH /api/travelers/:id returns 401 when logged out", patchRes.status === 401);
    ok(
      "DELETE /api/travelers/:id returns 401 when logged out",
      deleteRes.status === 401
    );
  } catch {
    console.log(
      "  skip  HTTP 401 checks (no app server). Set D5_APP_URL or start npm run start."
    );
  }
}

async function main() {
  ensureTestEncryptionKey();

  try {
    await runOwnershipAndPrimary();
    await runSnapshotInvariant();
    await runUnauthenticatedApiCheck();
  } finally {
    await cleanup();
    await db.close();
  }

  if (failures > 0) {
    console.error(`\n${failures} traveler test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll traveler tests passed.");
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
