import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateBookingTotals,
  isRoundTripLegs,
  normalizeBookingLegs,
  validateRoundTripFlights,
} from "./booking-legs";

describe("booking legs", () => {
  it("normalizes legacy bookings without segments to one OUTBOUND leg", () => {
    assert.deepEqual(
      normalizeBookingLegs({
        flightId: 23,
        segments: [],
      }),
      [
        {
          sequence: 1,
          segmentType: "OUTBOUND",
          flightId: 23,
          fareFamily: "BASIC",
          farePriceCents: null,
        },
      ]
    );
  });

  it("orders stored segments by sequence", () => {
    const legs = normalizeBookingLegs({
      flightId: 23,
      segments: [
        { flightId: 40, segmentType: "RETURN", sequence: 2 },
        { flightId: 23, segmentType: "OUTBOUND", sequence: 1 },
      ],
    });

    assert.deepEqual(
      legs.map((leg) => leg.segmentType),
      ["OUTBOUND", "RETURN"]
    );
    assert.equal(isRoundTripLegs(legs), true);
  });

  it("calculates combined round-trip totals with existing tax rule", () => {
    assert.deepEqual(
      calculateBookingTotals({
        unitPricesCents: [30000, 35000],
        passengerCount: 2,
      }),
      {
        subtotal: 130000,
        taxesAndFees: 13600,
        total: 143600,
      }
    );

    assert.deepEqual(
      calculateBookingTotals({
        unitPricesCents: [30000],
        passengerCount: 1,
      }),
      {
        subtotal: 30000,
        taxesAndFees: 6800,
        total: 36800,
      }
    );
  });

  it("rejects invalid round-trip flight pairs", () => {
    const outbound = {
      id: 1,
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: "2026-09-06T20:55:00.000Z",
      arrivalTime: "2026-09-06T21:55:00.000Z",
      status: "SCHEDULED",
      availableSeats: 5,
    };
    const returnFlight = {
      id: 2,
      originCode: "CAP",
      destinationCode: "BOS",
      departureTime: "2026-09-13T14:00:00.000Z",
      arrivalTime: "2026-09-13T18:00:00.000Z",
      status: "SCHEDULED",
      availableSeats: 5,
    };

    assert.equal(
      validateRoundTripFlights({
        outbound,
        returnFlight,
        passengerCount: 1,
      }),
      null
    );

    assert.match(
      validateRoundTripFlights({
        outbound,
        returnFlight: { ...returnFlight, originCode: "BOS" },
        passengerCount: 1,
      }) ?? "",
      /reverse/i
    );

    assert.match(
      validateRoundTripFlights({
        outbound,
        returnFlight: {
          ...returnFlight,
          departureTime: "2026-09-06T21:00:00.000Z",
        },
        passengerCount: 1,
      }) ?? "",
      /after outbound arrival/i
    );

    assert.match(
      validateRoundTripFlights({
        outbound: { ...outbound, availableSeats: 0 },
        returnFlight,
        passengerCount: 1,
      }) ?? "",
      /outbound/i
    );

    assert.match(
      validateRoundTripFlights({
        outbound,
        returnFlight: { ...returnFlight, availableSeats: 0 },
        passengerCount: 1,
      }) ?? "",
      /return/i
    );
  });

  it("D12.2.1 accepts return legs with swapped city/code fields", () => {
    const outbound = {
      id: 23,
      origin: "Boston",
      originCode: "BOS",
      destination: "Port-au-Prince",
      destinationCode: "PAP",
      departureTime: "2026-09-06T20:55:00.000Z",
      arrivalTime: "2026-09-06T21:55:00.000Z",
      status: "SCHEDULED",
      availableSeats: 5,
    };
    const returnFlight = {
      id: 39,
      origin: "PAP",
      originCode: "PORT-AU-PRINCE",
      destination: "BOS",
      destinationCode: "BOSTON",
      departureTime: "2026-09-12T10:00:00.000Z",
      arrivalTime: "2026-09-12T14:00:00.000Z",
      status: "SCHEDULED",
      availableSeats: 5,
    };

    assert.equal(
      validateRoundTripFlights({
        outbound,
        returnFlight,
        passengerCount: 1,
      }),
      null
    );
  });
});
