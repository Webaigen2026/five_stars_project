import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canReviewCheckoutBooking } from "./checkout";
import {
  assertNoSensitiveTripTravelerFields,
  buildTripDetailViewModel,
  canAccessTripDetail,
  formatTripDetailDatesLabel,
} from "./trip-detail";
import type { TripDetailLegInput } from "./trip-detail";

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
  price?: number;
  fareFamily?: string;
  farePriceCents?: number | null;
}): TripDetailLegInput {
  return {
    sequence: input.sequence,
    segmentType: input.segmentType,
    flightId: input.flightId,
    fareFamily: input.fareFamily ?? "BASIC",
    farePriceCents:
      input.farePriceCents === undefined ? 35300 : input.farePriceCents,
    flight: {
      code: input.code,
      origin: input.origin ?? input.originCode,
      originCode: input.originCode,
      destination: input.destination ?? input.destinationCode,
      destinationCode: input.destinationCode,
      departureTime: input.departureTime,
      arrivalTime: input.arrivalTime ?? input.departureTime,
      price: input.price ?? 35300,
    },
  };
}

const now = new Date("2026-09-04T12:00:00.000Z");

describe("trip detail (D12.3.2)", () => {
  it("A. one-way trip detail model", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-ONEWAY",
      status: "DRAFT",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      now,
      stripeConfigured: false,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          code: "SJ602",
          origin: "Boston",
          originCode: "BOS",
          destination: "Port-au-Prince",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          arrivalTime: "2026-09-06T21:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
      ],
      passengers: [
        {
          id: 1,
          firstName: "Kepler",
          lastName: "Francois",
          nationality: "Haitian",
          passengerType: "ADULT",
          passportNumber: "SECRET",
        },
      ],
    });

    assert.equal(model.isRoundTrip, false);
    assert.equal(model.tripTypeLabel, "One way");
    assert.equal(model.segmentCount, 1);
    assert.match(model.routeHeading, /Boston \(BOS\) → Port-au-Prince \(PAP\)/);
    assert.equal(model.routeDetail, "BOS → PAP");
    assert.equal(model.hasPayNowAction, false);
  });

  it("B/C. round-trip trip detail model with 2 segments", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-7QPHUU",
      status: "DRAFT",
      subtotal: 78300,
      taxesAndFees: 6800,
      total: 85100,
      passengerCount: 1,
      now,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          code: "SJ602",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 39,
          code: "SJ603",
          origin: "PAP",
          originCode: "PORT-AU-PRINCE",
          destination: "BOS",
          destinationCode: "BOSTON",
          departureTime: "2026-09-12T10:00:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 39500,
        }),
      ],
      passengers: [
        {
          id: 1,
          firstName: "pleck",
          lastName: "Kepler",
          nationality: "Haitian",
          passengerType: "ADULT",
        },
      ],
    });

    assert.equal(model.isRoundTrip, true);
    assert.equal(model.segmentCount, 2);
    assert.equal(model.segments[0]?.segmentType, "OUTBOUND");
    assert.equal(model.segments[1]?.segmentType, "RETURN");
    assert.match(model.routeHeading, /⇄/);
    assert.equal(model.routeDetail, "BOS ⇄ PAP");
    assert.match(model.datesLabel, /Sep 6/);
    assert.match(model.datesLabel, /Sep 12/);
  });

  it("D. traveler section renders once", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-T",
      status: "DRAFT",
      subtotal: 100,
      taxesAndFees: 10,
      total: 110,
      passengerCount: 2,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 2,
          code: "SJ2",
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-12T10:00:00.000Z",
        }),
      ],
      passengers: [
        {
          id: 1,
          firstName: "A",
          lastName: "One",
          nationality: null,
          passengerType: "ADULT",
        },
        {
          id: 2,
          firstName: "B",
          lastName: "Two",
          nationality: null,
          passengerType: "SENIOR",
        },
      ],
    });

    assert.equal(model.travelers.length, 2);
    assert.equal(model.travelerLabel, "2 travelers");
    assert.equal(model.segmentCount, 2);
  });

  it("E. fare family from snapshot", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-F",
      status: "DRAFT",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          code: "SJ602",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          price: 99999,
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
      ],
      passengers: [],
    });

    assert.equal(model.segments[0]?.fareLabel, "Five Stars Standard");
    assert.equal(model.segments[0]?.farePriceCents, 38800);
    assert.equal(model.segments[0]?.usedFareSnapshot, true);
  });

  it("F. legacy fare fallback", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-L",
      status: "PAID",
      subtotal: 35300,
      taxesAndFees: 6800,
      total: 42100,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 10,
          code: "SJ101",
          originCode: "BOS",
          destinationCode: "CAP",
          departureTime: "2026-09-10T12:00:00.000Z",
          price: 35300,
          fareFamily: "BASIC",
          farePriceCents: null,
        }),
      ],
      passengers: [],
    });

    assert.equal(model.segments[0]?.fareLabel, "Five Stars Basic");
    assert.equal(model.segments[0]?.farePriceCents, 35300);
    assert.equal(model.segments[0]?.usedFareSnapshot, false);
  });

  it("G. price summary uses persisted booking totals", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-P",
      status: "DRAFT",
      subtotal: 78300,
      taxesAndFees: 6800,
      total: 85100,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          code: "SJ602",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 39,
          code: "SJ603",
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-12T10:00:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 39500,
        }),
      ],
      passengers: [],
    });

    assert.equal(model.subtotal, 78300);
    assert.equal(model.taxesAndFees, 6800);
    assert.equal(model.total, 85100);
    assert.equal(model.priceLines[0]?.amountCents, 38800);
    assert.equal(model.priceLines[1]?.amountCents, 39500);
  });

  it("H. canonical airport route labels", () => {
    assert.match(
      buildTripDetailViewModel({
        bookingReference: "SJ-H",
        status: "DRAFT",
        subtotal: 1,
        taxesAndFees: 1,
        total: 2,
        passengerCount: 1,
        legs: [
          leg({
            sequence: 1,
            segmentType: "OUTBOUND",
            flightId: 1,
            code: "SJ1",
            origin: "PAP",
            originCode: "PORT-AU-PRINCE",
            destination: "BOS",
            destinationCode: "BOSTON",
            departureTime: "2026-09-12T10:00:00.000Z",
          }),
        ],
        passengers: [],
      }).routeHeading,
      /Port-au-Prince \(PAP\) → Boston \(BOS\)/
    );
  });

  it("I. Draft payment wording", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-D",
      status: "DRAFT",
      subtotal: 1,
      taxesAndFees: 1,
      total: 2,
      passengerCount: 1,
      stripeConfigured: false,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
      ],
      passengers: [],
    });

    assert.equal(model.statusLabel, "Draft");
    assert.match(model.statusDescription, /Payment has not been completed/i);
    assert.equal(model.showPaymentDisabledNotice, true);
  });

  it("J. no Pay now action when Stripe is not configured", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-J",
      status: "DRAFT",
      subtotal: 1,
      taxesAndFees: 1,
      total: 2,
      passengerCount: 1,
      stripeConfigured: false,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
      ],
      passengers: [],
    });

    assert.equal(model.hasPayNowAction, false);
    assert.equal(model.showPaymentDisabledNotice, true);
    assert.doesNotMatch(model.itineraryHref, /pay/i);
  });

  it("J2. Pay securely when Stripe is configured", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-PAY",
      status: "DRAFT",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      stripeConfigured: true,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ602",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
      ],
      passengers: [],
    });

    assert.equal(model.hasPayNowAction, true);
    assert.equal(model.showPaymentDisabledNotice, false);
    assert.equal(model.checkoutHref, "/checkout?booking=SJ-PAY");
  });

  it("K/L. one-way arrow and round-trip symbol", () => {
    const oneWay = buildTripDetailViewModel({
      bookingReference: "SJ-K",
      status: "DRAFT",
      subtotal: 1,
      taxesAndFees: 1,
      total: 2,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
      ],
      passengers: [],
    });
    const roundTrip = buildTripDetailViewModel({
      bookingReference: "SJ-L",
      status: "DRAFT",
      subtotal: 1,
      taxesAndFees: 1,
      total: 2,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 2,
          code: "SJ2",
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-12T10:00:00.000Z",
        }),
      ],
      passengers: [],
    });

    assert.equal(oneWay.routeDetail, "BOS → PAP");
    assert.equal(roundTrip.routeDetail, "BOS ⇄ PAP");
  });

  it("M. copy reference path uses booking reference string", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-COPY",
      status: "DRAFT",
      subtotal: 1,
      taxesAndFees: 1,
      total: 2,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
      ],
      passengers: [],
    });
    assert.equal(model.bookingReference, "SJ-COPY");
  });

  it("N. past trip still renders", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-PAST",
      status: "COMPLETED",
      subtotal: 35300,
      taxesAndFees: 6800,
      total: 42100,
      passengerCount: 1,
      now,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-08-01T12:00:00.000Z",
          arrivalTime: "2026-08-01T16:00:00.000Z",
        }),
      ],
      passengers: [
        {
          id: 1,
          firstName: "Past",
          lastName: "Traveler",
          nationality: "Haitian",
          passengerType: "ADULT",
        },
      ],
    });

    assert.equal(model.timingLabel, "Past trip");
    assert.equal(model.travelers.length, 1);
    assert.equal(model.segmentCount, 1);
  });

  it("O. missing booking safe access contract", () => {
    assert.equal(canAccessTripDetail(null, 10), false);
    assert.equal(canAccessTripDetail(10, null), false);
  });

  it("P. ownership behavior unchanged (owner-only for trip detail)", () => {
    assert.equal(canAccessTripDetail(10, 10), true);
    assert.equal(canAccessTripDetail(10, 11), false);
    // Guest checkout review remains broader; trip detail stays owner-only.
    assert.equal(canReviewCheckoutBooking(10, null), false);
    assert.equal(canAccessTripDetail(10, null), false);
  });

  it("travelers omit passport/DOB fields", () => {
    const model = buildTripDetailViewModel({
      bookingReference: "SJ-SEC",
      status: "DRAFT",
      subtotal: 1,
      taxesAndFees: 1,
      total: 2,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
      ],
      passengers: [
        {
          id: 1,
          firstName: "Safe",
          lastName: "Traveler",
          nationality: "Haitian",
          passengerType: "ADULT",
          passportNumber: "X",
          dateOfBirth: "1990-01-01",
        },
      ],
    });

    assert.equal(assertNoSensitiveTripTravelerFields(model.travelers), true);
    assert.equal(model.travelers[0]?.passengerTypeLabel, "Adult");
  });

  it("one-way dates omit range dash", () => {
    const label = formatTripDetailDatesLabel(
      [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ1",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
      ],
      false
    );
    assert.match(label, /Sep 6/);
    assert.doesNotMatch(label, /–/);
  });
});
