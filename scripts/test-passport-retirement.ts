/**
 * D9.1 encrypted-only runtime and plaintext-retirement checks.
 * Synthetic mutations only. Existing production rows are read, never retired.
 *
 * Usage:
 *   npx tsx scripts/test-passport-retirement.ts
 */
import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import { maskPassportNumber } from "../src/lib/sensitive-data";
import {
  LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER,
  encryptTravelerSecret,
  ensureTestEncryptionKey,
  getDecryptedPassportNumber,
  isLegacyPassportPlaceholder,
} from "../src/lib/traveler-encryption";
import {
  createTraveler,
  getOwnedTraveler,
  parseTravelerInput,
  updateOwnedTraveler,
} from "../src/lib/travelers";
import { db } from "../src/prisma/db";
import { retirePlaintextPassports } from "./retire-plaintext-passports";

const stamp = `${Date.now()}-${randomInt(100, 999)}`;
const createdUserIds: number[] = [];
const createdTravelerIds: number[] = [];
const createdPassengerIds: number[] = [];
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
  passportNumber: "HT-D91-SECRET",
  passportCountry: "Haiti",
  passportExpiry: "2030-12-31",
  isPrimary: true,
};

async function createTestUser() {
  const user = await db.orm.public.User.create({
    email: `d91.retire.${stamp}.${createdUserIds.length}@example.com`,
    password: await bcrypt.hash("CorrectHorse1", 4),
    firstName: "Retire",
    lastName: "Tester",
    role: "CUSTOMER",
    emailVerified: true,
  });

  createdUserIds.push(user.id);
  return user;
}

