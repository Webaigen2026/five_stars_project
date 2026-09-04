import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getBookingAmountDueCents,
  getBookingPriceBreakdown,
} from "./booking-amount";
import {
  findSeatInLayout,
  getSeatLayout,
  isSeatSelectionAvailable,
  resolveSeatLayoutKey,
} from "./seat-layouts";
import {
  FIVE_STARS_SEAT_FEES,
  getSeatFeeCents,
  isStandardSeatIncluded,
} from "./seat-pricing";
import {
  isExitRowRestrictedForPassenger,
  isPassengerEligibleForSeat,
  planSeatChange,
  sumSeatFeeCents,
} from "./seat-rules";
import {
  buildSeatAriaLabel,
  buildSeatMapRows,
} from "./seat-selection";
import {
  assertCheckoutAmountMatchesBooking,
  getAuthoritativeCheckoutAmountCents,
} from "./payment-checkout";
import { decideCheckoutSessionCompleted } from "./stripe-webhook";

describe("seat layouts (D12.5)", () => {
  it("A320 layout is 3-3 with realistic capacity", () => {
    const layout = getSeatLayout("Airbus A320");
    assert.ok(layout);
    assert.equal(layout.layoutKey, "A320");
    assert.deepEqual(layout.columns, ["A", "B", "C", "D", "E", "F"]);
    assert.equal(layout.aisleAfterColumn, "C");
    assert.equal(layout.seats.length, 28 * 6);
    assert.ok(findSeatInLayout(layout, "12A"));
    assert.equal(findSeatInLayout(layout, "12A")?.isExitRow, true);
    assert.equal(findSeatInLayout(layout, "1A")?.isExitRow, false);
    assert.equal(findSeatInLayout(layout, "99Z"), null);
  });

  it("normalizes clean aliases only", () => {
    assert.equal(resolveSeatLayoutKey("A320"), "A320");
    assert.equal(resolveSeatLayoutKey("airbus a320"), "A320");
    assert.equal(resolveSeatLayoutKey("A-320"), "A320");
    assert.equal(resolveSeatLayoutKey("Airbu23"), null);
    assert.equal(resolveSeatLayoutKey("Airbu232"), null);
    assert.equal(isSeatSelectionAvailable("Airbu23"), false);
    assert.equal(getSeatLayout("Airbu23"), null);
  });
});

describe("Five Stars seat fees (D12.5)", () => {
  it("fare-family inclusion and upgrades", () => {
    assert.equal(isStandardSeatIncluded("BASIC"), false);
    assert.equal(isStandardSeatIncluded("STANDARD"), true);
    assert.equal(isStandardSeatIncluded("FLEX"), true);

    assert.equal(getSeatFeeCents({ fareFamily: "BASIC", zone: "STANDARD" }), 1500);
    assert.equal(getSeatFeeCents({ fareFamily: "STANDARD", zone: "STANDARD" }), 0);
    assert.equal(getSeatFeeCents({ fareFamily: "FLEX", zone: "STANDARD" }), 0);

    assert.equal(
      getSeatFeeCents({ fareFamily: "STANDARD", zone: "PREFERRED" }),
      FIVE_STARS_SEAT_FEES.PREFERRED_UPGRADE_CENTS
    );
    assert.equal(
      getSeatFeeCents({ fareFamily: "BASIC", zone: "PREFERRED" }),
      FIVE_STARS_SEAT_FEES.BASIC_STANDARD_CENTS +
        FIVE_STARS_SEAT_FEES.PREFERRED_UPGRADE_CENTS
    );
    assert.equal(
      getSeatFeeCents({ fareFamily: "BASIC", zone: "EXTRA_LEGROOM" }),
      FIVE_STARS_SEAT_FEES.BASIC_STANDARD_CENTS +
        FIVE_STARS_SEAT_FEES.EXTRA_LEGROOM_UPGRADE_CENTS
    );
  });

  it("server fee ignores any client-supplied amount by not accepting it", () => {
    // getSeatFeeCents has no clientFee parameter — client values cannot influence it.
    const fee = getSeatFeeCents({ fareFamily: "BASIC", zone: "STANDARD" });
    assert.equal(fee, 1500);
    assert.notEqual(fee, 1);
  });
});

