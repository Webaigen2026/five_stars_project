import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BOOKING_CONFIRMATION_NOT_FOUND,
  assertNoSensitiveTravelerFields,
  buildBookingConfirmationViewModel,
  buildConfirmationSegmentView,
  buildConfirmationTravelerViews,
  canAccessBookingConfirmation,
  formatBookingReferenceDisplay,
} from "./booking-confirmation";
import { canReviewCheckoutBooking } from "./checkout";
import { getBookingStatusPresentation } from "./booking-status";
import { getFareFamilyPriceCents } from "./fare-families";

function oneWayLegs(overrides?: {
  fareFamily?: string;
  farePriceCents?: number | null;
  flightPrice?: number;
}) {
  return [
    {
      sequence: 1,
      segmentType: "OUTBOUND" as const,
      flightId: 602,
      fareFamily: overrides?.fareFamily ?? "STANDARD",
      farePriceCents:
        overrides && "farePriceCents" in overrides
          ? overrides.farePriceCents
          : 38800,
      flight: {
        code: "SJ602",
        originCode: "BOS",
        destinationCode: "PAP",
        price: overrides?.flightPrice ?? 35300,
      },
    },
  ];
}

function roundTripLegs() {
  return [
    {
      sequence: 1,
      segmentType: "OUTBOUND" as const,
      flightId: 602,
      fareFamily: "STANDARD",
      farePriceCents: 38800,
      flight: {
        code: "SJ602",
        originCode: "BOS",
        destinationCode: "PAP",
        price: 35300,
      },
    },
    {
      sequence: 2,
      segmentType: "RETURN" as const,
      flightId: 605,
      fareFamily: "FLEX",
      farePriceCents: 43800,
      flight: {
        code: "SJ605",
        originCode: "PAP",
        destinationCode: "BOS",
        price: 35300,
      },
    },
  ];
}

const sampleTravelers = [
  {
    id: 1,
    firstName: "Kepler",
    lastName: "Francois",
    nationality: "Haitian",
    passengerType: "ADULT",
    passportNumber: "SECRET-PASSPORT",
    passportNumberEncrypted: "enc:secret",
    dateOfBirth: "1990-01-01",
  },
  {
    id: 2,
    firstName: "Murielle",
    lastName: "Kepler",
    nationality: "Haitian",
    passengerType: "SENIOR",
  },
  {
    id: 3,
    firstName: "Rubbie",
    lastName: "Kepler",
    nationality: "Haitian",
    passengerType: "CHILD",
  },
];

