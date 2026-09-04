import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validatePassengerAgeForType } from "./passenger-age";
import {
  buildOneWayPassengersHref,
  flightOriginLocalDate,
  isReturnSearchDateValidForOutbound,
  isValidOutboundSelection,
  isValidRoundTripPair,
  NEARBY_DATE_WINDOW_DAYS,
  partitionFlightsForDiscovery,
  partitionReturnFlightsForDiscovery,
  shiftCalendarDate,
  type SearchableFlight,
} from "./flight-search";

type FlightFixture = SearchableFlight & { arrivalTime?: string };

function flight(
  overrides: Partial<FlightFixture> &
    Pick<
      SearchableFlight,
      "id" | "code" | "originCode" | "destinationCode" | "departureTime"
    >
): FlightFixture {
  return {
    origin: overrides.origin ?? overrides.originCode,
    destination: overrides.destination ?? overrides.destinationCode,
    status: overrides.status ?? "SCHEDULED",
    availableSeats: overrides.availableSeats ?? 10,
    ...overrides,
  };
}

/** BOS local afternoon ≈ 20:55 UTC on the same calendar day in EDT. */
function bosAfternoon(localDate: string) {
  return `${localDate}T20:55:00.000Z`;
}

describe("flexible flight discovery (D12.1)", () => {
  const filter = {
    from: "BOS",
    to: "PAP",
    departure: "2026-09-06",
    passengers: "1",
    requireSeats: true as const,
  };

  const inventory = [
    flight({
      id: 1,
      code: "SJ602",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
    }),
    flight({
      id: 2,
      code: "SJ605",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-12"),
    }),
    flight({
      id: 3,
      code: "SJ601",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-04"),
    }),
    flight({
      id: 4,
      code: "SJ-FAR",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-20"),
    }),
    flight({
      id: 5,
      code: "SJ-FULL",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-07"),
      availableSeats: 2,
    }),
    flight({
      id: 6,
      code: "SJ-CXL",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-08"),
      status: "CANCELLED",
    }),
    flight({
      id: 7,
      code: "SJ-OTHER",
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: bosAfternoon("2026-09-07"),
    }),
  ];

  it("A. exact date result lands in primary", () => {
    const { exactDateFlights, alternateFlights } = partitionFlightsForDiscovery(
      inventory,
      filter
    );

    assert.deepEqual(
      exactDateFlights.map((item) => item.code),
      ["SJ602"]
    );
    assert.ok(!alternateFlights.some((item) => item.code === "SJ602"));
  });

  it("B. nearby later flight is alternate", () => {
    const { alternateFlights, alternateGroups } = partitionFlightsForDiscovery(
      inventory,
      filter
    );

    assert.ok(alternateFlights.some((item) => item.code === "SJ605"));
    assert.equal(
      alternateGroups.find((group) => group.date === "2026-09-12")?.flights[0]
        ?.code,
      "SJ605"
    );
  });

  it("C. nearby earlier flight is alternate", () => {
    const { alternateFlights } = partitionFlightsForDiscovery(inventory, filter);
    assert.ok(alternateFlights.some((item) => item.code === "SJ601"));
  });

  it("D. exact date excluded from alternate list", () => {
    const { alternateFlights } = partitionFlightsForDiscovery(inventory, filter);
    assert.ok(!alternateFlights.some((item) => item.code === "SJ602"));
  });

  it("E. outside search window not returned as alternate", () => {
    assert.equal(NEARBY_DATE_WINDOW_DAYS, 7);
    const { alternateFlights } = partitionFlightsForDiscovery(inventory, filter);
    assert.ok(!alternateFlights.some((item) => item.code === "SJ-FAR"));
    assert.equal(
      shiftCalendarDate("2026-09-06", NEARBY_DATE_WINDOW_DAYS),
      "2026-09-13"
    );
  });

  it("F. insufficient seats excluded", () => {
    const { alternateFlights, exactDateFlights } = partitionFlightsForDiscovery(
      inventory,
      { ...filter, passengers: "4" }
    );

    assert.ok(!alternateFlights.some((item) => item.code === "SJ-FULL"));
    assert.ok(!exactDateFlights.some((item) => item.code === "SJ-FULL"));
  });

  it("G. non-SCHEDULED excluded", () => {
    const { alternateFlights } = partitionFlightsForDiscovery(inventory, filter);
    assert.ok(!alternateFlights.some((item) => item.code === "SJ-CXL"));
  });

  it("H. timezone boundary classified by origin-local date", () => {
    // 2026-09-07 03:30 UTC = still Sep 6 evening in America/New_York.
    const boundary = flight({
      id: 90,
      code: "SJ-TZ",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: "2026-09-07T03:30:00.000Z",
    });

    assert.equal(flightOriginLocalDate(boundary), "2026-09-06");

    const { exactDateFlights, alternateFlights } = partitionFlightsForDiscovery(
      [boundary],
      filter
    );

    assert.deepEqual(
      exactDateFlights.map((item) => item.code),
      ["SJ-TZ"]
    );
    assert.equal(alternateFlights.length, 0);
  });

  it("I. alternate selection preserves passenger composition", () => {
    const href = buildOneWayPassengersHref({
      flightCode: "SJ605",
      passengers: "4",
      adults: "1",
      seniors: "1",
      children: "1",
      infants: "1",
    });

    assert.equal(
      href,
      "/passengers?flight=SJ605&passengers=4&adults=1&seniors=1&children=1&infants=1"
    );
  });

  it("J. selected alternate date is used by passenger age validation", () => {
    const searchedDate = "2026-09-06";
    const selectedAlternate = inventory.find((item) => item.code === "SJ605")!;
    const selectedDate = flightOriginLocalDate(selectedAlternate);

    assert.notEqual(selectedDate, searchedDate);
    assert.equal(selectedDate, "2026-09-12");

    // Age 16 on Sep 12 but still 15 on searched Sep 6.
    const asOfSelected = validatePassengerAgeForType({
      dateOfBirth: "2010-09-12",
      departureDate: selectedDate,
      passengerType: "ADULT",
    });
    const asOfSearched = validatePassengerAgeForType({
      dateOfBirth: "2010-09-12",
      departureDate: searchedDate,
      passengerType: "ADULT",
    });

    assert.equal(asOfSelected.valid, true);
    assert.equal(asOfSearched.valid, false);
  });

  it("K. round-trip alternate outbound is accepted for selection", () => {
    const alternateOutbound = inventory.find((item) => item.code === "SJ605")!;
    assert.equal(isValidOutboundSelection(alternateOutbound, filter), true);
  });

  it("L. round-trip alternate return is partitioned separately", () => {
    const outbound = flight({
      id: 10,
      code: "SJ-OUT",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
      arrivalTime: "2026-09-06T21:55:00.000Z",
    });

    const returns = [
      flight({
        id: 11,
        code: "SJ-RET-EXACT",
        originCode: "PAP",
        destinationCode: "BOS",
        departureTime: bosAfternoon("2026-09-12"),
        arrivalTime: "2026-09-12T21:55:00.000Z",
      }),
      flight({
        id: 12,
        code: "SJ-RET-ALT",
        originCode: "PAP",
        destinationCode: "BOS",
        departureTime: bosAfternoon("2026-09-13"),
        arrivalTime: "2026-09-13T21:55:00.000Z",
      }),
    ];

    const discovery = partitionReturnFlightsForDiscovery(returns, outbound, {
      from: "PAP",
      to: "BOS",
      departure: "2026-09-12",
      passengers: "1",
      requireSeats: true,
    });

    assert.deepEqual(
      discovery.exactDateFlights.map((item) => item.code),
      ["SJ-RET-EXACT"]
    );
    assert.deepEqual(
      discovery.alternateFlights.map((item) => item.code),
      ["SJ-RET-ALT"]
    );
  });

  it("M. return chronology remains valid vs selected outbound", () => {
    const outboundSep13 = flight({
      id: 20,
      code: "SJ-LATE",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-13"),
      arrivalTime: "2026-09-13T21:55:00.000Z",
    });

    assert.equal(
      isReturnSearchDateValidForOutbound(outboundSep13, "2026-09-12"),
      false
    );
    assert.equal(
      isReturnSearchDateValidForOutbound(outboundSep13, "2026-09-13"),
      true
    );

    const earlyReturn = flight({
      id: 21,
      code: "SJ-EARLY-RET",
      originCode: "PAP",
      destinationCode: "BOS",
      departureTime: bosAfternoon("2026-09-12"),
      arrivalTime: "2026-09-12T21:55:00.000Z",
    });

    assert.equal(isValidRoundTripPair(outboundSep13, earlyReturn, "1"), false);

    const okReturn = flight({
      id: 22,
      code: "SJ-OK-RET",
      originCode: "PAP",
      destinationCode: "BOS",
      departureTime: bosAfternoon("2026-09-14"),
      arrivalTime: "2026-09-14T21:55:00.000Z",
    });

    assert.equal(isValidRoundTripPair(outboundSep13, okReturn, "1"), true);
  });

  it("N. zero exact results still surfaces nearby alternatives", () => {
    const gapDayInventory = inventory.filter((item) => item.code !== "SJ602");
    const { exactDateFlights, alternateFlights } = partitionFlightsForDiscovery(
      gapDayInventory,
      filter
    );

    assert.equal(exactDateFlights.length, 0);
    assert.ok(alternateFlights.length > 0);
    assert.ok(alternateFlights.some((item) => item.code === "SJ605"));
  });

  it("O. no exact and no alternates yields empty discovery", () => {
    const empty = partitionFlightsForDiscovery(
      [
        flight({
          id: 99,
          code: "SJ-DISTANT",
          originCode: "BOS",
          destinationCode: "PAP",
          departureTime: bosAfternoon("2026-12-01"),
        }),
      ],
      filter
    );

    assert.equal(empty.exactDateFlights.length, 0);
    assert.equal(empty.alternateFlights.length, 0);
    assert.equal(empty.alternateGroups.length, 0);
  });

  it("A12.1.1 one-way exact includes when availableSeats >= passengers", () => {
    const roomy = flight({
      id: 40,
      code: "SJ-ROOMY",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
      availableSeats: 12,
    });

    const { exactDateFlights } = partitionFlightsForDiscovery([roomy], {
      ...filter,
      passengers: "9",
      requireSeats: true,
    });

    assert.deepEqual(
      exactDateFlights.map((item) => item.code),
      ["SJ-ROOMY"]
    );
  });

  it("B12.1.1 one-way exact excludes when availableSeats < passengers", () => {
    const tight = flight({
      id: 41,
      code: "SJ-TIGHT",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
      availableSeats: 8,
    });

    const { exactDateFlights } = partitionFlightsForDiscovery([tight], {
      ...filter,
      passengers: "9",
      requireSeats: true,
    });

    assert.equal(exactDateFlights.length, 0);
  });

  it("C12.1.1 exact under-seated + nearby sufficient shows alternates only", () => {
    const flights = [
      flight({
        id: 42,
        code: "SJ-EXACT-FULL",
        originCode: "BOS",
        destinationCode: "PAP",
        departureTime: bosAfternoon("2026-09-06"),
        availableSeats: 3,
      }),
      flight({
        id: 43,
        code: "SJ-NEARBY-OK",
        originCode: "BOS",
        destinationCode: "PAP",
        departureTime: bosAfternoon("2026-09-12"),
        availableSeats: 12,
      }),
    ];

    const { exactDateFlights, alternateFlights } = partitionFlightsForDiscovery(
      flights,
      { ...filter, passengers: "9", requireSeats: true }
    );

    assert.equal(exactDateFlights.length, 0);
    assert.deepEqual(
      alternateFlights.map((item) => item.code),
      ["SJ-NEARBY-OK"]
    );
  });

  it("D12.1.1 composition total 4 requires 4 seats (not category sum logic)", () => {
    const threeSeats = flight({
      id: 44,
      code: "SJ-3",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
      availableSeats: 3,
    });
    const fourSeats = flight({
      id: 45,
      code: "SJ-4",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
      availableSeats: 4,
    });

    const under = partitionFlightsForDiscovery([threeSeats], {
      ...filter,
      passengers: "4",
      requireSeats: true,
    });
    const enough = partitionFlightsForDiscovery([fourSeats], {
      ...filter,
      passengers: "4",
      requireSeats: true,
    });

    assert.equal(under.exactDateFlights.length, 0);
    assert.deepEqual(
      enough.exactDateFlights.map((item) => item.code),
      ["SJ-4"]
    );
  });

  it("E12.1.1 round-trip exact and alternate still require seats", () => {
    const outbound = flight({
      id: 50,
      code: "SJ-OUT",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: bosAfternoon("2026-09-06"),
      arrivalTime: "2026-09-06T21:55:00.000Z",
      availableSeats: 10,
    });
    const returnExact = flight({
      id: 51,
      code: "SJ-RET",
      originCode: "PAP",
      destinationCode: "BOS",
      departureTime: bosAfternoon("2026-09-12"),
      arrivalTime: "2026-09-12T21:55:00.000Z",
      availableSeats: 2,
    });
    const returnAlt = flight({
      id: 52,
      code: "SJ-RET-ALT",
      originCode: "PAP",
      destinationCode: "BOS",
      departureTime: bosAfternoon("2026-09-13"),
      arrivalTime: "2026-09-13T21:55:00.000Z",
      availableSeats: 10,
    });

    const returns = partitionReturnFlightsForDiscovery(
      [returnExact, returnAlt],
      outbound,
      {
        from: "PAP",
        to: "BOS",
        departure: "2026-09-12",
        passengers: "4",
        requireSeats: true,
      }
    );

    assert.equal(returns.exactDateFlights.length, 0);
    assert.deepEqual(
      returns.alternateFlights.map((item) => item.code),
      ["SJ-RET-ALT"]
    );
    assert.equal(isValidRoundTripPair(outbound, returnExact, "4"), false);
    assert.equal(isValidRoundTripPair(outbound, returnAlt, "4"), true);
  });

  it("sorts alternate groups by calendar date then departure time", () => {
    const { alternateGroups } = partitionFlightsForDiscovery(inventory, filter);
    const dates = alternateGroups.map((group) => group.date);
    assert.deepEqual(dates, [...dates].sort());

    const sameDay = [
      flight({
        id: 30,
        code: "SJ-A",
        originCode: "BOS",
        destinationCode: "PAP",
        departureTime: "2026-09-07T18:00:00.000Z",
      }),
      flight({
        id: 31,
        code: "SJ-B",
        originCode: "BOS",
        destinationCode: "PAP",
        departureTime: "2026-09-07T22:00:00.000Z",
      }),
    ];

    const grouped = partitionFlightsForDiscovery(sameDay, filter);
    assert.deepEqual(
      grouped.alternateGroups[0]?.flights.map((item) => item.code),
      ["SJ-A", "SJ-B"]
    );
  });
});
