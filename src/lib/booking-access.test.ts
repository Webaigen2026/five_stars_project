import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessBooking,
  evaluateBookingAccess,
  isValidBookingContactEmail,
  normalizeBookingContactEmail,
  resolveBookingContactEmail,
} from "./booking-access";
import {
  GUEST_BOOKING_AUTH_TTL_SECONDS,
  GUEST_BOOKING_COOKIE_NAME,
  GUEST_BOOKING_PURPOSE,
  createGuestBookingAuthorizationToken,
  getGuestBookingCookieOptions,
  verifyGuestBookingAuthorizationToken,
} from "./guest-booking-auth";
import { getCheckoutPaymentAction } from "./checkout";
import {
  buildCheckoutSessionMetadata,
  validatePayableBookingForCheckout,
} from "./payment-checkout";
import { PaymentError } from "./payments";
import { sensitiveJson } from "./request-security";

describe("booking access policy (D15.1)", () => {
  it("A. authenticated owner is authorized", () => {
    const result = evaluateBookingAccess({
      bookingId: 1,
      bookingReference: "SJ-AAAAAA",
      bookingUserId: 10,
      currentUserId: 10,
      guestAuthorization: null,
    });
    assert.equal(result.authorized, true);
    assert.equal(result.mode, "account");
  });

  it("B. guest with matching auth is authorized", () => {
    const result = evaluateBookingAccess({
      bookingId: 5,
      bookingReference: "SJ-GUEST1",
      bookingUserId: null,
      currentUserId: null,
      guestAuthorization: {
        bookingId: 5,
        bookingReference: "SJ-GUEST1",
      },
    });
    assert.equal(result.authorized, true);
    assert.equal(result.mode, "guest");
  });

  it("6. guest booking cannot be fetched by reference alone", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 5,
        bookingReference: "SJ-GUEST1",
        bookingUserId: null,
        currentUserId: null,
        guestAuthorization: null,
      }),
      false
    );
  });

  it("7. reference + email is not authorization", () => {
    // Policy has no email input — contactEmail never grants access.
    assert.equal(
      canAccessBooking({
        bookingId: 5,
        bookingReference: "SJ-GUEST1",
        bookingUserId: null,
        currentUserId: null,
        guestAuthorization: null,
      }),
      false
    );
  });

  it("9. guest auth for booking A cannot access booking B", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 2,
        bookingReference: "SJ-BBBBBB",
        bookingUserId: null,
        currentUserId: null,
        guestAuthorization: {
          bookingId: 1,
          bookingReference: "SJ-AAAAAA",
        },
      }),
      false
    );
  });

  it("10. logged-in user A cannot access user B booking", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 9,
        bookingReference: "SJ-OWNER",
        bookingUserId: 10,
        currentUserId: 11,
        guestAuthorization: null,
      }),
      false
    );
  });

  it("guest cookie cannot unlock an account booking", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 9,
        bookingReference: "SJ-OWNER",
        bookingUserId: 10,
        currentUserId: null,
        guestAuthorization: {
          bookingId: 9,
          bookingReference: "SJ-OWNER",
        },
      }),
      false
    );
  });
});

describe("contact email (D15.1)", () => {
  it("F/G. guest requires valid normalized email", () => {
    assert.throws(
      () =>
        resolveBookingContactEmail({
          currentUserEmail: null,
          submittedContactEmail: "",
        }),
      /contact email/i
    );
    assert.equal(
      resolveBookingContactEmail({
        currentUserEmail: null,
        submittedContactEmail: "  Guest@Example.COM ",
      }).contactEmail,
      "guest@example.com"
    );
    assert.equal(normalizeBookingContactEmail("  A@B.COM "), "a@b.com");
    assert.equal(isValidBookingContactEmail("a@b.com"), true);
  });

  it("H/I. existing-account email allowed for guest; no auto-link", () => {
    const guest = resolveBookingContactEmail({
      currentUserEmail: null,
      submittedContactEmail: "member@example.com",
    });
    assert.equal(guest.contactEmail, "member@example.com");
    // Ownership remains null when no session — tested at API layer.
  });

  it("authenticated booking uses session email", () => {
    assert.equal(
      resolveBookingContactEmail({
        currentUserEmail: "Owner@FiveStars.com",
        submittedContactEmail: "ignored@example.com",
      }).contactEmail,
      "owner@fivestars.com"
    );
  });
});

