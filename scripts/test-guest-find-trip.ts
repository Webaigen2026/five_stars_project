/**
 * D15.2 Find My Trip OTP DB checks.
 *
 *   npx tsx --conditions=react-server scripts/test-guest-find-trip.ts
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import {
  evaluateBookingAccess,
  normalizeBookingContactEmail,
} from "../src/lib/booking-access";
import {
  evaluateGuestTripCodeAttempt,
  generateGuestTripAccessCode,
  hashGuestTripAccessCode,
  isGuestTripResendCooldownActive,
  normalizeBookingReference,
} from "../src/lib/guest-trip-access";
import { db } from "../src/prisma/db";

const marker = randomBytes(4).toString("hex");

function pass(label: string) {
  console.log(`  PASS  ${label}`);
}

async function main() {
  console.log("\nGuest Find My Trip (D15.2)");
  let userId: number | null = null;
  let guestBookingId: number | null = null;
  let accountBookingId: number | null = null;

  try {
    const flight = await db.orm.public.Flight.where({
      status: "SCHEDULED",
    }).first();
    assert.ok(flight);

    const user = await db.orm.public.User.select("id", "email").create({
      email: `findtrip.acct.${marker}@example.com`,
      password: await bcrypt.hash("Password123!", 12),
      role: "CUSTOMER",
      emailVerified: false,
      failedLoginAttempts: 0,
    });
    userId = user.id;

    const guestEmail = normalizeBookingContactEmail(
      `FindTrip.${marker}@Example.COM`
    );
    const guestRef = normalizeBookingReference(`sj-g${marker.slice(0, 5)}`);

    const guestBooking = await db.orm.public.Booking.select(
      "id",
      "bookingReference",
      "userId",
      "contactEmail"
    ).create({
      bookingReference: guestRef,
      flightId: flight.id,
      passengerCount: 1,
      subtotal: 10000,
      taxesAndFees: 1500,
      total: 11500,
      seatFeesTotal: 0,
      status: "DRAFT",
      inventoryHeld: false,
      contactEmail: guestEmail,
    });
    guestBookingId = guestBooking.id;
    assert.equal(guestBooking.userId, null);

    const accountBooking = await db.orm.public.Booking.select(
      "id",
      "bookingReference",
      "userId"
    ).create({
      bookingReference: normalizeBookingReference(`sj-a${marker.slice(0, 5)}`),
      flightId: flight.id,
      passengerCount: 1,
      subtotal: 10000,
      taxesAndFees: 1500,
      total: 11500,
      seatFeesTotal: 0,
      status: "DRAFT",
      inventoryHeld: false,
      userId: user.id,
      contactEmail: user.email,
    });
    accountBookingId = accountBooking.id;

    const code = generateGuestTripAccessCode();
    const codeHash = hashGuestTripAccessCode(code);
    await db.orm.public.GuestTripAccessCode.create({
      bookingId: guestBooking.id,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attemptCount: 0,
    });
    pass("A. guest challenge can be created for guest booking");

    const challenge = await db.orm.public.GuestTripAccessCode.where({
      bookingId: guestBooking.id,
    }).first();
    assert.ok(challenge);
    assert.equal(JSON.stringify(challenge).includes(code), false);
    pass("H. raw OTP never persisted");

    assert.equal(
      evaluateGuestTripCodeAttempt({
        submittedCode: code,
        codeHash: challenge!.codeHash,
        attemptCount: challenge!.attemptCount,
        expiresAt: challenge!.expiresAt,
      }).outcome,
      "accept"
    );
    pass("I. correct code evaluates accept");

    // Cooldown helper
    assert.equal(
      isGuestTripResendCooldownActive(new Date().toISOString()),
      true
    );
    pass("F. cooldown helper active for fresh challenge");

    // Account-owned booking must not grant guest access even with matching JWT shape
    assert.equal(
      evaluateBookingAccess({
        bookingId: accountBooking.id,
        bookingReference: accountBooking.bookingReference,
        bookingUserId: accountBooking.userId,
        currentUserId: null,
        guestAuthorization: {
          bookingId: accountBooking.id,
          bookingReference: accountBooking.bookingReference,
        },
      }).authorized,
      false
    );
    pass("D/X. account-owned booking rejects guest authorization");

    assert.equal(
      evaluateBookingAccess({
        bookingId: guestBooking.id,
        bookingReference: guestBooking.bookingReference,
        bookingUserId: null,
        currentUserId: null,
        guestAuthorization: {
          bookingId: guestBooking.id,
          bookingReference: guestBooking.bookingReference,
        },
      }).authorized,
      true
    );
    pass("N. guest JWT-shaped auth scopes to guest booking");

    // Invalidate previous + create new
    await db.orm.public.GuestTripAccessCode.where({
      bookingId: guestBooking.id,
    }).delete();
    const nextCode = generateGuestTripAccessCode();
    await db.orm.public.GuestTripAccessCode.create({
      bookingId: guestBooking.id,
      codeHash: hashGuestTripAccessCode(nextCode),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attemptCount: 0,
    });
    const rows = await db.orm.public.GuestTripAccessCode.where({
      bookingId: guestBooking.id,
    }).all();
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].codeHash, codeHash);
    pass("E. new challenge replaces previous");

    console.log("\nguest find-trip DB checks passed\n");
  } finally {
    if (guestBookingId) {
      await db.orm.public.GuestTripAccessCode.where({
        bookingId: guestBookingId,
      }).delete();
      await db.orm.public.Booking.where({ id: guestBookingId }).delete();
    }
    if (accountBookingId) {
      await db.orm.public.Booking.where({ id: accountBookingId }).delete();
    }
    if (userId) {
      await db.orm.public.User.where({ id: userId }).delete();
    }
    await db.close();
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await db.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
