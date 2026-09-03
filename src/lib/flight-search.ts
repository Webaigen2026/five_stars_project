import {
  formatAirportLabelFromCode,
  getAirportByCode,
  normalizeAirportCode,
} from "../data/airports";

export type FlightSearchValues = {
  from: string;
  to: string;
  departure: string;
  passengers: string;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateFlightSearch(input: FlightSearchValues) {
  const from = normalizeAirportCode(input.from);
  const to = normalizeAirportCode(input.to);
  const departure = input.departure.trim();
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

  if (!Number.isInteger(passengers) || passengers < 1) {
    return "At least 1 passenger is required.";
  }

  return null;
}

export function buildFlightSearchParams(input: FlightSearchValues) {
  const params = new URLSearchParams();
  params.set("from", normalizeAirportCode(input.from));
  params.set("to", normalizeAirportCode(input.to));
  params.set("departure", input.departure.trim());
  params.set("passengers", String(Number.parseInt(input.passengers, 10) || 1));
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
  from?: string;
  to?: string;
  departure?: string;
  passengers?: string;
}) {
  const params = new URLSearchParams();

  if (input.from) {
    params.set("from", input.from);
  }

  if (input.to) {
    params.set("to", input.to);
  }

  if (input.departure) {
    params.set("departure", input.departure);
  }

  params.set("passengers", input.passengers || "1");

  return `/flights?${params.toString()}`;
}
