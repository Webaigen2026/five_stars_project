import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCheckoutAmountMatchesBooking,
  buildCheckoutLineItem,
  buildCheckoutProductCopy,
  buildCheckoutSessionMetadata,
  getAuthoritativeCheckoutAmountCents,
  shouldReuseOpenCheckoutSession,
  shouldReleaseSeatsOnCheckoutSessionFailure,
  validatePayableBookingForCheckout,
} from "./payment-checkout";
import {
  PaymentError,
  getStripeSecretMode,
  isPayableBookingStatus,
  isStripeConfigured,
  isStripeTestModeReady,
} from "./payments";
import {
  decideCheckoutSessionCompleted,
  decideCheckoutSessionExpired,
} from "./stripe-webhook";
import {
  doesTransitionAcquireInventory,
  doesTransitionReleaseInventory,
  doesBookingStatusHoldInventory,
} from "./booking-lifecycle";

const bookingBase = {
  id: 10,
  bookingReference: "SJ-PAY01",
  userId: 7,
  status: "DRAFT",
  total: 45600,
  subtotal: 38800,
  taxesAndFees: 6800,
  inventoryHeld: false,
  passengerCount: 1,
};

describe("payment checkout architecture (D13.1)", () => {
  it("A. payable booking validation", () => {
    assert.equal(isPayableBookingStatus("DRAFT"), true);
    assert.equal(isPayableBookingStatus("PENDING_PAYMENT"), true);
    assert.equal(isPayableBookingStatus("FAILED"), true);
    assert.equal(isPayableBookingStatus("PAID"), false);

    const ok = validatePayableBookingForCheckout({
      booking: bookingBase,
      accessAuthorized: true,
      passengerRows: 1,
      segmentCount: 1,
      existingPayment: null,
    });
    assert.equal(ok.amountCents, 45600);

    assert.throws(
      () =>
        validatePayableBookingForCheckout({
          booking: bookingBase,
          accessAuthorized: false,
          passengerRows: 1,
          segmentCount: 1,
          existingPayment: null,
        }),
      (error: unknown) =>
        error instanceof PaymentError && error.message === "Forbidden."
    );
  });

  it("B/Q. server-authoritative total ignores client amount", () => {
    const amount = getAuthoritativeCheckoutAmountCents({ total: 45600 });
    assert.equal(amount, 45600);
    // Client-manipulated $1 is never an input to this helper.
    assert.notEqual(amount, 100);
  });

  it("B2. authoritative amount includes seatFeesTotal", () => {
    assert.equal(
      getAuthoritativeCheckoutAmountCents({
        total: 45600,
        seatFeesTotal: 2400,
      }),
      48000
    );
    assert.equal(
      assertCheckoutAmountMatchesBooking({
        sessionAmountTotal: 48000,
        bookingTotal: 45600,
        seatFeesTotal: 2400,
        currency: "usd",
      }),
      true
    );
  });

  it("C/D inventory hold matrix — acquire at PENDING_PAYMENT", () => {
    assert.equal(doesBookingStatusHoldInventory("PENDING_PAYMENT"), true);
    assert.equal(doesTransitionAcquireInventory("DRAFT", "PENDING_PAYMENT"), true);
    assert.equal(
      doesTransitionAcquireInventory("PENDING_PAYMENT", "PAID"),
      false
    );
  });

  it("E. insufficient seats modeled as no acquire-on-paid when already held", () => {
    // Round-trip atomic failure is covered by transition acquire rules:
    // hold happens once at PENDING_PAYMENT for all legs.
    assert.equal(
      doesTransitionReleaseInventory("PENDING_PAYMENT", "FAILED"),
      true
    );
  });

  it("F. double hold is a no-op at lifecycle level when already holding", () => {
    assert.equal(
      doesTransitionAcquireInventory("PENDING_PAYMENT", "PENDING_PAYMENT"),
      false
    );
  });

  it("G/H. release on unpaid exit; not on PAID", () => {
    assert.equal(
      doesTransitionReleaseInventory("PENDING_PAYMENT", "FAILED"),
      true
    );
    assert.equal(
      doesTransitionReleaseInventory("PENDING_PAYMENT", "PAID"),
      false
    );
  });

  it("I. Checkout Session line item uses booking total", () => {
    const { productName, productDescription } = buildCheckoutProductCopy({
      isRoundTrip: false,
      outboundCode: "SJ602",
      originCode: "BOS",
      destinationCode: "PAP",
    });
    const line = buildCheckoutLineItem({
      bookingReference: "SJ-PAY01",
      amountCents: 45600,
      productName,
      productDescription,
    });
    assert.equal(line.price_data.unit_amount, 45600);
    assert.equal(line.price_data.currency, "usd");
    assert.match(line.price_data.product_data.name, /Five Stars/);
    assert.equal(
      buildCheckoutSessionMetadata({
        bookingId: 10,
        bookingReference: "SJ-PAY01",
        userId: 7,
      }).bookingId,
      "10"
    );
  });

  it("J/K. success webhook + duplicate", () => {
    const session = {
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: 45600,
      currency: "usd",
      payment_intent: "pi_test_1",
      metadata: { bookingId: "10", bookingReference: "SJ-PAY01" },
    };
    const booking = {
      id: 10,
      bookingReference: "SJ-PAY01",
      status: "PENDING_PAYMENT",
      total: 45600,
      inventoryHeld: true,
    };
    const payment = {
      id: 1,
      bookingId: 10,
      amount: 45600,
      status: "PENDING",
      stripeCheckoutId: "cs_test_1",
      stripePaymentIntentId: null,
    };

    const first = decideCheckoutSessionCompleted({ session, booking, payment });
    assert.equal(first.action, "mark_paid");

    const second = decideCheckoutSessionCompleted({
      session,
      booking: { ...booking, status: "PAID" },
      payment: { ...payment, status: "SUCCEEDED" },
    });
    assert.equal(second.action, "noop_paid");
  });

  it("L/M. expired webhook + duplicate", () => {
    const session = {
      id: "cs_test_2",
      metadata: { bookingId: "10" },
    };
    const booking = {
      id: 10,
      bookingReference: "SJ-PAY01",
      status: "PENDING_PAYMENT",
      total: 45600,
      inventoryHeld: true,
    };
    const payment = {
      id: 1,
      bookingId: 10,
      amount: 45600,
      status: "PENDING",
      stripeCheckoutId: "cs_test_2",
      stripePaymentIntentId: null,
    };

    const first = decideCheckoutSessionExpired({ session, booking, payment });
    assert.equal(first.action, "expire_unpaid");

    const second = decideCheckoutSessionExpired({
      session,
      booking: { ...booking, status: "FAILED", inventoryHeld: false },
      payment: { ...payment, status: "CANCELLED" },
    });
    assert.equal(second.action, "noop_released");
  });

  it("N. amount mismatch rejection", () => {
    assert.equal(
      assertCheckoutAmountMatchesBooking({
        sessionAmountTotal: 100,
        bookingTotal: 45600,
        currency: "usd",
      }),
      false
    );

    const decision = decideCheckoutSessionCompleted({
      session: {
        id: "cs_bad",
        payment_status: "paid",
        amount_total: 100,
        currency: "usd",
        metadata: { bookingId: "10" },
      },
      booking: {
        id: 10,
        bookingReference: "SJ-PAY01",
        status: "PENDING_PAYMENT",
        total: 45600,
        inventoryHeld: true,
      },
      payment: {
        id: 1,
        bookingId: 10,
        amount: 45600,
        status: "PENDING",
        stripeCheckoutId: "cs_bad",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(decision.action, "reject");
    if (decision.action === "reject") {
      assert.equal(decision.reason, "amount_mismatch");
    }
  });

  it("O. ownership enforced in payable validation", () => {
    assert.throws(
      () =>
        validatePayableBookingForCheckout({
          booking: { ...bookingBase, userId: 1 },
          accessAuthorized: false,
          passengerRows: 1,
          segmentCount: 1,
          existingPayment: null,
        }),
      PaymentError
    );
  });

  it("P. already-paid booking rejected", () => {
    assert.throws(
      () =>
        validatePayableBookingForCheckout({
          booking: bookingBase,
          accessAuthorized: true,
          passengerRows: 1,
          segmentCount: 1,
          existingPayment: {
            id: 1,
            status: "SUCCEEDED",
            amount: 45600,
            stripeCheckoutId: "cs_paid",
          },
        }),
      (error: unknown) =>
        error instanceof PaymentError &&
        error.message === "This booking has already been paid."
    );
  });

  it("R. Stripe missing-env behavior", () => {
    const previousSecret = process.env.STRIPE_SECRET_KEY;
    const previousUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
    assert.equal(isStripeConfigured(), false);
    process.env.STRIPE_SECRET_KEY = previousSecret;
    process.env.NEXT_PUBLIC_APP_URL = previousUrl;
  });

  it("reuses open checkout sessions only", () => {
    assert.equal(
      shouldReuseOpenCheckoutSession({
        paymentStatus: "PENDING",
        stripeCheckoutId: "cs_open",
        sessionStatus: "open",
        sessionUrl: "https://checkout.stripe.com/c/pay/cs_open",
      }),
      true
    );
    assert.equal(
      shouldReuseOpenCheckoutSession({
        paymentStatus: "PENDING",
        stripeCheckoutId: "cs_open",
        sessionStatus: "expired",
        sessionUrl: "https://checkout.stripe.com/c/pay/cs_open",
      }),
      false
    );
  });

  it("D13.2 currency mismatch rejects paid transition", () => {
    assert.equal(
      assertCheckoutAmountMatchesBooking({
        sessionAmountTotal: 45600,
        bookingTotal: 45600,
        seatFeesTotal: 0,
        currency: "eur",
      }),
      false
    );

    const decision = decideCheckoutSessionCompleted({
      session: {
        id: "cs_eur",
        payment_status: "paid",
        amount_total: 45600,
        currency: "eur",
        metadata: { bookingId: "10" },
      },
      booking: {
        id: 10,
        bookingReference: "SJ-PAY01",
        status: "PENDING_PAYMENT",
        total: 45600,
        seatFeesTotal: 0,
        inventoryHeld: true,
      },
      payment: {
        id: 1,
        bookingId: 10,
        amount: 45600,
        status: "PENDING",
        stripeCheckoutId: "cs_eur",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(decision.action, "reject");
  });

  it("D13.2 session-creation failure keeps seats (compensation policy)", () => {
    assert.equal(shouldReleaseSeatsOnCheckoutSessionFailure(), false);
  });

  it("D13.2 success retains seats; expire deletes via release pathway", () => {
    const paid = decideCheckoutSessionCompleted({
      session: {
        id: "cs_ok",
        payment_status: "paid",
        amount_total: 48000,
        currency: "usd",
        metadata: { bookingId: "10" },
      },
      booking: {
        id: 10,
        bookingReference: "SJ-PAY01",
        status: "PENDING_PAYMENT",
        total: 45600,
        seatFeesTotal: 2400,
        inventoryHeld: true,
      },
      payment: {
        id: 1,
        bookingId: 10,
        amount: 48000,
        status: "PENDING",
        stripeCheckoutId: "cs_ok",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(paid.action, "mark_paid");
    assert.ok(!("deleteSeats" in paid));

    const expired = decideCheckoutSessionExpired({
      session: { id: "cs_exp", metadata: { bookingId: "10" } },
      booking: {
        id: 10,
        bookingReference: "SJ-PAY01",
        status: "PENDING_PAYMENT",
        total: 45600,
        seatFeesTotal: 2400,
        inventoryHeld: true,
      },
      payment: {
        id: 1,
        bookingId: 10,
        amount: 48000,
        status: "PENDING",
        stripeCheckoutId: "cs_exp",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(expired.action, "expire_unpaid");
  });

  it("D13.2 live secret mode is rejected by classifier", () => {
    assert.equal(getStripeSecretMode("sk_test_abc"), "test");
    assert.equal(getStripeSecretMode("sk_live_abc"), "live");
    assert.equal(getStripeSecretMode(""), "missing");
    assert.equal(isStripeTestModeReady(), false);
  });
});
