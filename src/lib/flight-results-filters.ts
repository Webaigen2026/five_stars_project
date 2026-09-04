import {
  getAirportTimeZone,
  wallClockPartsInTimeZone,
} from "./airport-timezones";

export type DepartureTimeBand =
  | "any"
  | "overnight"
  | "morning"
  | "afternoon"
  | "evening";

export type StopsFilter = "any" | "nonstop";

export type FlightResultsSort =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "departure-asc"
  | "departure-desc";

export type FlightResultsFilterState = {
  departureBand: DepartureTimeBand;
  /** Max price in USD dollars; null = no cap. Compared to price/100. */
  maxPriceDollars: number | null;
  stops: StopsFilter;
  sort: FlightResultsSort;
};

export const DEFAULT_FLIGHT_RESULTS_FILTERS: FlightResultsFilterState = {
  departureBand: "any",
  maxPriceDollars: null,
  stops: "nonstop",
  sort: "recommended",
};

export type FilterableResultFlight = {
  id: number;
  code: string;
  originCode: string;
  departureTime: string;
  /** Per-passenger fare in cents. */
  price: number;
  /** Future connecting support; omit or 0 = nonstop. */
  stops?: number;
};

/**
 * Minutes from local midnight using the flight origin airport timezone.
 */
export function originLocalDepartureMinutes(flight: {
  departureTime: string;
  originCode: string;
}) {
  const parts = wallClockPartsInTimeZone(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
  return parts.hour * 60 + parts.minute;
}

/**
 * Classify origin-local departure into a time-of-day band.
 *
 * - Overnight: 12:00 AM–4:59 AM
 * - Morning: 5:00 AM–11:59 AM
 * - Afternoon: 12:00 PM–4:59 PM
 * - Evening: 5:00 PM–11:59 PM
 */
export function classifyDepartureTimeBand(flight: {
  departureTime: string;
  originCode: string;
}): Exclude<DepartureTimeBand, "any"> {
  const minutes = originLocalDepartureMinutes(flight);

  if (minutes < 5 * 60) {
    return "overnight";
  }
  if (minutes < 12 * 60) {
    return "morning";
  }
  if (minutes < 17 * 60) {
    return "afternoon";
  }
  return "evening";
}

export function flightStopsCategory(flight: { stops?: number }) {
  return (flight.stops ?? 0) > 0 ? ("connecting" as const) : ("nonstop" as const);
}

export function matchesDepartureBand(
  flight: FilterableResultFlight,
  band: DepartureTimeBand
) {
  if (band === "any") {
    return true;
  }
  return classifyDepartureTimeBand(flight) === band;
}

/**
 * `maxPriceDollars` is whole/fractional USD; flight.price is cents.
 */
export function matchesMaxPrice(
  flight: FilterableResultFlight,
  maxPriceDollars: number | null
) {
  if (maxPriceDollars == null || !Number.isFinite(maxPriceDollars)) {
    return true;
  }
  const maxCents = Math.round(maxPriceDollars * 100);
  return flight.price <= maxCents;
}

export function matchesStopsFilter(
  flight: FilterableResultFlight,
  stops: StopsFilter
) {
  if (stops === "any") {
    return true;
  }
  return flightStopsCategory(flight) === "nonstop";
}

export function matchesFlightResultsFilters(
  flight: FilterableResultFlight,
  filters: FlightResultsFilterState
) {
  return (
    matchesDepartureBand(flight, filters.departureBand) &&
    matchesMaxPrice(flight, filters.maxPriceDollars) &&
    matchesStopsFilter(flight, filters.stops)
  );
}

export function isDefaultFlightResultsFilters(
  filters: FlightResultsFilterState
) {
  return (
    filters.departureBand === DEFAULT_FLIGHT_RESULTS_FILTERS.departureBand &&
    filters.maxPriceDollars === DEFAULT_FLIGHT_RESULTS_FILTERS.maxPriceDollars &&
    filters.stops === DEFAULT_FLIGHT_RESULTS_FILTERS.stops &&
    filters.sort === DEFAULT_FLIGHT_RESULTS_FILTERS.sort
  );
}

export function sortFilterableFlights<T extends FilterableResultFlight>(
  flights: T[],
  sort: FlightResultsSort
): T[] {
  if (sort === "recommended") {
    return [...flights];
  }

  return [...flights].sort((left, right) => {
    switch (sort) {
      case "price-asc":
        return left.price - right.price || left.id - right.id;
      case "price-desc":
        return right.price - left.price || left.id - right.id;
      case "departure-asc":
        return (
          left.departureTime.localeCompare(right.departureTime) ||
          left.id - right.id
        );
      case "departure-desc":
        return (
          right.departureTime.localeCompare(left.departureTime) ||
          left.id - right.id
        );
      default:
        return 0;
    }
  });
}

export type AlternateDateGroup<T extends FilterableResultFlight> = {
  date: string;
  flights: T[];
};

/**
 * Apply filters + sort to exact-date list and nearby date groups.
 * Date groups stay chronological; sort applies within each group.
 */
export function applyFlightResultsFilters<T extends FilterableResultFlight>(
  exactFlights: T[],
  alternateGroups: AlternateDateGroup<T>[],
  filters: FlightResultsFilterState
) {
  const filteredExact = sortFilterableFlights(
    exactFlights.filter((flight) =>
      matchesFlightResultsFilters(flight, filters)
    ),
    filters.sort
  );

  const filteredAlternateGroups = alternateGroups
    .map((group) => ({
      date: group.date,
      flights: sortFilterableFlights(
        group.flights.filter((flight) =>
          matchesFlightResultsFilters(flight, filters)
        ),
        filters.sort
      ),
    }))
    .filter((group) => group.flights.length > 0)
    // Preserve chronological date order even if callers pass unsorted groups.
    .sort((left, right) => left.date.localeCompare(right.date));

  return {
    exactFlights: filteredExact,
    alternateGroups: filteredAlternateGroups,
    exactCount: filteredExact.length,
    alternateCount: filteredAlternateGroups.reduce(
      (sum, group) => sum + group.flights.length,
      0
    ),
  };
}

export function parseMaxPriceDollarsInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed.replace(/^\$/, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}
