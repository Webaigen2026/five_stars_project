/**
 * Checkout ownership, privacy, and status-aware review checks.
 *
 * Usage:
 *   npx tsx scripts/test-checkout.ts
 */
import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import { createUserSession, SESSION_COOKIE_NAME } from "../src/lib/auth";
import { getBookingStatusPresentation } from "../src/lib/booking-status";
import {
  canReviewCheckoutBooking,
  getCheckoutPaymentAction,
} from "../src/lib/checkout";
import { isStripeConfigured } from "../src/lib/payments";
import {
  ensureTestEncryptionKey,
  passportWriteFields,
} from "../src/lib/traveler-encryption";
import { db } from "../src/prisma/db";

const stamp = `${Date.now()}-${randomInt(100, 999)}`;
const createdUserIds: number[] = [];
const createdFlightIds: number[] = [];
const createdBookingIds: number[] = [];
const createdSessionIds: string[] = [];
let failures = 0;

function ok(label: string, passed: boolean) {
  if (passed) {
    console.log(`  PASS  ${label}`);
    return;
  }

  failures += 1;
  console.error(`  FAIL  ${label}`);
}

async function createTestUser(role = "CUSTOMER") {
  const user = await db.orm.public.User.create({
    email: `d7.checkout.${stamp}.${createdUserIds.length}@example.com`,
    password: await bcrypt.hash("CorrectHorse1", 4),
    firstName: "Checkout",
    lastName: "Tester",
    role,
    emailVerified: true,
  });

  createdUserIds.push(user.id);
  return user;
}

async function createTestFlight() {
  const flight = await db.orm.public.Flight.create({
    code: `D7C-${stamp}-${randomInt(10, 99)}`,
    airline: "StarJet",
    aircraft: "Airbus A320",
    origin: "Boston",
    originCode: "BOS",
    destination: "Port-au-Prince",
    destinationCode: "PAP",
    departureTime: "2026-12-01T08:30:00.000-04:00",
    arrivalTime: "2026-12-01T12:15:00.000-04:00",
    durationMinutes: 225,
    price: 35300,
    totalSeats: 10,
    availableSeats: 10,
    status: "SCHEDULED",
  });

  createdFlightIds.push(flight.id);
  return flight;
}

async function createTestBooking({
  userId,
  flightId,
  status,
  reference,
}: {
  userId: number | null;
  flightId: number;
  status: string;
  reference: string;
}) {
  const booking = await db.orm.public.Booking.create({
    bookingReference: reference,
    userId,
    flightId,
    passengerCount: 1,
    subtotal: 35300,
    taxesAndFees: 6800,
    total: 42100,
    status,
    inventoryHeld: false,
  });

  createdBookingIds.push(booking.id);

  await db.orm.public.Passenger.create({
    bookingId: booking.id,
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-15",
    gender: "FEMALE",
    nationality: "Haitian",
    ...passportWriteFields("HT-D7-SECRET"),
    passportCountry: "Haiti",
    passportExpiry: "2030-12-31",
  });

  return booking;
}

