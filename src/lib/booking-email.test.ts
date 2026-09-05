import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildBookingEmailContent,
  resolveBookingEmailRecipient,
  type BookingEmailLegInput,
} from "./email/booking-email-content";
import {
  sendBookingCreatedEmailForBooking,
  sendPaymentReceivedEmailForBooking,
  type BookingEmailBundle,
  type BookingEmailStore,
} from "./email/booking-email-dispatch";
import {
  bookingCreatedEmailIdempotencyKey,
  paymentReceivedEmailIdempotencyKey,
} from "./email/booking-email-keys";
import {
  EMAIL_SEND_FAILURE_MESSAGE,
  sendTransactionalEmail,
  type SendEmailOptions,
  type SendEmailPayload,
} from "./email/resend";
import { buildBookingCreatedEmail } from "./email/templates/booking-created";
import { buildBookingPaymentReceivedEmail } from "./email/templates/booking-payment-received";
import { decideCheckoutSessionCompleted } from "./stripe-webhook";

const here = path.dirname(fileURLToPath(import.meta.url));

const TEST_ENV = {
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
  NEXT_PUBLIC_APP_URL: "https://www.fivestarsfly.com",
} as unknown as NodeJS.ProcessEnv;

function leg(input: {
  sequence: number;
  segmentType: "OUTBOUND" | "RETURN";
  flightId: number;
  code: string;
  origin?: string;
  originCode: string;
  destination?: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime?: string;
  durationMinutes?: number;
  price?: number;
  fareFamily?: string;
  farePriceCents?: number | null;
}): BookingEmailLegInput {
  return {
    sequence: input.sequence,
    segmentType: input.segmentType,
    flightId: input.flightId,
    fareFamily: input.fareFamily ?? "BASIC",
    farePriceCents:
      input.farePriceCents === undefined ? 19400 : input.farePriceCents,
    flight: {
      code: input.code,
      origin: input.origin ?? input.originCode,
      originCode: input.originCode,
      destination: input.destination ?? input.destinationCode,
      destinationCode: input.destinationCode,
      departureTime: input.departureTime,
      arrivalTime: input.arrivalTime ?? input.departureTime,
      durationMinutes: input.durationMinutes ?? 60,
      price: input.price ?? 99999,
    },
  };
}

const outboundLeg = leg({
  sequence: 1,
  segmentType: "OUTBOUND",
  flightId: 10,
  code: "SJ602",
  origin: "Boston",
  originCode: "BOS",
  destination: "Port-au-Prince",
  destinationCode: "PAP",
  departureTime: "2026-09-06T20:55:00.000Z",
  arrivalTime: "2026-09-06T21:55:00.000Z",
  fareFamily: "STANDARD",
  farePriceCents: 19400,
});

const returnLeg = leg({
  sequence: 2,
  segmentType: "RETURN",
  flightId: 11,
  code: "SJ603",
  origin: "Port-au-Prince",
  originCode: "PAP",
  destination: "Boston",
  destinationCode: "BOS",
  departureTime: "2026-09-12T16:00:00.000Z",
  arrivalTime: "2026-09-12T20:00:00.000Z",
  fareFamily: "FLEX",
  farePriceCents: 22000,
});

function sampleContent(input?: {
  isGuest?: boolean;
  legs?: BookingEmailLegInput[];
  seatAssignments?: Array<{
    bookingSegmentId: number;
    passengerId: number;
    seatNumber: string;
  }>;
  seatFeesTotal?: number;
  status?: string;
}) {
  const isGuest = input?.isGuest ?? true;
  const legs = input?.legs ?? [outboundLeg];
  return buildBookingEmailContent({
    bookingReference: "SJ-XXXXXX",
    status: input?.status ?? "DRAFT",
    userId: isGuest ? null : 42,
    subtotal: 38800,
    taxesAndFees: 6800,
    total: 45600,
    seatFeesTotal: input?.seatFeesTotal ?? 2400,
    legs,
    passengers: [
      {
        id: 1,
        firstName: "Olivier",
        lastName: "Kepler",
        passengerType: "ADULT",
      },
      {
        id: 2,
        firstName: "Murielle",
        lastName: "Kepler",
        passengerType: "SENIOR",
      },
    ],
    segments: legs.map((row, index) => ({
      id: index + 1,
      segmentType: row.segmentType,
      flightId: row.flightId,
    })),
    seatAssignments: input?.seatAssignments,
    findTripUrl: "https://www.fivestarsfly.com/find-trip",
    tripUrl: "https://www.fivestarsfly.com/my-trips/SJ-XXXXXX",
    itineraryUrl: "https://www.fivestarsfly.com/my-trips/SJ-XXXXXX/itinerary",
    myTripsUrl: "https://www.fivestarsfly.com/my-trips",
  });
}