describe("booking confirmation (D12.2)", () => {
  it("A. one-way booking confirmation view model", () => {
    const model = buildBookingConfirmationViewModel({
      bookingReference: "SJ-3JUDDZ",
      status: "DRAFT",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      legs: oneWayLegs(),
      passengers: sampleTravelers.slice(0, 1),
    });

    assert.equal(model.isRoundTrip, false);
    assert.equal(model.segments.length, 1);
    assert.equal(model.segments[0]?.segmentType, "OUTBOUND");
    assert.equal(model.segments[0]?.flightCode, "SJ602");
    assert.equal(model.heroEyebrow, "Booking created");
    assert.match(model.supportingCopy, /Online payment is not available yet/i);
    assert.doesNotMatch(model.supportingCopy, /you're confirmed/i);
    assert.equal(model.tripHref, "/my-trips/SJ-3JUDDZ");
    assert.equal(model.itineraryHref, "/my-trips/SJ-3JUDDZ/itinerary");
  });

  it("B. round-trip confirmation shows outbound + return once for travelers", () => {
    const model = buildBookingConfirmationViewModel({
      bookingReference: "SJ-RT001",
      status: "DRAFT",
      subtotal: 82600,
      taxesAndFees: 14455,
      total: 97055,
      passengerCount: 1,
      legs: roundTripLegs(),
      passengers: sampleTravelers.slice(0, 1),
    });

    assert.equal(model.isRoundTrip, true);
    assert.equal(model.segments.length, 2);
    assert.equal(model.segments[0]?.segmentType, "OUTBOUND");
    assert.equal(model.segments[1]?.segmentType, "RETURN");
    assert.equal(model.travelers.length, 1);
  });

  it("C. booking reference formatting/display", () => {
    assert.equal(formatBookingReferenceDisplay(" sj-3juddz "), "SJ-3JUDDZ");
    assert.equal(formatBookingReferenceDisplay("SJ-ABC123"), "SJ-ABC123");
  });

  it("D. status explanation uses shared booking status presentation", () => {
    const model = buildBookingConfirmationViewModel({
      bookingReference: "SJ-DRAFT1",
      status: "DRAFT",
      subtotal: 100,
      taxesAndFees: 10,
      total: 110,
      passengerCount: 1,
      legs: oneWayLegs(),
      passengers: [],
    });
    const status = getBookingStatusPresentation("DRAFT");

    assert.equal(model.statusLabel, "Draft");
    assert.equal(model.statusDescription, status.description);
    assert.equal(
      model.statusDescription,
      "Booking created. Payment has not been completed."
    );
  });

  it("E. one-way fare family shown from segment snapshot", () => {
    const segment = buildConfirmationSegmentView(oneWayLegs()[0]!);
    assert.equal(segment.fareFamily, "STANDARD");
    assert.equal(segment.fareLabel, "Five Stars Standard");
    assert.equal(segment.farePriceCents, 38800);
    assert.equal(segment.usedFareSnapshot, true);
  });

  it("F. round-trip independent fare families shown", () => {
    const segments = roundTripLegs().map(buildConfirmationSegmentView);
    const outbound = segments[0]!;
    const ret = segments[1]!;
    assert.equal(outbound.fareLabel, "Five Stars Standard");
    assert.equal(ret.fareLabel, "Five Stars Flex");
    assert.equal(outbound.farePriceCents, 38800);
    assert.equal(ret.farePriceCents, 43800);
  });

  it("G. farePriceCents snapshot preferred over current Flight.price", () => {
    const segment = buildConfirmationSegmentView(
      oneWayLegs({
        fareFamily: "STANDARD",
        farePriceCents: 38800,
        flightPrice: 99999,
      })[0]!
    );
    assert.equal(segment.farePriceCents, 38800);
    assert.notEqual(segment.farePriceCents, 99999);
    assert.equal(segment.usedFareSnapshot, true);
  });

  it("H. legacy segment fallback when farePriceCents is null", () => {
    const segment = buildConfirmationSegmentView(
      oneWayLegs({
        fareFamily: "BASIC",
        farePriceCents: null,
        flightPrice: 35300,
      })[0]!
    );
    assert.equal(segment.fareFamily, "BASIC");
    assert.equal(segment.fareLabel, "Five Stars Basic");
    assert.equal(segment.farePriceCents, 35300);
    assert.equal(segment.usedFareSnapshot, false);
    assert.equal(getFareFamilyPriceCents(35300, "BASIC"), 35300);
  });

  it("I. traveler types shown with friendly labels", () => {
    const travelers = buildConfirmationTravelerViews(sampleTravelers);
    assert.deepEqual(
      travelers.map((t) => t.passengerTypeLabel),
      ["Adult", "Senior", "Child"]
    );
    assert.equal(travelers[0]?.displayName, "Kepler Francois");
  });

  it("J. passport data not included in confirmation view model", () => {
    const travelers = buildConfirmationTravelerViews(sampleTravelers);
    assert.equal(assertNoSensitiveTravelerFields(travelers), true);
    for (const traveler of travelers) {
      assert.equal(
        "passportNumber" in traveler ||
          "passportNumberEncrypted" in traveler ||
          "dateOfBirth" in traveler,
        false
      );
      assert.deepEqual(Object.keys(traveler).sort(), [
        "displayName",
        "id",
        "nationality",
        "passengerTypeLabel",
      ]);
    }
  });

  it("K. correct total presentation uses server-authoritative booking totals", () => {
    const model = buildBookingConfirmationViewModel({
      bookingReference: "SJ-TOTAL",
      status: "DRAFT",
      subtotal: 155200,
      taxesAndFees: 27200,
      total: 182400,
      passengerCount: 4,
      legs: oneWayLegs(),
      passengers: [],
    });

    assert.equal(model.price.subtotal, 155200);
    assert.equal(model.price.taxesAndFees, 27200);
    assert.equal(model.price.total, 182400);
    assert.equal(model.price.passengerCount, 4);
  });

  it("L. missing booking state is represented as not found messaging contract", () => {
    assert.equal(BOOKING_CONFIRMATION_NOT_FOUND.title, "Booking not found.");
    assert.match(BOOKING_CONFIRMATION_NOT_FOUND.message, /could not find a booking/i);
  });

  it("M. refresh/server-load behavior: view model is built from persisted booking fields only", () => {
    const model = buildBookingConfirmationViewModel({
      bookingReference: "SJ-REFRESH",
      status: "DRAFT",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      legs: oneWayLegs(),
      passengers: sampleTravelers.slice(0, 1),
    });

    // No transient router state — reference drives trip/itinerary hrefs.
    assert.equal(model.bookingReference, "SJ-REFRESH");
    assert.equal(model.tripHref, "/my-trips/SJ-REFRESH");
    assert.equal(model.myTripsHref, "/my-trips");
    assert.equal(model.flightsHref, "/flights");
  });

  it("N. authorization behavior remains unchanged (same as checkout)", () => {
    assert.equal(canAccessBookingConfirmation(null, null), true);
    assert.equal(canAccessBookingConfirmation(null, 10), true);
    assert.equal(canAccessBookingConfirmation(10, null), true);
    assert.equal(canAccessBookingConfirmation(10, 10), true);
    assert.equal(canAccessBookingConfirmation(10, 11), false);

    assert.equal(
      canAccessBookingConfirmation(10, 11),
      canReviewCheckoutBooking(10, 11)
    );
    assert.equal(
      canAccessBookingConfirmation(10, 10),
      canReviewCheckoutBooking(10, 10)
    );
  });
});
