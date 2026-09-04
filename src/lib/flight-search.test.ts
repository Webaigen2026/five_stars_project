import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFlightSearchParams,
  buildModifySearchHref,
  buildOneWayPassengersHref,
  buildRoundTripPassengersHref,
  buildRoundTripResultsHref,
  filterFlightsForLeg,
  formatEmptyFlightSearchMessage,
  formatSearchDate,
  isValidOutboundSelection,
  isValidRoundTripPair,
  matchesFlightLeg,
  parseTripType,
  validateFlightSearch,
  type SearchableFlight,
} from "./flight-search";
import {
  parsePassengerComposition,
  serializePassengerComposition,
} from "./passenger-composition";

const COMPOSITION_SUFFIX = "adults=1&seniors=0&children=0&infants=0";

function flight(
  overrides: Partial<SearchableFlight> &
    Pick<
      SearchableFlight,
      "id" | "code" | "originCode" | "destinationCode" | "departureTime"
    >
): SearchableFlight {
  return {
    origin: overrides.origin ?? overrides.originCode,
    destination: overrides.destination ?? overrides.destinationCode,
    status: overrides.status ?? "SCHEDULED",
    availableSeats: overrides.availableSeats ?? 10,
    ...overrides,
  };
}

describe("flight search validation", () => {
  const validSearch = {
    tripType: "one-way" as const,
    from: "BOS",
    to: "PAP",
    departure: "2026-09-06",
    returnDate: "",
    passengers: "1",
  };

  it("builds a code-only results URL for one-way (backward compatible)", () => {
    const params = buildFlightSearchParams(validSearch);

    assert.equal(params.get("from"), "BOS");
    assert.equal(params.get("to"), "PAP");
    assert.equal(params.get("departure"), "2026-09-06");
    assert.equal(params.get("passengers"), "1");
    assert.equal(params.get("adults"), "1");
    assert.equal(params.get("seniors"), "0");
    assert.equal(params.get("children"), "0");
    assert.equal(params.get("infants"), "0");
    assert.equal(params.get("tripType"), null);
    assert.equal(params.get("returnDate"), null);
    assert.equal(
      `/flights/results?${params.toString()}`,
      `/flights/results?from=BOS&to=PAP&departure=2026-09-06&passengers=1&${COMPOSITION_SUFFIX}`
    );
  });

  it("blocks the same airport", () => {
    assert.equal(
      validateFlightSearch({
        ...validSearch,
        to: "BOS",
      }),
      "Departure and destination airports must be different."
    );
  });

  it("rejects unknown airport codes such as BOB", () => {
    assert.equal(
      validateFlightSearch({
        ...validSearch,
        from: "BOB",
      }),
      "Select a valid departure airport."
    );
  });

  it("requires from, to, date, and at least one passenger", () => {
    assert.equal(
      validateFlightSearch({ ...validSearch, from: "" }),
      "Departure airport is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, to: "" }),
      "Destination airport is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, departure: "" }),
      "Departure date is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, passengers: "0" }),
      "At least 1 passenger is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, passengers: "10" }),
      "A search can include at most 9 travelers."
    );
  });

  it("builds a friendly empty state and modify-search link", () => {
    assert.equal(formatSearchDate("2026-09-06"), "Sep 6, 2026");
    assert.equal(
      formatEmptyFlightSearchMessage({
        from: "BOS",
        to: "PAP",
        departure: "2026-09-06",
      }),
      "No flights found from Boston (BOS) to Port-au-Prince (PAP) on Sep 6, 2026."
    );
    assert.equal(
      formatEmptyFlightSearchMessage({
        from: "XXX",
        to: "PAP",
        departure: "2026-09-06",
      }),
      "No flights found from XXX to Port-au-Prince (PAP) on Sep 6, 2026."
    );
    assert.equal(
      buildModifySearchHref(validSearch),
      `/flights?from=BOS&to=PAP&departure=2026-09-06&passengers=1&${COMPOSITION_SUFFIX}`
    );
  });

  it("preserves exact composition through search, modify, and select links", () => {
    const composition = {
      adults: 1,
      seniors: 3,
      children: 3,
      infantsInSeat: 2,
    };
    const serialized = serializePassengerComposition(composition);
    assert.deepEqual(serialized, {
      passengers: "9",
      adults: "1",
      seniors: "3",
      children: "3",
      infants: "2",
    });

    const resultsParams = buildFlightSearchParams({
      ...validSearch,
      passengers: "9",
      composition,
    });
    assert.equal(resultsParams.get("passengers"), "9");
    assert.equal(resultsParams.get("adults"), "1");
    assert.equal(resultsParams.get("seniors"), "3");
    assert.equal(resultsParams.get("children"), "3");
    assert.equal(resultsParams.get("infants"), "2");

    assert.equal(
      buildModifySearchHref({
        ...validSearch,
        passengers: "9",
        composition,
      }),
      "/flights?from=BOS&to=PAP&departure=2026-09-06&passengers=9&adults=1&seniors=3&children=3&infants=2"
    );

    assert.equal(
      buildOneWayPassengersHref({
        flightCode: "SJ602",
        passengers: "9",
        composition,
      }),
      "/passengers?flight=SJ602&passengers=9&adults=1&seniors=3&children=3&infants=2"
    );

    assert.deepEqual(
      parsePassengerComposition({
        passengers: resultsParams.get("passengers"),
        adults: resultsParams.get("adults"),
        seniors: resultsParams.get("seniors"),
        children: resultsParams.get("children"),
        infants: resultsParams.get("infants"),
      }),
      composition
    );
  });

  it("uses only passengers total for availability matching", () => {
    const sj602 = flight({
      id: 1,
      code: "SJ602",
      originCode: "BOS",
      destinationCode: "PAP",
      departureTime: "2026-09-06T20:55:00.000Z",
      availableSeats: 12,
    });

    assert.equal(
      matchesFlightLeg(sj602, {
        from: "BOS",
        to: "PAP",
        departure: "2026-09-06",
        passengers: "9",
        requireSeats: true,
      }),
      true
    );
    assert.equal(
      matchesFlightLeg(
        { ...sj602, availableSeats: 8 },
        {
          from: "BOS",
          to: "PAP",
          departure: "2026-09-06",
          passengers: "9",
          requireSeats: true,
        }
      ),
      false
    );
  });
});