function mutableBundle(overrides?: Partial<BookingEmailBundle["booking"]>): {
  bundle: BookingEmailBundle;
  store: BookingEmailStore;
} {
  const bundle: BookingEmailBundle = {
    booking: {
      id: 101,
      bookingReference: "SJ-XXXXXX",
      status: "DRAFT",
      userId: null,
      contactEmail: "guest@example.com",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      seatFeesTotal: 2400,
      bookingCreatedEmailSentAt: null,
      paymentReceivedEmailSentAt: null,
      ...overrides,
    },
    passengers: [
      {
        id: 1,
        firstName: "Olivier",
        lastName: "Kepler",
        passengerType: "ADULT",
      },
    ],
    segments: [
      { id: 1, segmentType: "OUTBOUND", flightId: outboundLeg.flightId },
    ],
    seatAssignments: [],
    legs: [outboundLeg],
    user: null,
  };

  const store: BookingEmailStore = {
    loadBundle: async () => structuredClone(bundle),
    markBookingCreatedSent: async (_id, sentAt) => {
      bundle.booking.bookingCreatedEmailSentAt = sentAt;
    },
    markPaymentReceivedSent: async (_id, sentAt) => {
      bundle.booking.paymentReceivedEmailSentAt = sentAt;
    },
  };

  return { bundle, store };
}

describe("booking email templates (D14.3)", () => {
  it("A/B. Five Stars branding, no StarJet", () => {
    const content = sampleContent();
    const created = buildBookingCreatedEmail(content);
    const paid = buildBookingPaymentReceivedEmail({
      ...content,
      status: "PAID",
      statusLabel: "Paid",
    });

    for (const template of [created, paid]) {
      assert.match(template.subject, /Five Stars/);
      assert.match(template.html, /FIVE STARS/);
      assert.match(template.text, /FIVE STARS|Five Stars/);
      assert.equal(/starjet/i.test(template.subject), false);
      assert.equal(/starjet/i.test(template.html), false);
      assert.equal(/starjet/i.test(template.text), false);
    }
  });

  it("C. booking reference included", () => {
    const template = buildBookingCreatedEmail(sampleContent());
    assert.match(template.subject, /SJ-XXXXXX/);
    assert.match(template.html, /SJ-XXXXXX/);
    assert.match(template.text, /SJ-XXXXXX/);
  });

  it("D. one-way route correct", () => {
    const content = sampleContent({ legs: [outboundLeg] });
    const template = buildBookingCreatedEmail(content);
    assert.match(content.routeHeading, /Boston.*→.*Port-au-Prince/);
    assert.equal(content.isRoundTrip, false);
    assert.match(template.html, /OUTBOUND/);
    assert.equal(template.html.includes("RETURN"), false);
  });

  it("E/F. round-trip route + outbound/return rendered", () => {
    const content = sampleContent({ legs: [outboundLeg, returnLeg] });
    const template = buildBookingCreatedEmail(content);
    assert.match(content.routeHeading, /⇄/);
    assert.equal(content.isRoundTrip, true);
    assert.equal(content.segments.length, 2);
    assert.match(template.html, /OUTBOUND/);
    assert.match(template.html, /RETURN/);
    assert.match(template.html, /SJ602/);
    assert.match(template.html, /SJ603/);
    assert.match(template.text, /OUTBOUND/);
    assert.match(template.text, /RETURN/);
  });

  it("G. persisted fare snapshot used", () => {
    const content = sampleContent({
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 10,
          code: "SJ602",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 19400,
          price: 99999,
        }),
      ],
    });
    assert.equal(content.segments[0]?.usedFareSnapshot, true);
    assert.equal(content.segments[0]?.farePriceCents, 19400);
    assert.match(content.segments[0]?.fareLabel ?? "", /Five Stars Standard/);
  });

  it("H. traveler list rendered once with categories", () => {
    const template = buildBookingCreatedEmail(sampleContent());
    const adultMatches = template.html.match(/Olivier Kepler — Adult/g) ?? [];
    const seniorMatches = template.html.match(/Murielle Kepler — Senior/g) ?? [];
    assert.equal(adultMatches.length, 1);
    assert.equal(seniorMatches.length, 1);
    assert.match(template.text, /Olivier Kepler — Adult/);
    assert.match(template.text, /Murielle Kepler — Senior/);
  });

  it("I. seats included when selected", () => {
    const content = sampleContent({
      seatAssignments: [
        { bookingSegmentId: 1, passengerId: 1, seatNumber: "12A" },
        { bookingSegmentId: 1, passengerId: 2, seatNumber: "12B" },
      ],
    });
    const template = buildBookingCreatedEmail(content);
    assert.match(template.html, /Seats/);
    assert.match(template.html, /12A/);
    assert.match(template.html, /12B/);
    assert.match(template.text, /12A/);
  });

  it("J. no seat block when none selected", () => {
    const template = buildBookingCreatedEmail(sampleContent({ seatAssignments: [] }));
    assert.equal(template.html.includes(">Seats<"), false);
    assert.equal(/^Seats$/m.test(template.text), false);
  });

  it("K/L. persisted totals and seat fees", () => {
    const content = sampleContent({ seatFeesTotal: 2400 });
    const template = buildBookingCreatedEmail(content);
    assert.match(template.html, /\$388\.00/);
    assert.match(template.html, /\$68\.00/);
    assert.match(template.html, /\$24\.00/);
    assert.match(template.html, /\$480\.00 USD/);
    assert.match(template.text, /\$480\.00 USD/);
  });

  it("M. no passport/DOB/sensitive fields", () => {
    const content = sampleContent();
    const template = buildBookingCreatedEmail(content);
    for (const blob of [template.html, template.text, JSON.stringify(content)]) {
      assert.equal(/passport/i.test(blob), false);
      assert.equal(/dateOfBirth|DOB|1990-01-01/i.test(blob), false);
      assert.equal(blob.includes("enc-"), false);
    }
  });

  it("N. HTML + text both exist", () => {
    const created = buildBookingCreatedEmail(sampleContent());
    const paid = buildBookingPaymentReceivedEmail(sampleContent({ status: "PAID" }));
    assert.ok(created.html.includes("<!DOCTYPE html>"));
    assert.ok(created.text.length > 40);
    assert.ok(paid.html.includes("<!DOCTYPE html>"));
    assert.ok(paid.text.length > 40);
  });
});