async function cleanup() {
  for (const passengerId of createdPassengerIds.splice(0).reverse()) {
    const existing = await db.orm.public.Passenger.where({
      id: passengerId,
    }).first();

    if (existing) {
      await db.orm.public.Passenger.where({ id: passengerId }).delete();
    }
  }

  for (const bookingId of createdBookingIds.splice(0).reverse()) {
    const passengers = await db.orm.public.Passenger.where({
      bookingId,
    }).all();

    for (const passenger of passengers) {
      await db.orm.public.Passenger.where({ id: passenger.id }).delete();
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

  console.log("\nExisting production rows (encrypted-only read)");
  const existingTraveler = await db.orm.public.TravelerProfile.select(
    "id",
    "userId",
    "passportNumber",
    "passportNumberEncrypted"
  ).first();

  if (!existingTraveler) {
    console.log("  skip  no existing TravelerProfile row");
  } else {
    const loaded = await getOwnedTraveler(
      existingTraveler.userId,
      existingTraveler.id
    );
    ok(
      "existing traveler loads from ciphertext only",
      loaded != null &&
        loaded.passportNumber.length > 0 &&
        !isLegacyPassportPlaceholder(loaded.passportNumber)
    );
    ok(
      "existing traveler still has pre-retirement legacy plaintext",
      !isLegacyPassportPlaceholder(existingTraveler.passportNumber)
    );
    ok(
      "existing traveler DTO does not include ciphertext",
      loaded != null && !("passportNumberEncrypted" in loaded)
    );
  }

  const existingPassenger = await db.orm.public.Passenger.select(
    "passportNumberEncrypted"
  ).first();

  if (!existingPassenger) {
    console.log("  skip  no existing Passenger row");
  } else {
    const masked = maskPassportNumber(
      getDecryptedPassportNumber(existingPassenger)
    );
    ok(
      "existing passenger admin masking decrypts without plaintext fallback",
      masked.startsWith("••••")
    );
  }

  console.log("\nNew encrypted-only writes");
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
  const owned = await getOwnedTraveler(owner.id, created.id);

  ok(
    "new traveler writes v1 ciphertext",
    Boolean(stored?.passportNumberEncrypted?.startsWith("v1:"))
  );
  ok(
    "new traveler legacy field is the placeholder",
    stored?.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );
  ok(
    "owner autofill returns decrypted passport",
    owned?.passportNumber === sampleTraveler.passportNumber
  );

  await updateOwnedTraveler(owner.id, created.id, {
    ...parseTravelerInput(sampleTraveler),
    passportNumber: "HT-D91-UPDATED",
  });
  const updatedStored = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: created.id })
    .first();
  const updatedOwned = await getOwnedTraveler(owner.id, created.id);

  ok(
    "traveler update rewrites ciphertext",
    Boolean(updatedStored?.passportNumberEncrypted) &&
      updatedStored?.passportNumberEncrypted !== stored?.passportNumberEncrypted
  );
  ok(
    "traveler update keeps the placeholder",
    updatedStored?.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );
  ok(
    "owner autofill works after update",
    updatedOwned?.passportNumber === "HT-D91-UPDATED"
  );

  const flight = await db.orm.public.Flight.create({
    code: `D91-${stamp}-${randomInt(10, 99)}`,
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

  const booking = await db.orm.public.Booking.create({
    bookingReference: `D91B-${stamp}`,
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
    ...passportWriteFields("HT-D91-BOOK"),
    passportCountry: "Haiti",
    passportExpiry: "2030-12-31",
  });
  createdPassengerIds.push(passenger.id);

  ok(
    "new passenger writes v1 ciphertext",
    Boolean(passenger.passportNumberEncrypted?.startsWith("v1:"))
  );
  ok(
    "new passenger legacy field is the placeholder",
    passenger.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );

  await db.orm.public.Passenger.where({ id: passenger.id }).update(
    passportWriteFields("HT-D91-ADMIN")
  );
  const adminUpdated = await db.orm.public.Passenger.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: passenger.id })
    .first();
  ok(
    "admin-style update rewrites ciphertext",
    Boolean(adminUpdated?.passportNumberEncrypted) &&
      adminUpdated?.passportNumberEncrypted !== passenger.passportNumberEncrypted
  );
  ok(
    "admin-style update keeps the placeholder",
    adminUpdated?.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );
  ok(
    "admin update decrypts the new value",
    adminUpdated != null &&
      getDecryptedPassportNumber(adminUpdated) === "HT-D91-ADMIN"
  );

  console.log("\nRetirement dry-run, corrupt refuse, and synthetic retire");
  const legacyUser = await createTestUser();
  const healthyLegacy = await db.orm.public.TravelerProfile.create({
    userId: legacyUser.id,
    label: "Legacy",
    firstName: "Grace",
    lastName: "Hopper",
    dateOfBirth: "1980-02-02",
    gender: "FEMALE",
    nationality: "Haitian",
    passportNumber: "HT-D91-LEGACY",
    passportNumberEncrypted: encryptTravelerSecret("HT-D91-LEGACY"),
    passportCountry: "Haiti",
    passportExpiry: "2031-01-01",
    isPrimary: true,
  });
  createdTravelerIds.push(healthyLegacy.id);

  const corruptLegacy = await db.orm.public.TravelerProfile.create({
    userId: legacyUser.id,
    label: "Corrupt",
    firstName: "Bad",
    lastName: "Cipher",
    dateOfBirth: "1981-03-03",
    gender: "OTHER",
    nationality: "Haitian",
    passportNumber: "HT-D91-CORRUPT",
    passportNumberEncrypted: "v1:not-a-valid-payload",
    passportCountry: "Haiti",
    passportExpiry: "2031-01-01",
    isPrimary: false,
  });
  createdTravelerIds.push(corruptLegacy.id);

  const dryRun = await retirePlaintextPassports({
    dryRun: true,
    travelerIds: [healthyLegacy.id],
    passengerIds: [],
  });
  const afterDryRun = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: healthyLegacy.id })
    .first();

  ok("dry-run marks the healthy row eligible", dryRun.travelerCounts.eligible === 1);
  ok("dry-run reports a retirement count without writing", dryRun.travelerCounts.retired === 1);
  ok(
    "dry-run leaves legacy plaintext unchanged",
    afterDryRun?.passportNumber === "HT-D91-LEGACY" &&
      afterDryRun.passportNumberEncrypted === healthyLegacy.passportNumberEncrypted
  );

  const corruptResult = await retirePlaintextPassports({
    dryRun: false,
    travelerIds: [corruptLegacy.id],
    passengerIds: [],
  });
  const afterCorrupt = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: corruptLegacy.id })
    .first();
  ok("corrupt ciphertext is refused", corruptResult.travelerCounts.refused === 1);
  ok(
    "corrupt row keeps its legacy plaintext",
    afterCorrupt?.passportNumber === "HT-D91-CORRUPT"
  );

  const first = await retirePlaintextPassports({
    dryRun: false,
    travelerIds: [healthyLegacy.id],
    passengerIds: [],
  });
  const afterRetire = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  )
    .where({ id: healthyLegacy.id })
    .first();
  ok("healthy synthetic row is retired", first.travelerCounts.retired === 1);
  ok(
    "retired legacy field is the placeholder",
    afterRetire?.passportNumber === LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER
  );
  ok(
    "retirement does not change ciphertext",
    afterRetire?.passportNumberEncrypted === healthyLegacy.passportNumberEncrypted
  );
  ok(
    "retired row still decrypts",
    afterRetire != null &&
      getDecryptedPassportNumber(afterRetire) === "HT-D91-LEGACY"
  );

  const second = await retirePlaintextPassports({
    dryRun: false,
    travelerIds: [healthyLegacy.id],
    passengerIds: [],
  });
  ok(
    "second retirement run is idempotent",
    second.travelerCounts.skipped === 1 && second.travelerCounts.retired === 0
  );

  await cleanup();
  await db.close();

  if (failures > 0) {
    console.error(`\n${failures} retirement test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll passport retirement tests passed.");
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
