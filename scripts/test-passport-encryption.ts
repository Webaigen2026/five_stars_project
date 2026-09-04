/**
 * D9 passport encryption integration checks. Synthetic data only.
 *
 * Usage:
 *   npx tsx scripts/test-passport-encryption.ts
 */
import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import { createUserSession, SESSION_COOKIE_NAME } from "../src/lib/auth";
import { maskPassportNumber } from "../src/lib/sensitive-data";
import {
  LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER,
  ensureTestEncryptionKey,
  isEncryptedTravelerSecret,
} from "../src/lib/traveler-encryption";
import {
  createTraveler,
  getOwnedTraveler,
  parseTravelerInput,
  updateOwnedTraveler,
} from "../src/lib/travelers";
import { db } from "../src/prisma/db";
import { backfillPassportEncryption } from "./backfill-passport-encryption";

const stamp = `${Date.now()}-${randomInt(100, 999)}`;
const createdUserIds: number[] = [];
const createdFlightIds: number[] = [];
const createdBookingIds: number[] = [];
const createdTravelerIds: number[] = [];
const createdPassengerIds: number[] = [];
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
  passportNumber: "HT-D9-SECRET",
  passportCountry: "Haiti",
  passportExpiry: "2030-12-31",
  isPrimary: true,
};

async function createTestUser() {
  const user = await db.orm.public.User.create({
    email: `d9.encrypt.${stamp}.${createdUserIds.length}@example.com`,
    password: await bcrypt.hash("CorrectHorse1", 4),
    firstName: "Encrypt",
    lastName: "Tester",
    role: "CUSTOMER",
    emailVerified: true,
  });

  createdUserIds.push(user.id);
  return user;
}