describe("booking email guest/account CTAs (D14.3)", () => {
  it("O-S. guest CTA is Find My Trip only", () => {
    const content = sampleContent({ isGuest: true });
    const template = buildBookingCreatedEmail(content);
    assert.equal(content.cta.url, "https://www.fivestarsfly.com/find-trip");
    assert.equal(content.cta.label, "Find My Trip");
    assert.match(template.html, /find-trip/);
    assert.match(template.text, /find-trip/);
    assert.equal(template.html.includes("/my-trips/SJ-XXXXXX"), false);
    assert.equal(template.text.includes("/my-trips/SJ-XXXXXX"), false);
    assert.equal(/guest_booking|eyJ|otp|verification code is:/i.test(template.html), false);
    assert.equal(/guest_booking|eyJ/i.test(template.text), false);
    assert.equal(template.html.includes(`href="SJ-XXXXXX"`), false);
  });

  it("T-V. account CTA uses canonical trip URL", () => {
    const content = sampleContent({ isGuest: false });
    const template = buildBookingCreatedEmail(content);
    assert.equal(
      content.cta.url,
      "https://www.fivestarsfly.com/my-trips/SJ-XXXXXX"
    );
    assert.equal(content.cta.label, "View My Trip");
    assert.match(template.html, /www\.fivestarsfly\.com\/my-trips\/SJ-XXXXXX/);
    assert.equal(template.html.includes("localhost"), false);
    assert.equal(/guest_booking|eyJ/i.test(template.html), false);
  });
});

describe("booking email recipient + delivery (D14.3)", () => {
  it("W. contactEmail is primary recipient", () => {
    const resolved = resolveBookingEmailRecipient({
      contactEmail: "  Guest@Example.COM ",
      userId: 9,
      userEmail: "account@example.com",
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.email, "guest@example.com");
      assert.equal(resolved.source, "contactEmail");
    }
  });

  it("X. legacy authenticated fallback uses User.email", () => {
    const resolved = resolveBookingEmailRecipient({
      contactEmail: null,
      userId: 9,
      userEmail: "Owner@Example.com",
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.email, "owner@example.com");
      assert.equal(resolved.source, "userEmail");
    }
  });

  it("Y. legacy guest without contactEmail skips", () => {
    const resolved = resolveBookingEmailRecipient({
      contactEmail: null,
      userId: null,
      userEmail: null,
    });
    assert.equal(resolved.ok, false);
  });

  it("Z/AA/AB. provider error does not mutate markers and is normalized", async () => {
    const { bundle, store } = mutableBundle();
    const bookingBefore = structuredClone(bundle.booking);

    const result = await sendBookingCreatedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      send: async () => ({
        error: { name: "application_error", message: "Raw Resend boom" },
      }),
    });

    assert.equal(result.status, "failed");
    assert.equal(bundle.booking.bookingCreatedEmailSentAt, null);
    assert.deepEqual(bundle.booking, bookingBefore);

    await assert.rejects(
      () =>
        sendTransactionalEmail(
          {
            to: "a@b.com",
            subject: "x",
            html: "<p>x</p>",
            text: "x",
          },
          {
            env: TEST_ENV,
            send: async () => ({
              error: {
                name: "application_error",
                message: "Raw Resend boom with stack",
              },
            }),
          }
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.message === EMAIL_SEND_FAILURE_MESSAGE &&
        !error.message.includes("Raw Resend")
    );
  });
});