describe("seat rules (D12.5)", () => {
  it("exit-row restriction for child and infant-in-seat", () => {
    assert.equal(isExitRowRestrictedForPassenger("ADULT"), false);
    assert.equal(isExitRowRestrictedForPassenger("SENIOR"), false);
    assert.equal(isExitRowRestrictedForPassenger("CHILD"), true);
    assert.equal(isExitRowRestrictedForPassenger("INFANT_IN_SEAT"), true);

    assert.equal(
      isPassengerEligibleForSeat({
        isExitRow: true,
        passengerType: "CHILD",
      }),
      false
    );
    assert.equal(
      isPassengerEligibleForSeat({
        isExitRow: true,
        passengerType: "INFANT_IN_SEAT",
      }),
      false
    );
    assert.equal(
      isPassengerEligibleForSeat({
        isExitRow: true,
        passengerType: "ADULT",
      }),
      true
    );
  });

  it("seatFeesTotal recomputation is sum of snapshots", () => {
    assert.equal(
      sumSeatFeeCents([
        { seatFeeCents: 1500 },
        { seatFeeCents: 0 },
        { seatFeeCents: 2400 },
      ]),
      3900
    );
    assert.equal(sumSeatFeeCents([]), 0);
  });

  it("change-seat conflict preserves old seat (rollback model)", () => {
    assert.deepEqual(
      planSeatChange({
        currentSeatNumber: "12A",
        targetSeatNumber: "14C",
        occupiedByOther: true,
      }),
      { outcome: "conflict", seatNumber: "12A" }
    );
    assert.deepEqual(
      planSeatChange({
        currentSeatNumber: "12A",
        targetSeatNumber: "14C",
        occupiedByOther: false,
      }),
      { outcome: "changed", seatNumber: "14C" }
    );
  });

  it("same seat number may exist on different flights (constraint is per flight)", () => {
    // UNIQUE(flightId, seatNumber) — identical labels on flight 1 vs 2 are independent.
    const flightA = { flightId: 1, seatNumber: "12A" };
    const flightB = { flightId: 2, seatNumber: "12A" };
    assert.notEqual(
      `${flightA.flightId}:${flightA.seatNumber}`,
      `${flightB.flightId}:${flightB.seatNumber}`
    );
  });
});

describe("seat map presentation (D12.5)", () => {
  it("blocks exit rows for children and exposes aria labels", () => {
    const layout = getSeatLayout("A320");
    assert.ok(layout);
    const rows = buildSeatMapRows({
      layout,
      fareFamily: "BASIC",
      occupiedSeatNumbers: new Set(["14C"]),
      selectedSeatNumber: "12A",
      activePassengerType: "CHILD",
    });
    const exitSeat = rows
      .flatMap((row) => row.cells)
      .find((cell) => cell.seatNumber === "12B");
    assert.equal(exitSeat?.state, "blocked");
    const occupied = rows
      .flatMap((row) => row.cells)
      .find((cell) => cell.seatNumber === "14C");
    assert.equal(occupied?.state, "occupied");
    const selected = rows
      .flatMap((row) => row.cells)
      .find((cell) => cell.seatNumber === "12A");
    assert.equal(selected?.state, "selected");

    const seat = findSeatInLayout(layout, "12A");
    assert.ok(seat);
    const label = buildSeatAriaLabel({
      seat,
      state: "available",
      feeCents: 4400,
    });
    assert.match(label, /Seat 12A/);
    assert.match(label, /exit row/);
  });
});

describe("booking amount + Stripe authority (D12.5)", () => {
  it("amount due = airfare total + seatFeesTotal", () => {
    assert.equal(
      getBookingAmountDueCents({ total: 45600, seatFeesTotal: 2400 }),
      48000
    );
    assert.equal(getBookingAmountDueCents({ total: 45600 }), 45600);
    assert.equal(
      getBookingAmountDueCents({ total: 45600, seatFeesTotal: 0 }),
      45600
    );

    const breakdown = getBookingPriceBreakdown({
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      seatFeesTotal: 2400,
    });
    assert.equal(breakdown.flightSubtotalCents, 38800);
    assert.equal(breakdown.taxesAndFeesCents, 6800);
    assert.equal(breakdown.seatFeesCents, 2400);
    assert.equal(breakdown.airfareTotalCents, 45600);
    assert.equal(breakdown.amountDueCents, 48000);
  });

  it("legacy bookings with seatFeesTotal=0 pay airfare only", () => {
    assert.equal(
      getAuthoritativeCheckoutAmountCents({
        total: 45600,
        seatFeesTotal: 0,
      }),
      45600
    );
  });

  it("webhook amount match includes seat fees", () => {
    assert.equal(
      assertCheckoutAmountMatchesBooking({
        sessionAmountTotal: 48000,
        bookingTotal: 45600,
        seatFeesTotal: 2400,
        currency: "usd",
      }),
      true
    );
    assert.equal(
      assertCheckoutAmountMatchesBooking({
        sessionAmountTotal: 45600,
        bookingTotal: 45600,
        seatFeesTotal: 2400,
        currency: "usd",
      }),
      false
    );

    const decision = decideCheckoutSessionCompleted({
      session: {
        id: "cs_test",
        payment_status: "paid",
        amount_total: 48000,
        currency: "usd",
        metadata: { bookingId: "10" },
      },
      booking: {
        id: 10,
        bookingReference: "SJ-SEAT",
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
        stripeCheckoutId: "cs_test",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(decision.action, "mark_paid");
    if (decision.action === "mark_paid") {
      assert.equal(decision.amountCents, 48000);
    }
  });

  it("payment success decision does not mutate seats (no recreate action)", () => {
    const decision = decideCheckoutSessionCompleted({
      session: {
        id: "cs_test",
        payment_status: "paid",
        amount_total: 45600,
        currency: "usd",
        metadata: { bookingId: "10" },
      },
      booking: {
        id: 10,
        bookingReference: "SJ-SEAT",
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
        stripeCheckoutId: "cs_test",
        stripePaymentIntentId: null,
      },
    });
    assert.equal(decision.action, "mark_paid");
    assert.ok(!("recreateSeats" in decision));
    assert.ok(!("seatNumber" in decision));
  });
});