describe("round-trip search", () => {
  const roundTrip = {
    tripType: "round-trip" as const,
    from: "BOS",
    to: "CAP",
    departure: "2026-09-06",
    returnDate: "2026-09-13",
    passengers: "1",
  };

  it("parses trip type with one-way default", () => {
    assert.equal(parseTripType(undefined), "one-way");
    assert.equal(parseTripType("one-way"), "one-way");
    assert.equal(parseTripType("round-trip"), "round-trip");
    assert.equal(parseTripType("other"), "one-way");
  });

  it("requires return date for round trip", () => {
    assert.equal(
      validateFlightSearch({ ...roundTrip, returnDate: "" }),
      "Return date is required."
    );
  });

  it("rejects return before departure", () => {
    assert.equal(
      validateFlightSearch({
        ...roundTrip,
        departure: "2026-09-13",
        returnDate: "2026-09-06",
      }),
      "Return date cannot be before departure date."
    );
  });

  it("builds round-trip results URL with returnDate", () => {
    const params = buildFlightSearchParams(roundTrip);
    assert.equal(params.get("tripType"), "round-trip");
    assert.equal(params.get("returnDate"), "2026-09-13");
    assert.equal(
      `/flights/results?${params.toString()}`,
      `/flights/results?from=BOS&to=CAP&departure=2026-09-06&passengers=1&${COMPOSITION_SUFFIX}&tripType=round-trip&returnDate=2026-09-13`
    );
  });

  it("builds outbound selection and passengers hrefs", () => {
    assert.equal(
      buildRoundTripResultsHref({
        ...roundTrip,
        outboundFlightId: 23,
      }),
      `/flights/results?from=BOS&to=CAP&departure=2026-09-06&passengers=1&${COMPOSITION_SUFFIX}&tripType=round-trip&returnDate=2026-09-13&outboundFlightId=23`
    );
    assert.equal(
      buildRoundTripPassengersHref({
        outboundFlightId: 23,
        returnFlightId: 40,
        passengers: "2",
        adults: "2",
        seniors: "0",
        children: "0",
        infants: "0",
        outboundFareFamily: "STANDARD",
        returnFareFamily: "FLEX",
      }),
      "/passengers?tripType=round-trip&outboundFlightId=23&returnFlightId=40&passengers=2&adults=2&seniors=0&children=0&infants=0&outboundFareFamily=STANDARD&returnFareFamily=FLEX"
    );
  });

  it("preserves the same composition through outbound and return selection", () => {
    const composition = {
      adults: 2,
      seniors: 0,
      children: 1,
      infantsInSeat: 0,
    };

    const outboundHref = buildRoundTripResultsHref({
      ...roundTrip,
      passengers: "3",
      composition,
      outboundFlightId: 23,
    });
    assert.match(outboundHref, /passengers=3/);
    assert.match(outboundHref, /adults=2/);
    assert.match(outboundHref, /children=1/);
    assert.match(outboundHref, /outboundFlightId=23/);

    const passengersHref = buildRoundTripPassengersHref({
      outboundFlightId: 23,
      returnFlightId: 40,
      passengers: "3",
      composition,
    });
    assert.equal(
      passengersHref,
      "/passengers?tripType=round-trip&outboundFlightId=23&returnFlightId=40&passengers=3&adults=2&seniors=0&children=1&infants=0"
    );
  });

  it("filters outbound BOS→CAP and return CAP→BOS by origin-local calendar day", () => {
    const flights = [
      flight({
        id: 1,
        code: "SJ-OUT",
        originCode: "BOS",
        destinationCode: "CAP",
        // 2026-09-06 16:55 NY = 20:55 UTC
        departureTime: "2026-09-06T20:55:00.000Z",
      }),
      flight({
        id: 2,
        code: "SJ-RET",
        originCode: "CAP",
        destinationCode: "BOS",
        // 2026-09-13 local CAP (UTC-4) 10:00 = 14:00 UTC
        departureTime: "2026-09-13T14:00:00.000Z",
      }),
      flight({
        id: 3,
        code: "SJ-OTHER",
        originCode: "BOS",
        destinationCode: "CAP",
        departureTime: "2026-09-07T20:55:00.000Z",
      }),
    ];

    const outbound = filterFlightsForLeg(flights, {
      from: "BOS",
      to: "CAP",
      departure: "2026-09-06",
      passengers: "1",
      requireSeats: true,
    });
    assert.deepEqual(
      outbound.map((item) => item.code),
      ["SJ-OUT"]
    );

    const returns = filterFlightsForLeg(flights, {
      from: "CAP",
      to: "BOS",
      departure: "2026-09-13",
      passengers: "1",
      requireSeats: true,
    });
    assert.deepEqual(
      returns.map((item) => item.code),
      ["SJ-RET"]
    );
  });

  it("retains outbound selection for exact or nearby origin-local dates", () => {
    const outbound = flight({
      id: 23,
      code: "SJ602",
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: "2026-09-06T20:55:00.000Z",
    });
    const nearby = flight({
      id: 24,
      code: "SJ605",
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: "2026-09-12T20:55:00.000Z",
    });
    const tooFar = flight({
      id: 25,
      code: "SJ-FAR",
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: "2026-09-20T20:55:00.000Z",
    });

    assert.equal(
      isValidOutboundSelection(outbound, {
        from: "BOS",
        to: "CAP",
        departure: "2026-09-06",
        passengers: "1",
        requireSeats: true,
      }),
      true
    );
    assert.equal(
      isValidOutboundSelection(nearby, {
        from: "BOS",
        to: "CAP",
        departure: "2026-09-06",
        passengers: "1",
        requireSeats: true,
      }),
      true
    );
    assert.equal(
      isValidOutboundSelection(tooFar, {
        from: "BOS",
        to: "CAP",
        departure: "2026-09-06",
        passengers: "1",
        requireSeats: true,
      }),
      false
    );
    assert.equal(
      isValidOutboundSelection(outbound, {
        from: "BOS",
        to: "PAP",
        departure: "2026-09-06",
        passengers: "1",
        requireSeats: true,
      }),
      false
    );
  });

  it("validates reversed round-trip pairs without trusting query metadata", () => {
    const outbound = flight({
      id: 23,
      code: "SJ602",
      originCode: "BOS",
      destinationCode: "CAP",
      departureTime: "2026-09-06T20:55:00.000Z",
    });
    const returnFlight = flight({
      id: 40,
      code: "SJ701",
      originCode: "CAP",
      destinationCode: "BOS",
      departureTime: "2026-09-13T14:00:00.000Z",
    });

    assert.equal(isValidRoundTripPair(outbound, returnFlight, "1"), true);
    assert.equal(
      isValidRoundTripPair(outbound, { ...returnFlight, originCode: "BOS" }, "1"),
      false
    );
    assert.equal(
      matchesFlightLeg(returnFlight, {
        from: "CAP",
        to: "BOS",
        departure: "2026-09-13",
        passengers: "1",
        requireSeats: true,
      }),
      true
    );
  });

  it("preserves trip type on modify-search links", () => {
    assert.equal(
      buildModifySearchHref(roundTrip),
      `/flights?from=BOS&to=CAP&departure=2026-09-06&passengers=1&${COMPOSITION_SUFFIX}&tripType=round-trip&returnDate=2026-09-13`
    );
  });
});
