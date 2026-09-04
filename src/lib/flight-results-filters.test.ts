import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_FLIGHT_RESULTS_FILTERS,
  applyFlightResultsFilters,
  classifyDepartureTimeBand,
  isDefaultFlightResultsFilters,
  matchesMaxPrice,
  sortFilterableFlights,
  type FilterableResultFlight,
  type FlightResultsFilterState,
} from "./flight-results-filters";

function flight(
  overrides: Partial<FilterableResultFlight> &
    Pick<FilterableResultFlight, "id" | "code" | "departureTime" | "price">
): FilterableResultFlight {
  return {
    originCode: overrides.originCode ?? "BOS",
    stops: overrides.stops ?? 0,
    ...overrides,
  };
}

describe("flight results filters (D12.1.2)", () => {
  it("A. Morning classification", () => {
    // 10:30 AM America/New_York ≈ 14:30 UTC in EDT
    assert.equal(
      classifyDepartureTimeBand(
        flight({
          id: 1,
          code: "M",
          departureTime: "2026-09-06T14:30:00.000Z",
          price: 35000,
        })
      ),
      "morning"
    );
  });

  it("B. Afternoon classification", () => {
    // 4:55 PM BOS = 20:55 UTC
    assert.equal(
      classifyDepartureTimeBand(
        flight({
          id: 1,
          code: "SJ602",
          departureTime: "2026-09-06T20:55:00.000Z",
          price: 35300,
        })
      ),
      "afternoon"
    );
  });

  it("C. Evening classification", () => {
    // 5:00 PM BOS = 21:00 UTC
    assert.equal(
      classifyDepartureTimeBand(
        flight({
          id: 1,
          code: "E",
          departureTime: "2026-09-06T21:00:00.000Z",
          price: 35300,
        })
      ),
      "evening"
    );
  });

  it("D. Origin-local time classification (UTC day differs)", () => {
    // 2026-09-07 03:30 UTC = Sep 6 11:30 PM EDT → evening, not morning
    assert.equal(
      classifyDepartureTimeBand(
        flight({
          id: 1,
          code: "TZ",
          departureTime: "2026-09-07T03:30:00.000Z",
          price: 35000,
        })
      ),
      "evening"
    );
  });

  it("E. Price max includes/excludes correctly", () => {
    const sj600 = flight({
      id: 1,
      code: "SJ600",
      departureTime: "2026-09-04T20:55:00.000Z",
      price: 35000,
    });
    const sj602 = flight({
      id: 2,
      code: "SJ602",
      departureTime: "2026-09-06T20:55:00.000Z",
      price: 35300,
    });
    const sj609 = flight({
      id: 3,
      code: "SJ609",
      departureTime: "2026-09-04T20:44:00.000Z",
      price: 35400,
    });

    assert.equal(matchesMaxPrice(sj600, 352), true);
    assert.equal(matchesMaxPrice(sj602, 352), false);
    assert.equal(matchesMaxPrice(sj609, 352), false);
    assert.equal(matchesMaxPrice(sj602, null), true);
  });

  it("F. Lowest price sort", () => {
    const flights = [
      flight({
        id: 2,
        code: "B",
        departureTime: "2026-09-06T20:55:00.000Z",
        price: 35300,
      }),
      flight({
        id: 1,
        code: "A",
        departureTime: "2026-09-06T20:44:00.000Z",
        price: 35000,
      }),
    ];
    assert.deepEqual(
      sortFilterableFlights(flights, "price-asc").map((item) => item.code),
      ["A", "B"]
    );
  });

  it("G. Highest price sort", () => {
    const flights = [
      flight({
        id: 1,
        code: "A",
        departureTime: "2026-09-06T20:44:00.000Z",
        price: 35000,
      }),
      flight({
        id: 2,
        code: "B",
        departureTime: "2026-09-06T20:55:00.000Z",
        price: 35300,
      }),
    ];
    assert.deepEqual(
      sortFilterableFlights(flights, "price-desc").map((item) => item.code),
      ["B", "A"]
    );
  });

  it("H. Earliest departure sort", () => {
    const flights = [
      flight({
        id: 2,
        code: "LATE",
        departureTime: "2026-09-06T22:00:00.000Z",
        price: 35000,
      }),
      flight({
        id: 1,
        code: "EARLY",
        departureTime: "2026-09-06T18:00:00.000Z",
        price: 35000,
      }),
    ];
    assert.deepEqual(
      sortFilterableFlights(flights, "departure-asc").map((item) => item.code),
      ["EARLY", "LATE"]
    );
  });

  it("I. Latest departure sort", () => {
    const flights = [
      flight({
        id: 1,
        code: "EARLY",
        departureTime: "2026-09-06T18:00:00.000Z",
        price: 35000,
      }),
      flight({
        id: 2,
        code: "LATE",
        departureTime: "2026-09-06T22:00:00.000Z",
        price: 35000,
      }),
    ];
    assert.deepEqual(
      sortFilterableFlights(flights, "departure-desc").map((item) => item.code),
      ["LATE", "EARLY"]
    );
  });

  const inventoryExact = [
    flight({
      id: 1,
      code: "SJ602",
      departureTime: "2026-09-06T20:55:00.000Z",
      price: 35300,
    }),
  ];
  const inventoryAlternates = [
    {
      date: "2026-09-04",
      flights: [
        flight({
          id: 2,
          code: "SJ600",
          departureTime: "2026-09-04T20:55:00.000Z",
          price: 35000,
        }),
        flight({
          id: 3,
          code: "SJ609",
          departureTime: "2026-09-04T20:44:00.000Z",
          price: 35400,
        }),
      ],
    },
    {
      date: "2026-09-12",
      flights: [
        flight({
          id: 4,
          code: "SJ605",
          departureTime: "2026-09-12T20:55:00.000Z",
          price: 35300,
        }),
      ],
    },
  ];

  it("J. Filters apply to exact-date results", () => {
    const filters: FlightResultsFilterState = {
      ...DEFAULT_FLIGHT_RESULTS_FILTERS,
      maxPriceDollars: 352,
    };
    const result = applyFlightResultsFilters(
      inventoryExact,
      inventoryAlternates,
      filters
    );
    assert.equal(result.exactCount, 0);
  });

  it("K. Filters apply to nearby results", () => {
    const filters: FlightResultsFilterState = {
      ...DEFAULT_FLIGHT_RESULTS_FILTERS,
      maxPriceDollars: 352,
    };
    const result = applyFlightResultsFilters(
      inventoryExact,
      inventoryAlternates,
      filters
    );
    assert.deepEqual(
      result.alternateGroups.flatMap((group) =>
        group.flights.map((item) => item.code)
      ),
      ["SJ600"]
    );
  });

  it("L. Nearby date grouping preserved (chronological, sort within)", () => {
    const filters: FlightResultsFilterState = {
      ...DEFAULT_FLIGHT_RESULTS_FILTERS,
      sort: "price-asc",
    };
    const result = applyFlightResultsFilters(
      inventoryExact,
      [
        {
          date: "2026-09-12",
          flights: [
            flight({
              id: 4,
              code: "SJ605",
              departureTime: "2026-09-12T20:55:00.000Z",
              price: 35300,
            }),
          ],
        },
        {
          date: "2026-09-04",
          flights: [
            flight({
              id: 3,
              code: "SJ609",
              departureTime: "2026-09-04T20:44:00.000Z",
              price: 35400,
            }),
            flight({
              id: 2,
              code: "SJ600",
              departureTime: "2026-09-04T20:55:00.000Z",
              price: 35000,
            }),
          ],
        },
      ],
      filters
    );

    assert.deepEqual(
      result.alternateGroups.map((group) => group.date),
      ["2026-09-04", "2026-09-12"]
    );
    assert.deepEqual(
      result.alternateGroups[0]?.flights.map((item) => item.code),
      ["SJ600", "SJ609"]
    );
  });

  it("M. Reset restores defaults", () => {
    assert.equal(
      isDefaultFlightResultsFilters(DEFAULT_FLIGHT_RESULTS_FILTERS),
      true
    );
    assert.equal(
      isDefaultFlightResultsFilters({
        ...DEFAULT_FLIGHT_RESULTS_FILTERS,
        maxPriceDollars: 352,
      }),
      false
    );
  });

  it("N. Filtered exact empty + nearby matches", () => {
    const result = applyFlightResultsFilters(
      inventoryExact,
      inventoryAlternates,
      {
        ...DEFAULT_FLIGHT_RESULTS_FILTERS,
        maxPriceDollars: 352,
      }
    );
    assert.equal(result.exactCount, 0);
    assert.ok(result.alternateCount > 0);
  });

  it("O. All filtered empty", () => {
    const result = applyFlightResultsFilters(
      inventoryExact,
      inventoryAlternates,
      {
        ...DEFAULT_FLIGHT_RESULTS_FILTERS,
        maxPriceDollars: 100,
      }
    );
    assert.equal(result.exactCount, 0);
    assert.equal(result.alternateCount, 0);
  });

  it("P. Round-trip outbound filter does not break return selection data", () => {
    // Filters are pure transforms of already-selected result sets.
    // Applying a tight outbound filter must not mutate the return inventory.
    const returnExact = [
      flight({
        id: 10,
        code: "SJ-RET",
        originCode: "PAP",
        departureTime: "2026-09-12T18:00:00.000Z",
        price: 36000,
      }),
    ];
    const outboundFiltered = applyFlightResultsFilters(
      inventoryExact,
      inventoryAlternates,
      {
        ...DEFAULT_FLIGHT_RESULTS_FILTERS,
        departureBand: "morning",
      }
    );
    const returnUnfiltered = applyFlightResultsFilters(
      returnExact,
      [],
      DEFAULT_FLIGHT_RESULTS_FILTERS
    );

    assert.equal(outboundFiltered.exactCount, 0);
    assert.equal(returnUnfiltered.exactCount, 1);
    assert.equal(returnUnfiltered.exactFlights[0]?.code, "SJ-RET");
  });
});
