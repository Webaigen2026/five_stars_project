import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getFareFamilyLabel, getPrintFareFamilyLabel } from "./fare-families";
import {
  PRINT_ITINERARY_BRAND,
  PRINT_ITINERARY_BRAND_MARK,
  assertNoSensitivePrintTravelerFields,
  buildPrintItineraryViewModel,
  type PrintItineraryLegInput,
} from "./print-itinerary";

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
}): PrintItineraryLegInput {
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
      durationMinutes: input.durationMinutes ?? 60,
      price: input.price ?? 35300,
    },
  };
}

const adultTraveler = {
  id: 1,
  firstName: "Kepler",
  lastName: "Francois",
  nationality: "Haitian",
  passengerType: "ADULT",
  passportNumber: "SECRET-PASSPORT",
  passportNumberEncrypted: "enc-secret",
  dateOfBirth: "1990-01-01",
};

describe("print itinerary (D12.3.3)", () => {
  it("A. print brand is Five Stars", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-PRINT01",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      generatedAt: "2026-09-04T15:00:00.000Z",
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
      passengers: [adultTraveler],
    });

    assert.equal(model.brand, "Five Stars");
    assert.equal(model.brandMark, "FIVE STARS");
    assert.equal(PRINT_ITINERARY_BRAND, "Five Stars");
    assert.equal(PRINT_ITINERARY_BRAND_MARK, "FIVE STARS");
    assert.match(model.pageTitle, /^Five Stars - Itinerary - SJ-PRINT01$/);
    assert.equal(model.documentTitle, "FLIGHT ITINERARY");
  });

  it("B. screen and print fare labels are Five Stars", () => {
    assert.equal(getFareFamilyLabel("BASIC"), "Five Stars Basic");
    assert.equal(getFareFamilyLabel("STANDARD"), "Five Stars Standard");
    assert.equal(getFareFamilyLabel("FLEX"), "Five Stars Flex");
    assert.equal(getPrintFareFamilyLabel("BASIC"), "Five Stars Basic");
    assert.equal(getPrintFareFamilyLabel("STANDARD"), "Five Stars Standard");
    assert.equal(getPrintFareFamilyLabel("FLEX"), "Five Stars Flex");
  });

  it("C. one-way print model", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-OW",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      generatedAt: "2026-09-04T15:00:00.000Z",
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
      passengers: [adultTraveler],
    });

    assert.equal(model.isRoundTrip, false);
    assert.equal(model.segments.length, 1);
    assert.equal(model.segments[0]?.segmentLabel, "OUTBOUND");
    assert.equal(model.segments[0]?.flightCode, "SJ602");
    assert.equal(model.bookingReference, "SJ-OW");
  });

  it("D. round-trip print model", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-RT",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 83300,
      taxesAndFees: 14600,
      total: 97900,
      passengerCount: 1,
      generatedAt: "2026-09-04T15:00:00.000Z",
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
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 24,
          code: "SJ603",
          origin: "Port-au-Prince",
          originCode: "PAP",
          destination: "Boston",
          destinationCode: "BOS",
          departureTime: "2026-09-13T15:00:00.000Z",
          arrivalTime: "2026-09-13T16:00:00.000Z",
          fareFamily: "FLEX",
          farePriceCents: 44500,
        }),
      ],
      passengers: [adultTraveler],
    });

    assert.equal(model.isRoundTrip, true);
    assert.equal(model.segments.length, 2);
    assert.equal(model.segments[0]?.segmentLabel, "OUTBOUND");
    assert.equal(model.segments[1]?.segmentLabel, "RETURN");
  });

  it("E. fare labels print as Five Stars Basic/Standard/Flex", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-FARE",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 83300,
      taxesAndFees: 14600,
      total: 97900,
      passengerCount: 1,
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
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 2,
          code: "SJ603",
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-13T15:00:00.000Z",
          fareFamily: "FLEX",
          farePriceCents: 44500,
        }),
      ],
      passengers: [adultTraveler],
    });

    assert.equal(model.segments[0]?.fareLabel, "Five Stars Standard");
    assert.equal(model.segments[1]?.fareLabel, "Five Stars Flex");
    assert.equal(
      model.priceLines[0]?.label,
      "SJ602 · Five Stars Standard"
    );
    assert.equal(model.priceLines[1]?.label, "SJ603 · Five Stars Flex");
  });

  it("F. booking reference present", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-XXXXXXX",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
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
      passengers: [adultTraveler],
    });

    assert.equal(model.bookingReference, "SJ-XXXXXXX");
    assert.match(model.footerNote, /saved booking record/i);
  });

  it("G. Draft wording present", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-DRAFT",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
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
      passengers: [adultTraveler],
    });

    assert.equal(model.statusLabel, "Draft");
    assert.match(
      model.confirmationSummary,
      /Booking created\. Payment has not been completed\./
    );
    assert.equal(
      model.paymentNotice,
      "Online payment is not available yet."
    );
    assert.match(model.footerNote, /Payment has not been completed/);
  });

  it("H. passport details excluded", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-PRIV",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
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
      passengers: [adultTraveler],
    });

    assert.equal(model.travelers.length, 1);
    assert.equal(model.travelers[0]?.displayName, "Kepler Francois");
    assert.equal(model.travelers[0]?.passengerTypeLabel, "Adult");
    assert.equal(model.travelers[0]?.nationality, "Haitian");
    assert.equal(assertNoSensitivePrintTravelerFields(model.travelers), true);
    assert.equal(
      JSON.stringify(model.travelers).includes("SECRET-PASSPORT"),
      false
    );
    assert.equal(JSON.stringify(model.travelers).includes("1990-01-01"), false);
  });

  it("I. persisted fare snapshots used", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-SNAP",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ602",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          price: 99999,
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
      ],
      passengers: [adultTraveler],
    });

    assert.equal(model.segments[0]?.usedFareSnapshot, true);
    assert.equal(model.segments[0]?.farePriceCents, 38800);
    assert.equal(model.priceLines[0]?.amountCents, 38800);
  });

  it("J. persisted booking totals used", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-TOTAL",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
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
      passengers: [adultTraveler],
    });

    assert.equal(model.subtotal, 38800);
    assert.equal(model.taxesAndFees, 6800);
    assert.equal(model.total, 45600);
  });

  it("K. canonical airport labels", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-CANON",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          code: "SJ602",
          origin: "PAP",
          originCode: "PORT-AU-PRINCE",
          destination: "BOS",
          destinationCode: "BOSTON",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
      ],
      passengers: [adultTraveler],
    });

    assert.equal(model.segments[0]?.originCode, "PAP");
    assert.equal(model.segments[0]?.destinationCode, "BOS");
    assert.match(model.routeDetail ?? "", /PAP/);
    assert.match(model.routeDetail ?? "", /BOS/);
    assert.equal(model.routeDetail?.includes("PORT-AU-PRINCE"), false);
    assert.equal(model.routeDetail?.includes("BOSTON"), false);
  });

  it("L. one-way has no Return section", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-NOR",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 38800,
      taxesAndFees: 6800,
      total: 45600,
      passengerCount: 1,
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
      passengers: [adultTraveler],
    });

    assert.equal(model.segments.some((s) => s.segmentLabel === "RETURN"), false);
    assert.equal(model.isRoundTrip, false);
  });

  it("M. round-trip outbound + return both present", () => {
    const model = buildPrintItineraryViewModel({
      bookingReference: "SJ-BOTH",
      status: "DRAFT",
      createdAt: "2026-09-04T12:00:00.000Z",
      subtotal: 83300,
      taxesAndFees: 14600,
      total: 97900,
      passengerCount: 1,
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
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 2,
          code: "SJ603",
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-13T15:00:00.000Z",
          fareFamily: "FLEX",
          farePriceCents: 44500,
        }),
      ],
      passengers: [adultTraveler],
    });

    assert.deepEqual(
      model.segments.map((s) => s.segmentLabel),
      ["OUTBOUND", "RETURN"]
    );
    assert.deepEqual(
      model.segments.map((s) => s.flightCode),
      ["SJ602", "SJ603"]
    );
  });
});