describe("booking email durable markers (D14.3)", () => {
  it("A/B. null marker attempts send and populates bookingCreatedEmailSentAt", async () => {
    const { bundle, store } = mutableBundle();
    let calls = 0;
    const result = await sendBookingCreatedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      now: () => new Date("2026-09-05T12:00:00.000Z"),
      send: async () => {
        calls += 1;
        return { id: "msg_created" };
      },
    });
    assert.equal(result.status, "sent");
    assert.equal(calls, 1);
    assert.equal(
      bundle.booking.bookingCreatedEmailSentAt,
      "2026-09-05T12:00:00.000Z"
    );
  });

  it("C. populated bookingCreatedEmailSentAt skips Resend", async () => {
    const { store } = mutableBundle({
      bookingCreatedEmailSentAt: "2026-09-05T11:00:00.000Z",
    });
    let calls = 0;
    const result = await sendBookingCreatedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      send: async () => {
        calls += 1;
        return { id: "should_not_send" };
      },
    });
    assert.equal(result.status, "already_sent");
    assert.equal(calls, 0);
  });

  it("D. send failure leaves bookingCreatedEmailSentAt null", async () => {
    const { bundle, store } = mutableBundle();
    const result = await sendBookingCreatedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      send: async () => ({ error: { name: "rate_limit_exceeded" } }),
    });
    assert.equal(result.status, "failed");
    assert.equal(bundle.booking.bookingCreatedEmailSentAt, null);
  });

  it("E/F. payment marker null → send → populate", async () => {
    const { bundle, store } = mutableBundle({ status: "PAID" });
    const result = await sendPaymentReceivedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      now: () => new Date("2026-09-05T13:00:00.000Z"),
      send: async () => ({ id: "msg_paid" }),
    });
    assert.equal(result.status, "sent");
    assert.equal(
      bundle.booking.paymentReceivedEmailSentAt,
      "2026-09-05T13:00:00.000Z"
    );
  });

  it("G. payment marker populated skips Resend", async () => {
    const { store } = mutableBundle({
      status: "PAID",
      paymentReceivedEmailSentAt: "2026-09-05T13:00:00.000Z",
    });
    let calls = 0;
    const result = await sendPaymentReceivedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      send: async () => {
        calls += 1;
        return { id: "nope" };
      },
    });
    assert.equal(result.status, "already_sent");
    assert.equal(calls, 0);
  });

  it("H. payment email failure leaves marker null", async () => {
    const { bundle, store } = mutableBundle({ status: "PAID" });
    const result = await sendPaymentReceivedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      send: async () => ({ error: { name: "application_error" } }),
    });
    assert.equal(result.status, "failed");
    assert.equal(bundle.booking.paymentReceivedEmailSentAt, null);
  });
});

