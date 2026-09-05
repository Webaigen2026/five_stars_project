import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  canAccessBooking,
  canMutateAuthorizedBooking,
  evaluateBookingAccess,
  isValidBookingContactEmail,
  normalizeBookingContactEmail,
  resolveBookingContactEmail,
  seatMutationAccessDeniedMessage,
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

const here = path.dirname(fileURLToPath(import.meta.url));

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

describe("seat mutation access (seat Forbidden regression)", () => {
  it("A. authenticated owner may mutate seats", () => {
    const access = evaluateBookingAccess({
      bookingId: 1,
      bookingReference: "SJ-OWN1",
      bookingUserId: 10,
      currentUserId: 10,
      guestAuthorization: null,
    });
    assert.equal(canMutateAuthorizedBooking(access), true);
  });

  it("B. different authenticated user denied", () => {
    const access = evaluateBookingAccess({
      bookingId: 1,
      bookingReference: "SJ-OWN1",
      bookingUserId: 10,
      currentUserId: 11,
      guestAuthorization: null,
    });
    assert.equal(canMutateAuthorizedBooking(access), false);
  });

  it("C. valid D15.1 guest authorization may mutate", () => {
    const access = evaluateBookingAccess({
      bookingId: 5,
      bookingReference: "SJ-GUEST1",
      bookingUserId: null,
      currentUserId: null,
      guestAuthorization: {
        bookingId: 5,
        bookingReference: "SJ-GUEST1",
      },
    });
    assert.equal(canMutateAuthorizedBooking(access), true);
    assert.equal(access.mode, "guest");
  });

  it("D. D15.2 recovered guest JWT (same cookie shape) may mutate", () => {
    // D15.2 issues the same five_stars_guest_booking JWT after OTP.
    const access = evaluateBookingAccess({
      bookingId: 8,
      bookingReference: "SJ-FIND1",
      bookingUserId: null,
      currentUserId: null,
      guestAuthorization: {
        bookingId: 8,
        bookingReference: "SJ-FIND1",
      },
    });
    assert.equal(canMutateAuthorizedBooking(access), true);
  });

  it("E. guest auth for Booking A cannot mutate Booking B", () => {
    const access = evaluateBookingAccess({
      bookingId: 2,
      bookingReference: "SJ-B",
      bookingUserId: null,
      currentUserId: null,
      guestAuthorization: {
        bookingId: 1,
        bookingReference: "SJ-A",
      },
    });
    assert.equal(canMutateAuthorizedBooking(access), false);
  });

  it("F. missing guest authorization denied", () => {
    const access = evaluateBookingAccess({
      bookingId: 5,
      bookingReference: "SJ-GUEST1",
      bookingUserId: null,
      currentUserId: null,
      guestAuthorization: null,
    });
    assert.equal(canMutateAuthorizedBooking(access), false);
    assert.match(seatMutationAccessDeniedMessage(null), /Find My Trip|expired/i);
  });

  it("G. expired/missing guest auth uses recovery copy (not raw Forbidden)", () => {
    assert.equal(
      seatMutationAccessDeniedMessage(null),
      "Your booking access has expired. Verify your trip to continue."
    );
    assert.equal(
      /Forbidden/i.test(seatMutationAccessDeniedMessage(null)),
      false
    );
  });

  it("H. account-owned booking + guest authorization denied", () => {
    const access = evaluateBookingAccess({
      bookingId: 9,
      bookingReference: "SJ-OWNER",
      bookingUserId: 10,
      currentUserId: null,
      guestAuthorization: {
        bookingId: 9,
        bookingReference: "SJ-OWNER",
      },
    });
    assert.equal(canMutateAuthorizedBooking(access), false);
  });

  it("I/J. outbound and return share the same booking authorization", () => {
    // Authorization is booking-scoped, not segment-scoped.
    const access = evaluateBookingAccess({
      bookingId: 5,
      bookingReference: "SJ-RT1",
      bookingUserId: null,
      currentUserId: null,
      guestAuthorization: {
        bookingId: 5,
        bookingReference: "SJ-RT1",
      },
    });
    assert.equal(canMutateAuthorizedBooking(access), true);
  });

  it("staff/admin role must not block after booking access is granted", () => {
    // Regression: seat map page authorized STAFF owner; assign API returned Forbidden.
    const accountAccess = evaluateBookingAccess({
      bookingId: 1,
      bookingReference: "SJ-STAFF",
      bookingUserId: 99,
      currentUserId: 99,
      guestAuthorization: null,
    });
    assert.equal(canMutateAuthorizedBooking(accountAccess), true);

    const guestWhileStaffLoggedIn = evaluateBookingAccess({
      bookingId: 7,
      bookingReference: "SJ-GSTFF",
      bookingUserId: null,
      currentUserId: 99,
      guestAuthorization: {
        bookingId: 7,
        bookingReference: "SJ-GSTFF",
      },
    });
    assert.equal(canMutateAuthorizedBooking(guestWhileStaffLoggedIn), true);

    const assignSource = readFileSync(
      path.join(here, "../app/api/bookings/[reference]/seats/assign/route.ts"),
      "utf8"
    );
    assert.equal(assignSource.includes('role !== "CUSTOMER"'), false);
    assert.match(assignSource, /canMutateAuthorizedBooking/);
    assert.match(assignSource, /resolveBookingAccess/);

    const paymentSource = readFileSync(
      path.join(here, "../app/api/payments/create-session/route.ts"),
      "utf8"
    );
    assert.equal(paymentSource.includes('role !== "CUSTOMER"'), false);
  });

  it("L. UI must not render raw Forbidden for seat errors", () => {
    const uiSource = readFileSync(
      path.join(here, "../components/seats/SeatSelectionContent.tsx"),
      "utf8"
    );
    assert.match(uiSource, /accessDenied/);
    assert.match(uiSource, /Find My Trip/);
    assert.equal(uiSource.includes('"Forbidden."'), false);
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
