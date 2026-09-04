import {
  flightReversesRoute,
  formatAirportLabelFromCode,
  getAirportByCode,
  normalizeAirportCode,
} from "../data/airports";
import { calendarDateInTimeZone, getAirportTimeZone } from "./airport-timezones";
import {
  formatCalendarDateOnly,
  parseCalendarDateOnly,
} from "./passenger-age";
import {
  appendPassengerCompositionParams,
  normalizePassengerComposition,
  serializePassengerComposition,
  totalPassengers,
  type PassengerComposition,
  type PassengerCompositionParamInput,
} from "./passenger-composition";

export type TripType = "one-way" | "round-trip";

/** Nearby discovery window: ±N calendar days around the requested date. */
export const NEARBY_DATE_WINDOW_DAYS = 7;

export type FlightSearchValues = {
  tripType?: TripType;
  from: string;
  to: string;
  departure: string;
  returnDate?: string;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  /** Preferred when building from the picker; overrides category string fields. */
  composition?: PassengerComposition;
};

export type FlightSearchLegFilter = {
  from: string;
  to: string;
  departure: string;
  passengers: string;
  /** When true, require availableSeats >= passengers. Customer search always passes true. */
  requireSeats?: boolean;
};

export type SearchableFlight = {
  id: number;
  code: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  status: string;
  availableSeats: number;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseTripType(value: string | null | undefined): TripType {
  return value === "round-trip" ? "round-trip" : "one-way";
}

export function parsePositiveIntParam(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isValidCalendarDate(value: string) {
  return DATE_ONLY_PATTERN.test(value.trim());
}

/**
 * Lexicographic compare for YYYY-MM-DD calendar dates (timezone-safe).
 */
export function compareCalendarDates(left: string, right: string) {
  return left.trim().localeCompare(right.trim());
}

export function validateFlightSearch(input: FlightSearchValues) {
  const tripType = parseTripType(input.tripType);
  const from = normalizeAirportCode(input.from);
  const to = normalizeAirportCode(input.to);
  const departure = input.departure.trim();
  const returnDate = (input.returnDate ?? "").trim();
  const passengers = Number.parseInt(input.passengers, 10);

  if (!from) {
    return "Departure airport is required.";
  }

  if (!to) {
    return "Destination airport is required.";
  }

  if (!getAirportByCode(from)) {
    return "Select a valid departure airport.";
  }

  if (!getAirportByCode(to)) {
    return "Select a valid destination airport.";
  }

  if (from === to) {
    return "Departure and destination airports must be different.";
  }

  if (!departure) {
    return "Departure date is required.";
  }

  if (!DATE_ONLY_PATTERN.test(departure)) {
    return "Departure date is invalid.";
  }

  if (tripType === "round-trip") {
    if (!returnDate) {
      return "Return date is required.";
    }

    if (!DATE_ONLY_PATTERN.test(returnDate)) {
      return "Return date is invalid.";
    }

    if (compareCalendarDates(returnDate, departure) < 0) {
      return "Return date cannot be before departure date.";
    }
  }

  if (!Number.isInteger(passengers) || passengers < 1) {
    return "At least 1 passenger is required.";
  }

  if (passengers > 9) {
    return "A search can include at most 9 travelers.";
  }

  return null;
}

function resolveSearchComposition(input: {
  passengers?: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
}): PassengerComposition {
  if (input.composition) {
    return normalizePassengerComposition({
      passengers: totalPassengers(input.composition),
      adults: input.composition.adults,
      seniors: input.composition.seniors,
      children: input.composition.children,
      infants: input.composition.infantsInSeat,
    });
  }

  return normalizePassengerComposition({
    passengers: input.passengers,
    adults: input.adults,
    seniors: input.seniors,
    children: input.children,
    infants: input.infants,
  });
}

export function buildFlightSearchParams(input: FlightSearchValues) {
  const tripType = parseTripType(input.tripType);
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);

  params.set("from", normalizeAirportCode(input.from));
  params.set("to", normalizeAirportCode(input.to));
  params.set("departure", input.departure.trim());
  appendPassengerCompositionParams(params, composition);

  // Keep one-way URLs backward compatible (no tripType param).
  if (tripType === "round-trip") {
    params.set("tripType", "round-trip");
    params.set("returnDate", (input.returnDate ?? "").trim());
  }

  return params;
}

export function formatSearchDate(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Weekday + long month for discovery section headings (calendar-date only). */
export function formatSearchDateLong(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatAroundDateEmptyMessage(input: {
  from: string;
  to: string;
}) {
  const fromLabel = formatAirportLabelFromCode(input.from) || "your departure";
  const toLabel = formatAirportLabelFromCode(input.to) || "your destination";
  return `No flights are available for this route around your selected date (${fromLabel} → ${toLabel}).`;
}

export function formatEmptyFlightSearchMessage(input: {
  from: string;
  to: string;
  departure: string;
}) {
  const fromLabel = formatAirportLabelFromCode(input.from) || "your departure";
  const toLabel = formatAirportLabelFromCode(input.to) || "your destination";
  const dateLabel = input.departure
    ? ` on ${formatSearchDate(input.departure)}`
    : "";

  return `No flights found from ${fromLabel} to ${toLabel}${dateLabel}.`;
}

export function isKnownAirportCode(code: string) {
  return Boolean(getAirportByCode(code));
}

export function buildModifySearchHref(input: {
  tripType?: TripType | string;
  from?: string;
  to?: string;
  departure?: string;
  returnDate?: string;
  passengers?: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
}) {
  const params = new URLSearchParams();
  const tripType = parseTripType(input.tripType);
  const composition = resolveSearchComposition(input);

  if (input.from) {
    params.set("from", input.from);
  }

  if (input.to) {
    params.set("to", input.to);
  }

  if (input.departure) {
    params.set("departure", input.departure);
  }

  appendPassengerCompositionParams(params, composition);

  if (tripType === "round-trip") {
    params.set("tripType", "round-trip");
    if (input.returnDate) {
      params.set("returnDate", input.returnDate);
    }
  }

  return `/flights?${params.toString()}`;
}

export function buildRoundTripResultsHref(input: {
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
  outboundFlightId?: number | null;
  outboundFareFamily?: string | null;
}) {
  const params = buildFlightSearchParams({
    tripType: "round-trip",
    from: input.from,
    to: input.to,
    departure: input.departure,
    returnDate: input.returnDate,
    passengers: input.passengers,
    adults: input.adults,
    seniors: input.seniors,
    children: input.children,
    infants: input.infants,
    composition: input.composition,
  });

  if (input.outboundFlightId != null) {
    params.set("outboundFlightId", String(input.outboundFlightId));
  }

  if (input.outboundFareFamily) {
    params.set("outboundFareFamily", input.outboundFareFamily);
  }

  return `/flights/results?${params.toString()}`;
}

export function buildRoundTripPassengersHref(input: {
  outboundFlightId: number;
  returnFlightId: number;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
  outboundFareFamily?: string;
  returnFareFamily?: string;
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("tripType", "round-trip");
  params.set("outboundFlightId", String(input.outboundFlightId));
  params.set("returnFlightId", String(input.returnFlightId));
  appendPassengerCompositionParams(params, composition);
  if (input.outboundFareFamily) {
    params.set("outboundFareFamily", input.outboundFareFamily);
  }
  if (input.returnFareFamily) {
    params.set("returnFareFamily", input.returnFareFamily);
  }
  return `/passengers?${params.toString()}`;
}

export function buildOneWayPassengersHref(input: {
  flightCode: string;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
  fareFamily?: string;
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("flight", input.flightCode);
  appendPassengerCompositionParams(params, composition);
  if (input.fareFamily) {
    params.set("fareFamily", input.fareFamily);
  }
  return `/passengers?${params.toString()}`;
}

/** One-way: results → fare selection. */
export function buildOneWayFareHref(input: {
  flightCode: string;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("flight", input.flightCode);
  appendPassengerCompositionParams(params, composition);
  return `/fare?${params.toString()}`;
}

/**
 * Build the post-fare navigation target for results modal selection.
 * Client-safe; used by FlightResultsBoard and unit tests.
 */
export function buildFareContinueHref(input: {
  mode: "one-way" | "round-trip-outbound" | "round-trip-return";
  fareFamily: string;
  flightCode: string;
  flightId: number;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  from?: string;
  to?: string;
  departure?: string;
  returnDate?: string;
  outboundFlightId?: number;
  outboundFareFamily?: string;
}) {
  const compositionFields = {
    passengers: input.passengers,
    adults: input.adults,
    seniors: input.seniors,
    children: input.children,
    infants: input.infants,
  };

  if (input.mode === "one-way") {
    return buildOneWayPassengersHref({
      flightCode: input.flightCode,
      fareFamily: input.fareFamily,
      ...compositionFields,
    });
  }

  if (input.mode === "round-trip-outbound") {
    return buildRoundTripResultsHref({
      from: input.from ?? "",
      to: input.to ?? "",
      departure: input.departure ?? "",
      returnDate: input.returnDate ?? "",
      outboundFlightId: input.flightId,
      outboundFareFamily: input.fareFamily,
      ...compositionFields,
    });
  }

  return buildRoundTripPassengersHref({
    outboundFlightId: input.outboundFlightId ?? 0,
    returnFlightId: input.flightId,
    outboundFareFamily: input.outboundFareFamily ?? "BASIC",
    returnFareFamily: input.fareFamily,
    ...compositionFields,
  });
}

/** Round-trip outbound fare after selecting a flight (deep-link fallback). */
export function buildRoundTripOutboundFareHref(input: {
  flightId: number;
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("tripType", "round-trip");
  params.set("leg", "outbound");
  params.set("flightId", String(input.flightId));
  params.set("from", input.from);
  params.set("to", input.to);
  params.set("departure", input.departure);
  params.set("returnDate", input.returnDate);
  appendPassengerCompositionParams(params, composition);
  return `/fare?${params.toString()}`;
}

/** Round-trip return fare after selecting return flight. */
export function buildRoundTripReturnFareHref(input: {
  returnFlightId: number;
  outboundFlightId: number;
  outboundFareFamily: string;
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  passengers: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  composition?: PassengerComposition;
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("tripType", "round-trip");
  params.set("leg", "return");
  params.set("flightId", String(input.returnFlightId));
  params.set("outboundFlightId", String(input.outboundFlightId));
  params.set("outboundFareFamily", input.outboundFareFamily);
  params.set("from", input.from);
  params.set("to", input.to);
  params.set("departure", input.departure);
  params.set("returnDate", input.returnDate);
  appendPassengerCompositionParams(params, composition);
  return `/fare?${params.toString()}`;
}

export function compositionParamsFromSearch(
  input: PassengerCompositionParamInput
) {
  return serializePassengerComposition(normalizePassengerComposition(input));
}

/**
 * Existing one-way matching: city/code includes, SCHEDULED, origin-local calendar day.
 */
export function matchesFlightLeg(
  flight: SearchableFlight,
  filter: FlightSearchLegFilter
) {
  const fromQuery = filter.from.toLowerCase().trim();
  const toQuery = filter.to.toLowerCase().trim();
  const departure = filter.departure.trim();
  const passengers = Number.parseInt(filter.passengers, 10);
  const passengerCount =
    Number.isInteger(passengers) && passengers > 0 ? passengers : 1;

  const matchesOrigin =
    !fromQuery ||
    flight.origin.toLowerCase().includes(fromQuery) ||
    flight.originCode.toLowerCase().includes(fromQuery);

  const matchesDestination =
    !toQuery ||
    flight.destination.toLowerCase().includes(toQuery) ||
    flight.destinationCode.toLowerCase().includes(toQuery);

  const matchesStatus = flight.status === "SCHEDULED";

  const matchesDeparture =
    !departure ||
    calendarDateInTimeZone(
      flight.departureTime,
      getAirportTimeZone(flight.originCode)
    ) === departure;

  const matchesSeats =
    !filter.requireSeats || flight.availableSeats >= passengerCount;

  return (
    matchesOrigin &&
    matchesDestination &&
    matchesStatus &&
    matchesDeparture &&
    matchesSeats
  );
}

export function filterFlightsForLeg<T extends SearchableFlight>(
  flights: T[],
  filter: FlightSearchLegFilter
) {
  return flights.filter((flight) => matchesFlightLeg(flight, filter));
}

/**
 * Server-side check that a selected outbound flight still matches the search.
 * Exact requested date OR nearby (±NEARBY_DATE_WINDOW_DAYS) origin-local dates
 * are accepted so alternate discovery selections remain valid.
 */
export function isValidOutboundSelection(
  flight: SearchableFlight | null | undefined,
  filter: FlightSearchLegFilter
) {
  if (!flight) {
    return false;
  }

  return matchesFlightLegInNearbyWindow(flight, {
    ...filter,
    requireSeats: true,
    windowDays: NEARBY_DATE_WINDOW_DAYS,
  });
}

/**
 * Server-side check that return flight reverses the outbound route and is saleable.
 * Does not re-check search calendar dates (those were enforced on results).
 */
export function isValidRoundTripPair(
  outbound: SearchableFlight | null | undefined,
  returnFlight: SearchableFlight | null | undefined,
  passengers: string
) {
  if (!outbound || !returnFlight) {
    return false;
  }

  if (outbound.id === returnFlight.id) {
    return false;
  }

  const passengerCount = Number.parseInt(passengers, 10);
  const count =
    Number.isInteger(passengerCount) && passengerCount > 0 ? passengerCount : 1;

  const outboundWithArrival = outbound as SearchableFlight & {
    arrivalTime?: string;
  };

  return (
    outbound.status === "SCHEDULED" &&
    returnFlight.status === "SCHEDULED" &&
    outbound.availableSeats >= count &&
    returnFlight.availableSeats >= count &&
    flightReversesRoute(outbound, returnFlight) &&
    returnFlightDepartsAfterOutbound(outboundWithArrival, returnFlight)
  );
}

export function flightOriginLocalDate(flight: SearchableFlight) {
  return calendarDateInTimeZone(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
}

/**
 * Shift a YYYY-MM-DD calendar date by whole days using UTC date arithmetic
 * (no browser/server timezone drift).
 */
export function shiftCalendarDate(date: string, deltaDays: number) {
  const parts = parseCalendarDateOnly(date);
  if (!parts) {
    return date;
  }

  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + deltaDays));
  return formatCalendarDateOnly({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

export function isCalendarDateWithinNearbyWindow(
  candidateDate: string,
  centerDate: string,
  windowDays = NEARBY_DATE_WINDOW_DAYS
) {
  if (!isValidCalendarDate(candidateDate) || !isValidCalendarDate(centerDate)) {
    return false;
  }

  const start = shiftCalendarDate(centerDate, -windowDays);
  const end = shiftCalendarDate(centerDate, windowDays);
  return (
    compareCalendarDates(candidateDate, start) >= 0 &&
    compareCalendarDates(candidateDate, end) <= 0
  );
}

function passengerCountFromFilter(filter: FlightSearchLegFilter) {
  const passengers = Number.parseInt(filter.passengers, 10);
  return Number.isInteger(passengers) && passengers > 0 ? passengers : 1;
}

/**
 * Route + status (+ optional seats) without pinning an exact calendar day.
 */
export function matchesFlightRouteAvailability(
  flight: SearchableFlight,
  filter: FlightSearchLegFilter
) {
  const fromQuery = filter.from.toLowerCase().trim();
  const toQuery = filter.to.toLowerCase().trim();
  const passengerCount = passengerCountFromFilter(filter);

  const matchesOrigin =
    !fromQuery ||
    flight.origin.toLowerCase().includes(fromQuery) ||
    flight.originCode.toLowerCase().includes(fromQuery);

  const matchesDestination =
    !toQuery ||
    flight.destination.toLowerCase().includes(toQuery) ||
    flight.destinationCode.toLowerCase().includes(toQuery);

  const matchesStatus = flight.status === "SCHEDULED";
  const matchesSeats =
    !filter.requireSeats || flight.availableSeats >= passengerCount;

  return matchesOrigin && matchesDestination && matchesStatus && matchesSeats;
}

export function matchesFlightLegInNearbyWindow(
  flight: SearchableFlight,
  filter: FlightSearchLegFilter & { windowDays?: number }
) {
  if (!matchesFlightRouteAvailability(flight, filter)) {
    return false;
  }

  const departure = filter.departure.trim();
  if (!departure) {
    return true;
  }

  const localDate = flightOriginLocalDate(flight);
  return isCalendarDateWithinNearbyWindow(
    localDate,
    departure,
    filter.windowDays ?? NEARBY_DATE_WINDOW_DAYS
  );
}

export function sortFlightsByDepartureTime<T extends SearchableFlight>(
  flights: T[]
) {
  return [...flights].sort((left, right) =>
    left.departureTime.localeCompare(right.departureTime)
  );
}

export type AlternateFlightDateGroup<T extends SearchableFlight> = {
  date: string;
  flights: T[];
};

export type FlightDiscoveryPartition<T extends SearchableFlight> = {
  exactDateFlights: T[];
  alternateFlights: T[];
  alternateGroups: AlternateFlightDateGroup<T>[];
};

/**
 * Partition a route inventory into exact-date primary results and nearby
 * alternate dates (±windowDays), excluding the requested calendar day from
 * alternates. Classification uses origin-local calendar dates.
 */
export function partitionFlightsForDiscovery<T extends SearchableFlight>(
  flights: T[],
  filter: FlightSearchLegFilter & { windowDays?: number }
): FlightDiscoveryPartition<T> {
  const windowDays = filter.windowDays ?? NEARBY_DATE_WINDOW_DAYS;
  const requestedDate = filter.departure.trim();
  const exactDateFlights = sortFlightsByDepartureTime(
    filterFlightsForLeg(flights, filter)
  );

  const alternateFlights = sortFlightsByDepartureTime(
    flights.filter((flight) => {
      if (!matchesFlightRouteAvailability(flight, filter)) {
        return false;
      }

      if (!requestedDate) {
        return false;
      }

      const localDate = flightOriginLocalDate(flight);
      if (localDate === requestedDate) {
        return false;
      }

      return isCalendarDateWithinNearbyWindow(
        localDate,
        requestedDate,
        windowDays
      );
    })
  );

  const groupMap = new Map<string, T[]>();
  for (const flight of alternateFlights) {
    const date = flightOriginLocalDate(flight);
    const bucket = groupMap.get(date) ?? [];
    bucket.push(flight);
    groupMap.set(date, bucket);
  }

  const alternateGroups = [...groupMap.entries()]
    .sort(([left], [right]) => compareCalendarDates(left, right))
    .map(([date, groupFlights]) => ({
      date,
      flights: sortFlightsByDepartureTime(groupFlights),
    }));

  return {
    exactDateFlights,
    alternateFlights,
    alternateGroups,
  };
}

/**
 * Whether a requested return calendar date remains chronologically valid
 * after an outbound flight (possibly an alternate date) is selected.
 */
export function isReturnSearchDateValidForOutbound(
  outbound: SearchableFlight,
  returnDate: string
) {
  if (!isValidCalendarDate(returnDate)) {
    return false;
  }

  const outboundDate = flightOriginLocalDate(outbound);
  return compareCalendarDates(returnDate, outboundDate) >= 0;
}

/**
 * Return candidates must reverse the route and depart after outbound arrival.
 */
export function returnFlightDepartsAfterOutbound(
  outbound: SearchableFlight & { arrivalTime?: string },
  returnFlight: SearchableFlight
) {
  const outboundEnd = new Date(
    outbound.arrivalTime ?? outbound.departureTime
  ).getTime();
  const returnStart = new Date(returnFlight.departureTime).getTime();

  return (
    Number.isFinite(outboundEnd) &&
    Number.isFinite(returnStart) &&
    returnStart > outboundEnd
  );
}

export function partitionReturnFlightsForDiscovery<
  T extends SearchableFlight & { arrivalTime?: string },
>(
  flights: T[],
  outbound: T,
  filter: FlightSearchLegFilter & { windowDays?: number }
): FlightDiscoveryPartition<T> {
  const chronological = flights.filter((flight) =>
    returnFlightDepartsAfterOutbound(outbound, flight)
  );

  return partitionFlightsForDiscovery(chronological, filter);
}
