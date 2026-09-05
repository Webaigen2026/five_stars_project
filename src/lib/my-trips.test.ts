import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canReviewCheckoutBooking } from "./checkout";
import {
  buildMyTripCardViewModel,
  classifyMyTripSection,
  formatMyTripRouteCodes,
  formatMyTripRouteHeading,
  formatTravelerCountLabel,
  getTripTravelEndInstant,
  groupMyTripCards,
  isActionNeededBookingStatus,
  type MyTripCardViewModel,
  type MyTripLegInput,
} from "./my-trips";

function leg(input: {
  sequence: number;
  segmentType: "OUTBOUND" | "RETURN";
  flightId: number;
  code?: string;
  origin?: string;
  originCode: string;
  destination?: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime?: string;
  fareFamily?: string;
  farePriceCents?: number | null;
}): MyTripLegInput {
  return {
    sequence: input.sequence,
    segmentType: input.segmentType,
    flightId: input.flightId,
    fareFamily: input.fareFamily ?? "BASIC",
    farePriceCents: input.farePriceCents ?? null,
    flight: {
      code: input.code ?? `SJ${input.flightId}`,
      origin: input.origin ?? input.originCode,
      originCode: input.originCode,
      destination: input.destination ?? input.destinationCode,
      destinationCode: input.destinationCode,
      departureTime: input.departureTime,
      arrivalTime: input.arrivalTime ?? input.departureTime,
      price: 35300,
    },
  };
}

function booking(overrides?: Partial<{
  id: number;
  bookingReference: string;
  status: string;
  passengerCount: number;
  total: number;
  createdAt: string;
}>) {
  return {
    id: overrides?.id ?? 1,
    bookingReference: overrides?.bookingReference ?? "SJ-ABC123",
    status: overrides?.status ?? "DRAFT",
    passengerCount: overrides?.passengerCount ?? 1,
    total: overrides?.total ?? 42100,
    createdAt: overrides?.createdAt ?? "2026-09-01T12:00:00.000Z",
  };
}

const now = new Date("2026-09-04T12:00:00.000Z");