describe("print itinerary pagination regression (D12.3.3.1)", () => {
  const oneWayInput = {
    bookingReference: "SJ-5V6PJG",
    status: "DRAFT",
    createdAt: "2026-09-04T12:00:00.000Z",
    subtotal: 38800,
    taxesAndFees: 6800,
    total: 45600,
    passengerCount: 1,
    generatedAt: "2026-09-04T15:00:00.000Z",
    legs: [
      leg({
        sequence: 1,
        segmentType: "OUTBOUND" as const,
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
    passengers: [adultTraveler],
  };

  it("A. Five Stars print branding unchanged", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.equal(model.brand, "Five Stars");
    assert.equal(model.brandMark, "FIVE STARS");
    assert.equal(model.segments[0]?.fareLabel, "Five Stars Standard");
  });

  it("B. print itinerary still includes travel information", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.ok(model.importantNotes.length >= 3);
    assert.match(model.importantNotes.join(" "), /check-in and security/i);
  });

  it("C. document footer still exists", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.match(model.footerNote, /saved booking record/i);
    assert.equal(model.bookingReference, "SJ-5V6PJG");
    assert.ok(model.generatedAtLabel.length > 0);
  });

  it("D. one-way data model unchanged", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.equal(model.isRoundTrip, false);
    assert.equal(model.segments.length, 1);
    assert.equal(model.segments[0]?.segmentLabel, "OUTBOUND");
  });

  it("E. round-trip data model unchanged", () => {
    const model = buildPrintItineraryViewModel({
      ...oneWayInput,
      bookingReference: "SJ-RT-PAGE",
      subtotal: 83300,
      taxesAndFees: 14600,
      total: 97900,
      legs: [
        oneWayInput.legs[0]!,
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 24,
          code: "SJ603",
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-13T15:00:00.000Z",
          fareFamily: "FLEX",
          farePriceCents: 44500,
        }),
      ],
    });
    assert.equal(model.isRoundTrip, true);
    assert.deepEqual(
      model.segments.map((s) => s.segmentLabel),
      ["OUTBOUND", "RETURN"]
    );
  });

  it("F. passport/DOB still excluded", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.equal(assertNoSensitivePrintTravelerFields(model.travelers), true);
    assert.equal(
      JSON.stringify(model.travelers).includes("SECRET-PASSPORT"),
      false
    );
  });

  it("G. persisted fare snapshots still used", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.equal(model.segments[0]?.usedFareSnapshot, true);
    assert.equal(model.segments[0]?.farePriceCents, 38800);
  });

  it("H. persisted booking totals still used", () => {
    const model = buildPrintItineraryViewModel(oneWayInput);
    assert.equal(model.subtotal, 38800);
    assert.equal(model.taxesAndFees, 6800);
    assert.equal(model.total, 45600);
    assert.equal(model.seatFeesTotal, 0);
    assert.equal(model.amountDueCents, 45600);
    assert.equal(model.seatLines.length, 0);
  });

  it("H2. seat fees appear in amount due and compact seat lines", () => {
    const model = buildPrintItineraryViewModel({
      ...oneWayInput,
      seatFeesTotal: 2400,
      segments: [{ id: 91, segmentType: "OUTBOUND", flightId: 23 }],
      seatAssignments: [
        {
          bookingSegmentId: 91,
          passengerId: 1,
          seatNumber: "12A",
        },
      ],
    });
    assert.equal(model.total, 45600);
    assert.equal(model.seatFeesTotal, 2400);
    assert.equal(model.amountDueCents, 48000);
    assert.equal(model.seatLines.length, 1);
    assert.equal(model.seatLines[0]?.seatNumber, "12A");
    assert.match(model.seatLines[0]?.passengerName ?? "", /Kepler/);
  });
});
