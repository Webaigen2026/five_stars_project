/**
 * Shared presentation helpers for booking / trip surfaces.
 * Display only — no business logic or status mutations.
 *
 * Flight times must always be formatted with an explicit IANA timezone
 * (origin for departure, destination for arrival). Never rely on the
 * runtime/browser default timezone.
 */

import {
  calendarDateInTimeZone,
  getAirportTimeZone,
} from "./airport-timezones";

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTripDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

export function formatTripDateShort(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

export function formatTripTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(value));
}

export function formatTripDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export function formatRoute(originCode: string, destinationCode: string) {
  return `${originCode} → ${destinationCode}`;
}

export type FlightTimeFields = {
  departureTime: string;
  arrivalTime: string;
  originCode: string;
  destinationCode: string;
};

export function formatDepartureTime(flight: Pick<FlightTimeFields, "departureTime" | "originCode">) {
  return formatTripTime(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
}

export function formatArrivalTime(
  flight: Pick<FlightTimeFields, "arrivalTime" | "destinationCode">
) {
  return formatTripTime(
    flight.arrivalTime,
    getAirportTimeZone(flight.destinationCode)
  );
}

export function formatDepartureDate(
  flight: Pick<FlightTimeFields, "departureTime" | "originCode">
) {
  return formatTripDate(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
}

export function formatArrivalDate(
  flight: Pick<FlightTimeFields, "arrivalTime" | "destinationCode">
) {
  return formatTripDate(
    flight.arrivalTime,
    getAirportTimeZone(flight.destinationCode)
  );
}

export function formatDepartureDateShort(
  flight: Pick<FlightTimeFields, "departureTime" | "originCode">
) {
  return formatTripDateShort(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
}

export function formatArrivalDateShort(
  flight: Pick<FlightTimeFields, "arrivalTime" | "destinationCode">
) {
  return formatTripDateShort(
    flight.arrivalTime,
    getAirportTimeZone(flight.destinationCode)
  );
}

export function formatDepartureDateTime(
  flight: Pick<FlightTimeFields, "departureTime" | "originCode">
) {
  return formatTripDateTime(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
}

export function formatArrivalDateTime(
  flight: Pick<FlightTimeFields, "arrivalTime" | "destinationCode">
) {
  return formatTripDateTime(
    flight.arrivalTime,
    getAirportTimeZone(flight.destinationCode)
  );
}

/**
 * Compare calendar days using explicit timezones (not runtime local TZ).
 */
export function isSameCalendarDay(
  left: string,
  right: string,
  leftTimeZone: string,
  rightTimeZone: string
) {
  return (
    calendarDateInTimeZone(left, leftTimeZone) ===
    calendarDateInTimeZone(right, rightTimeZone)
  );
}

export function isOvernightFlight(flight: FlightTimeFields) {
  return !isSameCalendarDay(
    flight.departureTime,
    flight.arrivalTime,
    getAirportTimeZone(flight.originCode),
    getAirportTimeZone(flight.destinationCode)
  );
}

const TERMINAL_PAST_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

/**
 * Presentation-only grouping. Does not mutate booking state.
 * Instant comparison is timezone-independent.
 */
export function isUpcomingTrip({
  status,
  departureTime,
  now = new Date(),
}: {
  status: string;
  departureTime: string | null | undefined;
  now?: Date;
}) {
  if (TERMINAL_PAST_STATUSES.has(status)) {
    return false;
  }

  if (!departureTime) {
    return true;
  }

  return new Date(departureTime).getTime() >= now.getTime();
}
