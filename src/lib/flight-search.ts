import {
  formatAirportLabelFromCode,
  getAirportByCode,
  normalizeAirportCode,
} from "../data/airports";
import { calendarDateInTimeZone, getAirportTimeZone } from "./airport-timezones";
import {
  appendPassengerCompositionParams,
  normalizePassengerComposition,
  serializePassengerComposition,
  totalPassengers,
  type PassengerComposition,
  type PassengerCompositionParamInput,
} from "./passenger-composition";

export type TripType = "one-way" | "round-trip";

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
  /** When true, require availableSeats >= passengers. Default false for one-way parity. */
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
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("tripType", "round-trip");
  params.set("outboundFlightId", String(input.outboundFlightId));
  params.set("returnFlightId", String(input.returnFlightId));
  appendPassengerCompositionParams(params, composition);
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
}) {
  const params = new URLSearchParams();
  const composition = resolveSearchComposition(input);
  params.set("flight", input.flightCode);
  appendPassengerCompositionParams(params, composition);
  return `/passengers?${params.toString()}`;
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
 */
export function isValidOutboundSelection(
  flight: SearchableFlight | null | undefined,
  filter: FlightSearchLegFilter
) {
  if (!flight) {
    return false;
  }

  return matchesFlightLeg(flight, { ...filter, requireSeats: true });
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

  return (
    outbound.status === "SCHEDULED" &&
    returnFlight.status === "SCHEDULED" &&
    outbound.availableSeats >= count &&
    returnFlight.availableSeats >= count &&
    returnFlight.originCode === outbound.destinationCode &&
    returnFlight.destinationCode === outbound.originCode
  );
}