describe("my trips list (D12.3.1)", () => {
  it("A. one-way booking card", () => {
    const card = buildMyTripCardViewModel({
      booking: booking(),
      travelerCount: 1,
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
        }),
      ],
    });

    assert.equal(card.isRoundTrip, false);
    assert.equal(card.tripTypeLabel, "One way");
    assert.match(card.routeHeading, /Boston \(BOS\) → Port-au-Prince \(PAP\)/);
    assert.equal(card.routeDetail, "BOS → PAP");
    assert.match(card.datesLabel, /Sep 6/);
    assert.doesNotMatch(card.datesLabel, /–/);
    assert.equal(card.travelerLabel, "1 traveler");
    assert.equal(card.tripHref, "/my-trips/SJ-ABC123");
    assert.equal(card.itineraryHref, "/my-trips/SJ-ABC123/itinerary");
  });

  it("B/C. round-trip booking is one card", () => {
    const card = buildMyTripCardViewModel({
      booking: booking({ bookingReference: "SJ-XYZ789" }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        }),
        leg({
          sequence: 2,
          segmentType: "RETURN",
          flightId: 39,
          originCode: "PAP",
          destinationCode: "BOS",
          departureTime: "2026-09-12T10:00:00.000Z",
        }),
      ],
    });

    assert.equal(card.isRoundTrip, true);
    assert.equal(card.tripTypeLabel, "Round trip");
    assert.match(card.routeHeading, /⇄/);
    assert.equal(card.routeDetail, "BOS ⇄ PAP");
    assert.match(card.datesLabel, /Sep 6/);
    assert.match(card.datesLabel, /Sep 12/);
    // One card model — not two bookings.
    assert.equal(card.bookingReference, "SJ-XYZ789");
  });

  it("D. route arrow vs round-trip symbol", () => {
    assert.equal(
      formatMyTripRouteCodes(
        {
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        },
        false
      ),
      "BOS → PAP"
    );
    assert.equal(
      formatMyTripRouteCodes(
        {
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
        },
        true
      ),
      "BOS ⇄ PAP"
    );
  });

  it("E. traveler count singular/plural", () => {
    assert.equal(formatTravelerCountLabel(1), "1 traveler");
    assert.equal(formatTravelerCountLabel(2), "2 travelers");
    assert.equal(formatTravelerCountLabel(0), "0 travelers");
  });

  it("F/G/H. Draft, Upcoming, and Past grouping", () => {
    assert.equal(isActionNeededBookingStatus("DRAFT"), true);
    assert.equal(isActionNeededBookingStatus("PENDING_PAYMENT"), true);
    assert.equal(isActionNeededBookingStatus("CONFIRMED"), false);

    assert.equal(
      classifyMyTripSection({
        status: "DRAFT",
        outboundDepartureTime: "2026-09-06T20:55:00.000Z",
        travelEndTime: "2026-09-06T21:55:00.000Z",
        now,
      }),
      "actionNeeded"
    );

    assert.equal(
      classifyMyTripSection({
        status: "CONFIRMED",
        outboundDepartureTime: "2026-09-06T20:55:00.000Z",
        travelEndTime: "2026-09-12T14:00:00.000Z",
        now,
      }),
      "upcoming"
    );

    assert.equal(
      classifyMyTripSection({
        status: "CONFIRMED",
        outboundDepartureTime: "2026-08-01T20:55:00.000Z",
        travelEndTime: "2026-08-08T14:00:00.000Z",
        now,
      }),
      "past"
    );

    assert.equal(
      classifyMyTripSection({
        status: "COMPLETED",
        outboundDepartureTime: "2099-01-01T12:00:00.000Z",
        travelEndTime: "2099-01-08T12:00:00.000Z",
        now,
      }),
      "past"
    );
  });

  it("I/J/K. section sorting rules", () => {
    const draftOlder = buildMyTripCardViewModel({
      booking: booking({
        id: 1,
        bookingReference: "SJ-OLD",
        status: "DRAFT",
        createdAt: "2026-09-01T10:00:00.000Z",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 1,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-20T12:00:00.000Z",
        }),
      ],
    });
    const draftNewer = buildMyTripCardViewModel({
      booking: booking({
        id: 2,
        bookingReference: "SJ-NEW",
        status: "DRAFT",
        createdAt: "2026-09-03T10:00:00.000Z",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 2,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-25T12:00:00.000Z",
        }),
      ],
    });
    const upcomingLater = buildMyTripCardViewModel({
      booking: booking({
        id: 3,
        bookingReference: "SJ-LATE",
        status: "CONFIRMED",
        createdAt: "2026-08-01T10:00:00.000Z",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 3,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-20T12:00:00.000Z",
        }),
      ],
    });
    const upcomingSoon = buildMyTripCardViewModel({
      booking: booking({
        id: 4,
        bookingReference: "SJ-SOON",
        status: "CONFIRMED",
        createdAt: "2026-08-02T10:00:00.000Z",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 4,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-10T12:00:00.000Z",
        }),
      ],
    });
    const pastOlder = buildMyTripCardViewModel({
      booking: booking({
        id: 5,
        bookingReference: "SJ-PAST-OLD",
        status: "COMPLETED",
        createdAt: "2026-01-01T10:00:00.000Z",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 5,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-07-01T12:00:00.000Z",
          arrivalTime: "2026-07-01T16:00:00.000Z",
        }),
      ],
    });
    const pastNewer = buildMyTripCardViewModel({
      booking: booking({
        id: 6,
        bookingReference: "SJ-PAST-NEW",
        status: "COMPLETED",
        createdAt: "2026-02-01T10:00:00.000Z",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 6,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-08-01T12:00:00.000Z",
          arrivalTime: "2026-08-01T16:00:00.000Z",
        }),
      ],
    });

    const grouped = groupMyTripCards(
      [
        draftOlder,
        upcomingLater,
        pastOlder,
        draftNewer,
        upcomingSoon,
        pastNewer,
      ],
      now
    );

    assert.deepEqual(
      grouped.actionNeeded.map((card) => card.bookingReference),
      ["SJ-NEW", "SJ-OLD"]
    );
    assert.deepEqual(
      grouped.upcoming.map((card) => card.bookingReference),
      ["SJ-SOON", "SJ-LATE"]
    );
    assert.deepEqual(
      grouped.past.map((card) => card.bookingReference),
      ["SJ-PAST-NEW", "SJ-PAST-OLD"]
    );
  });

  it("L. empty state grouping yields empty sections", () => {
    const grouped = groupMyTripCards([]);
    assert.deepEqual(grouped.actionNeeded, []);
    assert.deepEqual(grouped.upcoming, []);
    assert.deepEqual(grouped.past, []);
  });

  it("M. legacy one-segment booking", () => {
    const card = buildMyTripCardViewModel({
      booking: booking({ status: "PAID" }),
      travelerCount: 2,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 10,
          originCode: "BOS",
          destinationCode: "CAP",
          departureTime: "2026-09-10T12:00:00.000Z",
          fareFamily: "BASIC",
          farePriceCents: null,
        }),
      ],
    });

    assert.equal(card.isRoundTrip, false);
    assert.equal(card.travelerLabel, "2 travelers");
    assert.equal(card.routeDetail, "BOS → CAP");
  });

  it("N. malformed airport endpoint canonicalization still displays valid codes", () => {
    assert.equal(
      formatMyTripRouteHeading(
        {
          origin: "PAP",
          originCode: "PORT-AU-PRINCE",
          destination: "BOS",
          destinationCode: "BOSTON",
          departureTime: "2026-09-12T10:00:00.000Z",
        },
        false
      ),
      "Port-au-Prince (PAP) → Boston (BOS)"
    );
    assert.equal(
      formatMyTripRouteCodes(
        {
          origin: "PAP",
          originCode: "PORT-AU-PRINCE",
          destination: "BOS",
          destinationCode: "BOSTON",
          departureTime: "2026-09-12T10:00:00.000Z",
        },
        true
      ),
      "PAP ⇄ BOS"
    );
  });

  it("O. fare snapshots do not affect grouping", () => {
    const withSnapshot = buildMyTripCardViewModel({
      booking: booking({ id: 8, status: "CONFIRMED", bookingReference: "SJ-FARE" }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        }),
      ],
    });
    const withoutSnapshot = buildMyTripCardViewModel({
      booking: booking({
        id: 9,
        status: "CONFIRMED",
        bookingReference: "SJ-BASIC",
      }),
      travelerCount: 1,
      legs: [
        leg({
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 24,
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: "2026-09-06T20:55:00.000Z",
          fareFamily: "BASIC",
          farePriceCents: null,
        }),
      ],
    });

    const grouped = groupMyTripCards([withSnapshot, withoutSnapshot], now);
    assert.equal(grouped.upcoming.length, 2);
    assert.equal(grouped.actionNeeded.length, 0);
  });

  it("P. ownership/auth behavior unchanged (same checkout helper)", () => {
    assert.equal(canReviewCheckoutBooking(null, null), false);
    assert.equal(canReviewCheckoutBooking(10, 10), true);
    assert.equal(canReviewCheckoutBooking(10, 11), false);
    // My Trips page still requires signed-in owner via userId filter.
  });

  it("round-trip travel end uses final segment instant", () => {
    const end = getTripTravelEndInstant([
      {
        flight: {
          departureTime: "2026-09-06T20:55:00.000Z",
          arrivalTime: "2026-09-06T21:55:00.000Z",
        },
      },
      {
        flight: {
          departureTime: "2026-09-12T10:00:00.000Z",
          arrivalTime: "2026-09-12T14:00:00.000Z",
        },
      },
    ]);
    assert.equal(end, "2026-09-12T14:00:00.000Z");
  });

  it("round trip remains a single grouped card entry", () => {
    const cards: MyTripCardViewModel[] = [
      buildMyTripCardViewModel({
        booking: booking({ status: "DRAFT", bookingReference: "SJ-RT" }),
        travelerCount: 1,
        legs: [
          leg({
            sequence: 1,
            segmentType: "OUTBOUND",
            flightId: 23,
            originCode: "BOS",
            destinationCode: "PAP",
            departureTime: "2026-09-06T20:55:00.000Z",
          }),
          leg({
            sequence: 2,
            segmentType: "RETURN",
            flightId: 39,
            originCode: "PAP",
            destinationCode: "BOS",
            departureTime: "2026-09-12T10:00:00.000Z",
          }),
        ],
      }),
    ];

    const grouped = groupMyTripCards(cards, now);
    assert.equal(grouped.actionNeeded.length, 1);
    assert.equal(grouped.upcoming.length, 0);
    assert.equal(grouped.past.length, 0);
  });
});