describe("booking email Resend idempotency keys (D14.3)", () => {
  it("I-L. deterministic keys, distinct events, no random", () => {
    assert.equal(
      bookingCreatedEmailIdempotencyKey(101),
      "booking-created:101"
    );
    assert.equal(
      paymentReceivedEmailIdempotencyKey(101),
      "payment-received:101"
    );
    assert.notEqual(
      bookingCreatedEmailIdempotencyKey(101),
      paymentReceivedEmailIdempotencyKey(101)
    );
    assert.equal(
      bookingCreatedEmailIdempotencyKey(101),
      bookingCreatedEmailIdempotencyKey(101)
    );

    const keysSource = readFileSync(
      path.join(here, "email/booking-email-keys.ts"),
      "utf8"
    );
    assert.equal(keysSource.includes("randomUUID"), false);
    assert.equal(keysSource.includes("Date.now"), false);
  });

  it("M/N. wrapper forwards identical Idempotency-Key on retry", async () => {
    const keys: string[] = [];
    const { store } = mutableBundle();

    const send = async (
      _payload: SendEmailPayload,
      options?: SendEmailOptions
    ) => {
      keys.push(options?.idempotencyKey ?? "");
      return { id: "msg_1" };
    };

    // Crash window: first send succeeds at provider, marker write skipped.
    const crashStore: BookingEmailStore = {
      loadBundle: store.loadBundle,
      markBookingCreatedSent: async () => {
        throw new Error("simulated crash before marker");
      },
      markPaymentReceivedSent: store.markPaymentReceivedSent,
    };

    const first = await sendBookingCreatedEmailForBooking(101, {
      store: crashStore,
      env: TEST_ENV,
      send,
    });
    assert.equal(first.status, "failed");

    const second = await sendBookingCreatedEmailForBooking(101, {
      store,
      env: TEST_ENV,
      send,
    });
    assert.equal(second.status, "sent");
    assert.equal(keys.length, 2);
    assert.equal(keys[0], "booking-created:101");
    assert.equal(keys[1], "booking-created:101");
  });

  it("forwards idempotencyKey through sendTransactionalEmail", async () => {
    let seen: string | undefined;
    await sendTransactionalEmail(
      {
        to: "a@b.com",
        subject: "x",
        html: "<p>x</p>",
        text: "x",
      },
      {
        env: TEST_ENV,
        idempotencyKey: "booking-created:55",
        send: async (_payload, options) => {
          seen = options?.idempotencyKey;
          return { id: "msg" };
        },
      }
    );
    assert.equal(seen, "booking-created:55");
  });
});

describe("booking email payment authority (D14.3)", () => {
  it("AC. browser success page source does not call payment email helpers", () => {
    const successSource = readFileSync(
      path.join(here, "../app/payment/success/page.tsx"),
      "utf8"
    );
    assert.equal(successSource.includes("notifyPaymentReceivedEmail"), false);
    assert.equal(successSource.includes("sendPaymentReceivedEmail"), false);
  });

  it("AD. webhook mark_paid path notifies payment email", () => {
    const webhookSource = readFileSync(
      path.join(here, "../app/api/stripe/webhook/route.ts"),
      "utf8"
    );
    assert.match(webhookSource, /notifyPaymentReceivedEmail/);
    assert.match(webhookSource, /mark_paid/);
  });

  it("AE. already-paid webhook decision is noop_paid (retry email only)", () => {
    const decision = decideCheckoutSessionCompleted({
      session: {
        id: "cs_1",
        payment_status: "paid",
        amount_total: 48000,
        currency: "usd",
        metadata: { bookingId: "9" },
      },
      booking: {
        id: 9,
        bookingReference: "SJ-PAID1",
        status: "PAID",
        total: 45600,
        seatFeesTotal: 2400,
        inventoryHeld: true,
      },
      payment: {
        id: 1,
        bookingId: 9,
        amount: 48000,
        status: "SUCCEEDED",
        stripeCheckoutId: "cs_1",
        stripePaymentIntentId: "pi_1",
      },
    });
    assert.equal(decision.action, "noop_paid");
  });

  it("AF/AG. amount uses authoritative helper including seat fees", () => {
    const decision = decideCheckoutSessionCompleted({
      session: {
        id: "cs_2",
        payment_status: "paid",
        amount_total: 48000,
        currency: "usd",
        metadata: { bookingId: "10" },
      },
      booking: {
        id: 10,
        bookingReference: "SJ-DUE1",
        status: "PENDING_PAYMENT",
        total: 45600,
        seatFeesTotal: 2400,
        inventoryHeld: true,
      },
      payment: {
        id: 2,
        bookingId: 10,
        amount: 48000,
        status: "PENDING",
        stripeCheckoutId: "cs_2",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(decision.action, "mark_paid");
    if (decision.action === "mark_paid") {
      assert.equal(decision.amountCents, 48000);
    }
  });

  it("AH. payment email does not claim ticketed for PAID", () => {
    const content = sampleContent({ status: "PAID", isGuest: false });
    content.statusLabel = "Paid";
    const template = buildBookingPaymentReceivedEmail(content);
    assert.match(template.subject, /Payment received/);
    assert.match(template.html, /Payment received/);
    assert.equal(/ticketed/i.test(template.html), false);
    assert.equal(/ticketed/i.test(template.text), false);
  });
});

describe("booking created wording (D14.3)", () => {
  it("DRAFT email does not claim paid/ticketed", () => {
    const template = buildBookingCreatedEmail(sampleContent({ status: "DRAFT" }));
    assert.match(template.html, /Payment has not been completed/);
    assert.match(template.text, /Payment has not been completed/);
    assert.equal(/payment received/i.test(template.subject), false);
    assert.equal(/\bPaid\b/.test(template.subject), false);
  });
});
