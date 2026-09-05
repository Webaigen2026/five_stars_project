/**
 * D15.1 guest booking ownership + contactEmail checks.
 *
 *   npx tsx --conditions=react-server scripts/test-guest-booking.ts
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import {
  evaluateBookingAccess,
  resolveBookingContactEmail,
} from "../src/lib/booking-access";
import { db } from "../src/prisma/db";

const marker = randomBytes(4).toString("hex");

function pass(label: string) {
  console.log(`  PASS  ${label}`);
}

async function cleanup(ids: number[]) {
  for (const userId of ids) {
    const bookings = await db.orm.public.Booking.where({ userId }).all();
    for (const booking of bookings) {
      await db.orm.public.Passenger.where({ bookingId: booking.id }).delete();
      await db.orm.public.BookingSegment.where({
        bookingId: booking.id,
      }).delete();
      await db.orm.public.Booking.where({ id: booking.id }).delete();
    }
    await db.orm.public.User.where({ id: userId }).delete();
  }

  const guests = await db.orm.public.Booking.where({
    contactEmail: `guest.${marker}@example.com`,
  }).all();
  for (const booking of guests) {
    await db.orm.public.Passenger.where({ bookingId: booking.id }).delete();
    await db.orm.public.BookingSegment.where({
      bookingId: booking.id,
    }).delete();
    await db.orm.public.Booking.where({ id: booking.id }).delete();
  }
}

async function main() {
  console.log("\nGuest booking foundation (D15.1)");
  const userIds: number[] = [];

  try {
    const flight = await db.orm.public.Flight.where({
      status: "SCHEDULED",
    }).first();
    assert.ok(flight, "need a scheduled flight");

    const user = await db.orm.public.User.select("id", "email").create({
      email: `acct.${marker}@example.com`,
      password: await bcrypt.hash("Password123!", 12),
      role: "CUSTOMER",
      emailVerified: false,
      failedLoginAttempts: 0,
    });
    userIds.push(user.id);

    const guestContact = resolveBookingContactEmail({
      currentUserEmail: null,
      submittedContactEmail: `  Guest.${marker}@Example.COM `,
    }).contactEmail;
    assert.equal(guestContact, `guest.${marker}@example.com`);
    pass("2/3. guest contactEmail required + normalized");

    const accountContact = resolveBookingContactEmail({
      currentUserEmail: user.email,
      submittedContactEmail: "ignored@example.com",
    }).contactEmail;
    assert.equal(accountContact, user.email);
    pass("4. authenticated contactEmail from session");

    const guestBooking = await db.orm.public.Booking.select(
      "id",
      "bookingReference",
      "userId",
      "contactEmail"
    ).create({
      bookingReference: `SJ-G${marker.slice(0, 5).toUpperCase()}`,
      flightId: flight.id,
      passengerCount: 1,
      subtotal: 10000,
      taxesAndFees: 1500,
      total: 11500,
      seatFeesTotal: 0,
      status: "DRAFT",
      inventoryHeld: false,
      contactEmail: guestContact,
    });
    assert.equal(guestBooking.userId, null);
    assert.equal(guestBooking.contactEmail, guestContact);
    pass("1. guest booking persists userId=null + contactEmail");

    const accountBooking = await db.orm.public.Booking.select(
      "id",
      "bookingReference",
      "userId",
      "contactEmail"
    ).create({
      bookingReference: `SJ-A${marker.slice(0, 5).toUpperCase()}`,
      flightId: flight.id,
      passengerCount: 1,
      subtotal: 10000,
      taxesAndFees: 1500,
      total: 11500,
      seatFeesTotal: 0,
      status: "DRAFT",
      inventoryHeld: false,
      userId: user.id,
      contactEmail: accountContact,
    });
    assert.equal(accountBooking.userId, user.id);
    pass("4. authenticated booking receives userId");

    assert.equal(
      evaluateBookingAccess({
        bookingId: guestBooking.id,
        bookingReference: guestBooking.bookingReference,
        bookingUserId: guestBooking.userId,
        currentUserId: null,
        guestAuthorization: null,
      }).authorized,
      false
    );
    pass("6. reference alone does not authorize guest booking");

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
    pass("8. valid guest authorization accesses its booking");

    assert.equal(
      evaluateBookingAccess({
        bookingId: accountBooking.id,
        bookingReference: accountBooking.bookingReference,
        bookingUserId: accountBooking.userId,
        currentUserId: user.id + 999,
        guestAuthorization: null,
      }).authorized,
      false
    );
    pass("10. another customer cannot access account booking");

    // Same email as existing account still allowed as guest contact (no auto-link).
    const overlap = await db.orm.public.Booking.select("id", "userId").create({
      bookingReference: `SJ-O${marker.slice(0, 5).toUpperCase()}`,
      flightId: flight.id,
      passengerCount: 1,
      subtotal: 10000,
      taxesAndFees: 1500,
      total: 11500,
      seatFeesTotal: 0,
      status: "DRAFT",
      inventoryHeld: false,
      contactEmail: user.email,
    });
    assert.equal(overlap.userId, null);
    pass("H/I. existing-account email allowed; booking not auto-linked");

    console.log("\nguest booking DB checks passed\n");
  } finally {
    await cleanup(userIds);
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