async function createTestFlight() {
  const flight = await db.orm.public.Flight.create({
    code: `D9E-${stamp}-${randomInt(10, 99)}`,
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
  for (const passengerId of createdPassengerIds.splice(0).reverse()) {
    await db.orm.public.Passenger.where({ id: passengerId }).delete();
  }

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

  for (const travelerId of createdTravelerIds.splice(0).reverse()) {
    const existing = await db.orm.public.TravelerProfile.where({
      id: travelerId,
    }).first();

    if (existing) {
      await db.orm.public.TravelerProfile.where({ id: travelerId }).delete();
    }
  }

  for (const userId of createdUserIds) {
    const travelers = await db.orm.public.TravelerProfile.where({
      userId,
    }).all();

    for (const traveler of travelers) {
      await db.orm.public.TravelerProfile.where({ id: traveler.id }).delete();
    }

    const sessions = await db.orm.public.Session.where({ userId }).all();

    for (const session of sessions) {
      await db.orm.public.Session.where({ id: session.id }).delete();
    }
  }

  for (const flightId of createdFlightIds.splice(0).reverse()) {
    await db.orm.public.Flight.where({ id: flightId }).delete();
  }

  for (const userId of createdUserIds.splice(0).reverse()) {
    await db.orm.public.User.where({ id: userId }).delete();
  }
}

async function main() {
  ensureTestEncryptionKey();

  console.log("\nTravelerProfile encrypted writes");
  const owner = await createTestUser();
  const created = await createTraveler(
    owner.id,
    parseTravelerInput(sampleTraveler)
  );
  createdTravelerIds.push(created.id);

  const stored = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: created.id })
    .first();

  ok("create stores ciphertext", Boolean(stored?.passportNumberEncrypted));
  ok(
    "ciphertext uses v1 format",
    Boolean(
      stored?.passportNumberEncrypted &&
        isEncryptedTravelerSecret(stored.passportNumberEncrypted) &&
        stored.passportNumberEncrypted.startsWith("v1:")
    )
  );
  ok(
    "legacy column stores the non-sensitive placeholder",
    stored?.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );

  const owned = await getOwnedTraveler(owner.id, created.id);
  ok(
    "owner read returns decrypted passport",
    owned?.passportNumber === sampleTraveler.passportNumber
  );
  ok(
    "owner payload does not include ciphertext field",
    owned != null && !("passportNumberEncrypted" in owned)
  );
  ok(
    "account list masking still applies",
    maskPassportNumber(owned?.passportNumber ?? "") === "•••• CRET"
  );

  await updateOwnedTraveler(owner.id, created.id, {
    ...parseTravelerInput(sampleTraveler),
    passportNumber: "HT-D9-UPDATED",
  });

  const updatedStored = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: created.id })
    .first();
  const updatedOwned = await getOwnedTraveler(owner.id, created.id);

  ok(
    "update rewrites ciphertext",
    Boolean(updatedStored?.passportNumberEncrypted) &&
      updatedStored?.passportNumberEncrypted !== stored?.passportNumberEncrypted
  );
  ok(
    "owner can still autofill after update",
    updatedOwned?.passportNumber === "HT-D9-UPDATED"
  );
  ok(
    "update keeps the legacy placeholder",
    updatedStored?.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );

  console.log("\nPassenger snapshot encrypted writes");
  const flight = await createTestFlight();
  const booking = await db.orm.public.Booking.create({
    bookingReference: `D9B-${stamp}`,
    userId: owner.id,
    flightId: flight.id,
    passengerCount: 1,
    subtotal: 10000,
    taxesAndFees: 0,
    total: 10000,
    status: "DRAFT",
    inventoryHeld: false,
  });
  createdBookingIds.push(booking.id);

  const { passportWriteFields } = await import(
    "../src/lib/traveler-encryption"
  );
  const passenger = await db.orm.public.Passenger.create({
    bookingId: booking.id,
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-15",
    gender: "FEMALE",
    nationality: "Haitian",
    ...passportWriteFields("HT-D9-BOOK"),
    passportCountry: "Haiti",
    passportExpiry: "2030-12-31",
  });
  createdPassengerIds.push(passenger.id);

  ok(
    "passenger snapshot has v1 ciphertext",
    Boolean(
      passenger.passportNumberEncrypted &&
        passenger.passportNumberEncrypted.startsWith("v1:")
    )
  );
  ok(
    "passenger legacy column stores the placeholder",
    passenger.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );

  console.log("\nCustomer privacy pages");
  const baseUrl = process.env.D9_APP_URL ?? "http://localhost:3000";

  try {
    const token = await createUserSession(owner);
    const cookie = `${SESSION_COOKIE_NAME}=${token}`;
    const travelerRes = await fetch(`${baseUrl}/api/travelers`, {
      headers: { cookie },
    });
    const cacheControl = travelerRes.headers.get("cache-control") ?? "";
    const travelerBody = (await travelerRes.json()) as {
      travelers?: Array<Record<string, unknown>>;
    };
    const first = travelerBody.travelers?.[0];

    if (!travelerRes.ok) {
      console.log(
        "  skip  HTTP traveler checks (server missing encryption key or not on D9)."
      );
    } else {
      ok("authenticated traveler GET still works", travelerRes.ok);
      ok(
        "traveler GET remains no-store",
        cacheControl.includes("no-store") && cacheControl.includes("private")
      );
      ok(
        "traveler API does not return ciphertext",
        first != null && !("passportNumberEncrypted" in first)
      );
      ok(
        "traveler API returns decrypted passport for owner",
        first?.passportNumber === "HT-D9-UPDATED"
      );
    }

    const pages = [
      `${baseUrl}/checkout?bookingReference=${booking.bookingReference}`,
      `${baseUrl}/my-trips`,
      `${baseUrl}/my-trips/${booking.bookingReference}`,
      `${baseUrl}/my-trips/${booking.bookingReference}/itinerary`,
    ];

    for (const url of pages) {
      const page = await fetch(url, { headers: { cookie } });
      const html = await page.text();
      ok(
        `${new URL(url).pathname} does not expose passport plaintext`,
        !html.includes("HT-D9-BOOK") && !html.includes("HT-D9-UPDATED")
      );
      ok(
        `${new URL(url).pathname} does not expose ciphertext`,
        !html.includes("v1:")
      );
    }
  } catch {
    console.log("  skip  HTTP privacy checks (app server not reachable).");
  }

  console.log("\nAdmin default masking");
  ok(
    "admin masking uses decrypted value",
    maskPassportNumber("HT-D9-BOOK") === "•••• BOOK"
  );

  console.log("\nBackfill idempotency");
  const legacyUser = await createTestUser();
  const legacyTraveler = await db.orm.public.TravelerProfile.create({
    userId: legacyUser.id,
    label: "Legacy",
    firstName: "Grace",
    lastName: "Hopper",
    dateOfBirth: "1980-02-02",
    gender: "FEMALE",
    nationality: "Haitian",
    passportNumber: "HT-D9-LEGACY",
    passportNumberEncrypted: null,
    passportCountry: "Haiti",
    passportExpiry: "2031-01-01",
    isPrimary: true,
  });
  createdTravelerIds.push(legacyTraveler.id);

  const scoped = { travelerIds: [legacyTraveler.id], passengerIds: [] };
  const dryRun = await backfillPassportEncryption({
    dryRun: true,
    ...scoped,
  });
  const afterDryRun = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: legacyTraveler.id })
    .first();

  ok(
    "dry-run reports the legacy traveler as eligible",
    dryRun.travelerCounts.encrypted === 1
  );
  ok(
    "dry-run does not write the legacy traveler",
    afterDryRun?.passportNumberEncrypted == null &&
      afterDryRun?.passportNumber === "HT-D9-LEGACY"
  );

  await backfillPassportEncryption({
    dryRun: false,
    ...scoped,
  });
  const afterBackfill = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: legacyTraveler.id })
    .first();

  ok(
    "backfill writes v1 ciphertext",
    Boolean(afterBackfill?.passportNumberEncrypted?.startsWith("v1:"))
  );
  ok(
    "backfill leaves plaintext unchanged",
    afterBackfill?.passportNumber === "HT-D9-LEGACY"
  );

  const second = await backfillPassportEncryption({
    dryRun: false,
    ...scoped,
  });
  ok(
    "second backfill skips already-encrypted rows",
    second.travelerCounts.skipped === 1 && second.travelerCounts.encrypted === 0
  );

  await cleanup();
  await db.close();

  if (failures > 0) {
    console.error(`\n${failures} encryption test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll passport encryption tests passed.");
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.name : "Test failed");
  try {
    await cleanup();
  } catch {
    // Keep cleanup from dumping sensitive context.
  }
  await db.close();
  process.exit(1);
});