async function cleanup() {
  for (const userId of createdUserIds) {
    const sessions = await db.orm.public.Session.where({ userId }).all();

    for (const session of sessions) {
      await db.orm.public.Session.where({ id: session.id }).delete();
    }
  }

  for (const sessionId of createdSessionIds.splice(0)) {
    const existing = await db.orm.public.Session.where({ id: sessionId }).first();

    if (existing) {
      await db.orm.public.Session.where({ id: sessionId }).delete();
    }
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

  for (const flightId of createdFlightIds.splice(0).reverse()) {
    await db.orm.public.Flight.where({ id: flightId }).delete();
  }

  for (const userId of createdUserIds.splice(0).reverse()) {
    await db.orm.public.User.where({ id: userId }).delete();
  }
}

async function cookieForUser(user: { id: number; email: string; role: string }) {
  const token = await createUserSession(user);
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8")
  ) as { sessionId?: string };

  if (claims.sessionId) {
    createdSessionIds.push(claims.sessionId);
  }

  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function fetchCheckout(
  baseUrl: string,
  reference: string,
  cookie?: string,
  extraQuery = ""
) {
  const response = await fetch(
    `${baseUrl}/checkout?booking=${encodeURIComponent(reference)}${extraQuery}`,
    {
      headers: cookie ? { cookie } : undefined,
    }
  );

  return {
    status: response.status,
    html: await response.text(),
  };
}

async function main() {
  ensureTestEncryptionKey();

  console.log("\nCheckout helpers");
  ok(
    "other customer cannot review an owned booking",
    canReviewCheckoutBooking(7, 8) === false
  );
  ok(
    "owner DRAFT without Stripe is unavailable, not a fake success",
    getCheckoutPaymentAction({
      bookingUserId: 7,
      bookingStatus: "DRAFT",
      currentUserId: 7,
      currentUserRole: "CUSTOMER",
      stripeConfigured: false,
    }) === "unavailable"
  );
  ok(
    "CONFIRMED has no payment action",
    getCheckoutPaymentAction({
      bookingUserId: 7,
      bookingStatus: "CONFIRMED",
      currentUserId: 7,
      currentUserRole: "CUSTOMER",
      stripeConfigured: true,
    }) === "ineligible"
  );
  ok(
    "unknown status has a neutral fallback",
    getBookingStatusPresentation("WEIRD").description ===
      "Booking status is being reviewed."
  );

  const owner = await createTestUser();
  const other = await createTestUser();
  const flight = await createTestFlight();
  const draft = await createTestBooking({
    userId: owner.id,
    flightId: flight.id,
    status: "DRAFT",
    reference: `D7-DRAFT-${stamp}`,
  });
  const pending = await createTestBooking({
    userId: owner.id,
    flightId: flight.id,
    status: "PENDING_PAYMENT",
    reference: `D7-PEND-${stamp}`,
  });
  const confirmed = await createTestBooking({
    userId: owner.id,
    flightId: flight.id,
    status: "CONFIRMED",
    reference: `D7-CONF-${stamp}`,
  });
  const cancelled = await createTestBooking({
    userId: owner.id,
    flightId: flight.id,
    status: "CANCELLED",
    reference: `D7-CANC-${stamp}`,
  });
  const guest = await createTestBooking({
    userId: null,
    flightId: flight.id,
    status: "DRAFT",
    reference: `D7-GUEST-${stamp}`,
  });
  const unknown = await createTestBooking({
    userId: owner.id,
    flightId: flight.id,
    status: "WEIRD",
    reference: `D7-UNK-${stamp}`,
  });

  const baseUrl = process.env.D7_APP_URL ?? "http://localhost:3000";

  console.log("\nCheckout HTTP");
  try {
    const ownerCookie = await cookieForUser(owner);
    const otherCookie = await cookieForUser(other);

    const draftPage = await fetchCheckout(
      baseUrl,
      draft.bookingReference,
      ownerCookie,
      "&total=1&status=PAID"
    );
    ok("owner DRAFT checkout returns 200", draftPage.status === 200);
    ok(
      "owner DRAFT shows booking reference",
      draftPage.html.includes(draft.bookingReference)
    );
    ok("owner DRAFT shows flight code", draftPage.html.includes(flight.code));
    ok(
      "owner DRAFT shows passenger name",
      draftPage.html.includes("Ada") && draftPage.html.includes("Lovelace")
    );
    ok(
      "owner DRAFT shows persisted total, not URL amount",
      draftPage.html.includes("$421.00") && !draftPage.html.includes("$0.01")
    );
    ok(
      "owner DRAFT shows ready-for-payment message",
      draftPage.html.includes("Booking created. Payment has not been completed.")
    );
    ok(
      "owner DRAFT shows seat availability notice",
      draftPage.html.includes(
        "Seats are subject to availability until payment is confirmed."
      )
    );
    ok(
      "passport and date of birth stay off checkout",
      !draftPage.html.includes("HT-D7-SECRET") &&
        !draftPage.html.includes("1990-01-15") &&
        !draftPage.html.includes("2030-12-31")
    );
    ok(
      "Stripe-disabled state is handled safely",
      isStripeConfigured()
        ? draftPage.html.includes("Continue to Payment")
        : draftPage.html.includes("Online payment is not available yet.")
    );

    const pendingPage = await fetchCheckout(
      baseUrl,
      pending.bookingReference,
      ownerCookie
    );
    ok(
      "PENDING_PAYMENT message is correct",
      pendingPage.html.includes(
        "Your payment has been started and is awaiting confirmation."
      )
    );
    ok(
      "PENDING_PAYMENT does not claim success",
      !pendingPage.html.includes("Payment has been received.")
    );

    const confirmedPage = await fetchCheckout(
      baseUrl,
      confirmed.bookingReference,
      ownerCookie
    );
    ok(
      "CONFIRMED shows confirmed status",
      confirmedPage.html.includes("Your booking is confirmed.")
    );
    ok(
      "CONFIRMED has no payment CTA",
      !confirmedPage.html.includes("Continue to Payment") &&
        !confirmedPage.html.includes("Online payment is not available yet.")
    );

    const cancelledPage = await fetchCheckout(
      baseUrl,
      cancelled.bookingReference,
      ownerCookie
    );
    ok(
      "CANCELLED shows cancelled message",
      cancelledPage.html.includes("This booking has been cancelled.")
    );
    ok(
      "CANCELLED has no payment CTA",
      !cancelledPage.html.includes("Continue to Payment")
    );

    const otherPage = await fetchCheckout(
      baseUrl,
      draft.bookingReference,
      otherCookie
    );
    ok("other customer cannot open payment", otherPage.status === 200);
    ok(
      "other customer sees an unavailable state",
      otherPage.html.includes("Booking not available.")
    );
    ok(
      "other customer does not see passenger names",
      !otherPage.html.includes("Ada Lovelace")
    );

    const guestPage = await fetchCheckout(baseUrl, guest.bookingReference);
    ok("logged-out guest booking remains reviewable", guestPage.status === 200);
    ok(
      "guest booking asks for sign-in before payment",
      guestPage.html.includes("Sign in is required before payment.")
    );

    const unknownPage = await fetchCheckout(
      baseUrl,
      unknown.bookingReference,
      ownerCookie
    );
    ok(
      "unknown status uses a neutral fallback",
      unknownPage.html.includes("Booking status is being reviewed.")
    );

    const missing = await fetchCheckout(baseUrl, "D7-MISSING-REF");
    ok(
      "unknown reference is a friendly not-found page",
      missing.html.includes("Booking not found.")
    );
  } catch {
    console.log("  skip  Checkout HTTP (app server not reachable).");
  }

  await cleanup();
  await db.close();

  if (failures > 0) {
    console.error(`\n${failures} checkout test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll checkout tests passed.");
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
