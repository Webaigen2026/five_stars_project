import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBookingStatusPresentation } from "./booking-status";
import { canReviewCheckoutBooking, getCheckoutPaymentAction } from "./checkout";

describe("checkout ownership", () => {
  it("allows guest bookings and logged-out review", () => {
    assert.equal(canReviewCheckoutBooking(null, null), true);
    assert.equal(canReviewCheckoutBooking(null, 10), true);
    assert.equal(canReviewCheckoutBooking(10, null), true);
  });

  it("allows the owner and blocks another customer", () => {
    assert.equal(canReviewCheckoutBooking(10, 10), true);
    assert.equal(canReviewCheckoutBooking(10, 11), false);
  });
});

describe("checkout payment action", () => {
  const ownerReady = {
    bookingUserId: 10,
    bookingStatus: "DRAFT",
    currentUserId: 10,
    currentUserRole: "CUSTOMER",
    stripeConfigured: true,
  };

  it("is ready only for the owning customer on a payable booking when Stripe is configured", () => {
    assert.equal(getCheckoutPaymentAction(ownerReady), "ready");
    assert.equal(
      getCheckoutPaymentAction({ ...ownerReady, bookingStatus: "PENDING_PAYMENT" }),
      "ready"
    );
  });

  it("disables payment when Stripe is not configured", () => {
    assert.equal(
      getCheckoutPaymentAction({ ...ownerReady, stripeConfigured: false }),
      "unavailable"
    );
  });

  it("requires sign-in for guests and logged-out viewers", () => {
    assert.equal(
      getCheckoutPaymentAction({
        ...ownerReady,
        bookingUserId: null,
      }),
      "signin"
    );
    assert.equal(
      getCheckoutPaymentAction({
        ...ownerReady,
        currentUserId: null,
        currentUserRole: null,
      }),
      "signin"
    );
  });

  it("hides payment for another customer", () => {
    assert.equal(
      getCheckoutPaymentAction({
        ...ownerReady,
        currentUserId: 11,
      }),
      "hidden"
    );
  });

  it("is ineligible after payment or cancellation", () => {
    assert.equal(
      getCheckoutPaymentAction({ ...ownerReady, bookingStatus: "CONFIRMED" }),
      "ineligible"
    );
    assert.equal(
      getCheckoutPaymentAction({ ...ownerReady, bookingStatus: "CANCELLED" }),
      "ineligible"
    );
    assert.equal(
      getCheckoutPaymentAction({ ...ownerReady, bookingStatus: "UNKNOWN" }),
      "ineligible"
    );
  });
});

describe("checkout status copy", () => {
  it("uses customer-facing status descriptions", () => {
    assert.equal(
      getBookingStatusPresentation("DRAFT").description,
      "Your booking is ready for payment."
    );
    assert.equal(
      getBookingStatusPresentation("PENDING_PAYMENT").description,
      "Your payment has been started and is awaiting confirmation."
    );
    assert.equal(
      getBookingStatusPresentation("PAID").description,
      "Payment has been received."
    );
    assert.equal(
      getBookingStatusPresentation("FAILED").description,
      "Payment was not completed."
    );
    assert.equal(
      getBookingStatusPresentation("COMPLETED").description,
      "This trip is complete."
    );
    assert.equal(
      getBookingStatusPresentation("WEIRD").description,
      "Booking status is being reviewed."
    );
  });
});