describe("guest booking authorization token (D15.1)", () => {
  it("creates verifiable short-lived tokens", async () => {
    process.env.AUTH_SECRET =
      process.env.AUTH_SECRET ?? "test-auth-secret-for-d15-guest-booking";
    const token = await createGuestBookingAuthorizationToken({
      bookingId: 42,
      bookingReference: "SJ-TOKEN1",
    });
    const verified = await verifyGuestBookingAuthorizationToken(token);
    assert.deepEqual(verified, {
      bookingId: 42,
      bookingReference: "SJ-TOKEN1",
    });
    assert.equal(
      await verifyGuestBookingAuthorizationToken("not-a-token"),
      null
    );
  });

  it("cookie options are HttpOnly / short-lived", () => {
    const options = getGuestBookingCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/");
    assert.equal(options.maxAge, GUEST_BOOKING_AUTH_TTL_SECONDS);
    assert.equal(GUEST_BOOKING_COOKIE_NAME, "five_stars_guest_booking");
    assert.equal(GUEST_BOOKING_PURPOSE, "guest_booking_access");
  });
});

describe("checkout/payment authorization (D15.1)", () => {
  it("13. guest with authorization can pay", () => {
    assert.equal(
      getCheckoutPaymentAction({
        bookingUserId: null,
        bookingStatus: "DRAFT",
        currentUserId: null,
        currentUserRole: null,
        stripeConfigured: true,
        guestAuthorized: true,
      }),
      "ready"
    );
  });

  it("guest without authorization cannot pay", () => {
    assert.equal(
      getCheckoutPaymentAction({
        bookingUserId: null,
        bookingStatus: "DRAFT",
        currentUserId: null,
        currentUserRole: null,
        stripeConfigured: true,
        guestAuthorized: false,
      }),
      "signin"
    );
  });

  it("14. Stripe metadata omits fake userId for guests", () => {
    assert.deepEqual(
      buildCheckoutSessionMetadata({
        bookingId: 3,
        bookingReference: "SJ-META",
        userId: null,
      }),
      {
        bookingId: "3",
        bookingReference: "SJ-META",
      }
    );
    assert.deepEqual(
      buildCheckoutSessionMetadata({
        bookingId: 3,
        bookingReference: "SJ-META",
        userId: 7,
      }),
      {
        bookingId: "3",
        bookingReference: "SJ-META",
        userId: "7",
      }
    );
  });

  it("validatePayableBooking requires prior authorization", () => {
    assert.throws(
      () =>
        validatePayableBookingForCheckout({
          booking: {
            id: 1,
            bookingReference: "SJ-X",
            userId: null,
            status: "DRAFT",
            total: 10000,
            seatFeesTotal: 0,
            subtotal: 9000,
            taxesAndFees: 1000,
            inventoryHeld: false,
            passengerCount: 1,
          },
          accessAuthorized: false,
          passengerRows: 1,
          segmentCount: 1,
          existingPayment: null,
        }),
      (error: unknown) => error instanceof PaymentError && error.status === 403
    );

    const ok = validatePayableBookingForCheckout({
      booking: {
        id: 1,
        bookingReference: "SJ-X",
        userId: null,
        status: "DRAFT",
        total: 10000,
        seatFeesTotal: 0,
        subtotal: 9000,
        taxesAndFees: 1000,
        inventoryHeld: false,
        passengerCount: 1,
      },
      accessAuthorized: true,
      passengerRows: 1,
      segmentCount: 1,
      existingPayment: null,
    });
    assert.equal(ok.amountCents, 10000);
  });

  it("AE. sensitive responses use no-store", () => {
    const response = sensitiveJson({ bookingReference: "SJ-X" });
    assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
  });
});
