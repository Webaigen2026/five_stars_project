import {
  isCanonicalAdminAircraft,
} from "./aircraft-config";
import { elapsedDurationMinutes } from "./airport-timezones";
import { isSeatSelectionAvailable } from "./seat-layouts";

export type ParseFlightWriteOptions = {
  mode: "create" | "edit";
  /**
   * Existing persisted aircraft on edit. Used to preserve unsupported legacy
   * values when the admin does not intentionally change Aircraft.
   */
  existingAircraft?: string | null;
};

export const FLIGHT_STATUSES = [
  "SCHEDULED",
  "BOARDING",
  "DEPARTED",
  "ARRIVED",
  "CANCELLED",
] as const;

export type FlightStatus = (typeof FLIGHT_STATUSES)[number];

export type SafeFlight = {
  id: number;
  code: string;
  airline: string;
  aircraft: string | null;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  totalSeats: number;
  availableSeats: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type FlightWriteInput = {
  code: string;
  airline: string;
  aircraft: string | null;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  totalSeats: number;
  availableSeats: number;
  status: FlightStatus;
};

export class AdminFlightRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function isFlightStatus(value: string): value is FlightStatus {
  return (FLIGHT_STATUSES as readonly string[]).includes(value);
}

export function toSafeFlight(flight: SafeFlight): SafeFlight {
  return {
    id: flight.id,
    code: flight.code,
    airline: flight.airline,
    aircraft: flight.aircraft,
    origin: flight.origin,
    originCode: flight.originCode,
    destination: flight.destination,
    destinationCode: flight.destinationCode,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    durationMinutes: flight.durationMinutes,
    price: flight.price,
    totalSeats: flight.totalSeats,
    availableSeats: flight.availableSeats,
    status: flight.status,
    createdAt: flight.createdAt,
    updatedAt: flight.updatedAt,
  };
}

export function isUniqueViolation(error: unknown) {
  let current: unknown = error;

  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || typeof current !== "object") {
      return false;
    }

    const sqlState =
      "sqlState" in current && typeof current.sqlState === "string"
        ? current.sqlState
        : undefined;

    if (sqlState === "23505") {
      return true;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asInteger(value: unknown, field: string) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  throw new AdminFlightRequestError(`${field} must be an integer.`, 400);
}

function asTimestamptzString(value: unknown, field: string) {
  const raw = asTrimmedString(value);

  if (!raw) {
    throw new AdminFlightRequestError(`${field} is required.`, 400);
  }

  if (Number.isNaN(new Date(raw).getTime())) {
    throw new AdminFlightRequestError(`${field} must be a valid date and time.`, 400);
  }

  return raw;
}

/**
 * Resolve aircraft for Admin create/edit writes.
 * Create: required canonical option only.
 * Edit: canonical options accepted; unsupported legacy preserved only when
 * the submitted value exactly matches the existing persisted aircraft.
 */
export function resolveAircraftForAdminWrite(input: {
  mode: "create" | "edit";
  submittedAircraft: unknown;
  existingAircraft?: string | null;
}): string | null {
  const submitted = asTrimmedString(input.submittedAircraft);
  const existing =
    typeof input.existingAircraft === "string"
      ? input.existingAircraft.trim()
      : input.existingAircraft === null || input.existingAircraft === undefined
        ? ""
        : "";

  if (input.mode === "create") {
    if (!submitted) {
      throw new AdminFlightRequestError("Aircraft is required.", 400);
    }
    if (!isCanonicalAdminAircraft(submitted)) {
      throw new AdminFlightRequestError(
        "Select a supported aircraft from the list.",
        400
      );
    }
    return submitted;
  }

  // Edit: empty submission preserves existing (including null).
  if (!submitted) {
    return input.existingAircraft ?? null;
  }

  if (isCanonicalAdminAircraft(submitted)) {
    return submitted;
  }

  // Preserve exact unsupported legacy value when unchanged.
  if (
    existing !== "" &&
    submitted === existing &&
    !isSeatSelectionAvailable(existing)
  ) {
    return input.existingAircraft ?? submitted;
  }

  // Supported legacy aliases (e.g. "A320") may be preserved as-is when
  // the admin did not change aircraft via the controlled selector.
  // Prefer canonicalization only when the form submits a canonical option.
  if (
    existing !== "" &&
    submitted === existing &&
    isSeatSelectionAvailable(existing)
  ) {
    return input.existingAircraft ?? submitted;
  }

  throw new AdminFlightRequestError(
    "Select a supported aircraft from the list, or keep the current aircraft value.",
    400
  );
}

export function parseFlightWriteInput(
  body: unknown,
  options: ParseFlightWriteOptions = { mode: "create" }
): FlightWriteInput {
  if (!body || typeof body !== "object") {
    throw new AdminFlightRequestError("Invalid flight payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const code = asTrimmedString(payload.code).toUpperCase();
  const airline = asTrimmedString(payload.airline);
  const aircraftValue = resolveAircraftForAdminWrite({
    mode: options.mode,
    submittedAircraft: payload.aircraft,
    existingAircraft: options.existingAircraft,
  });
  const origin = asTrimmedString(payload.origin);
  const originCode = asTrimmedString(payload.originCode).toUpperCase();
  const destination = asTrimmedString(payload.destination);
  const destinationCode = asTrimmedString(payload.destinationCode).toUpperCase();
  const departureTime = asTimestamptzString(
    payload.departureTime,
    "Departure time"
  );
  const arrivalTime = asTimestamptzString(payload.arrivalTime, "Arrival time");
  const price = asInteger(payload.price, "Price");
  const totalSeats = asInteger(payload.totalSeats, "Total seats");
  const availableSeats = asInteger(payload.availableSeats, "Available seats");
  const status = asTrimmedString(payload.status).toUpperCase();

  const computedDuration = elapsedDurationMinutes(departureTime, arrivalTime);

  if (computedDuration == null) {
    throw new AdminFlightRequestError(
      "Arrival must be after departure (using airport-local times converted to UTC).",
      400
    );
  }

  // Prefer timestamp-derived duration over a conflicting manual value.
  const durationMinutes = computedDuration;

  if (!code) {
    throw new AdminFlightRequestError("Flight code is required.", 400);
  }

  if (!airline) {
    throw new AdminFlightRequestError("Airline is required.", 400);
  }

  if (!origin) {
    throw new AdminFlightRequestError("Origin is required.", 400);
  }

  if (!originCode) {
    throw new AdminFlightRequestError("Origin code is required.", 400);
  }

  if (!destination) {
    throw new AdminFlightRequestError("Destination is required.", 400);
  }

  if (!destinationCode) {
    throw new AdminFlightRequestError("Destination code is required.", 400);
  }

  if (durationMinutes <= 0) {
    throw new AdminFlightRequestError("Duration must be greater than 0.", 400);
  }

  if (price <= 0) {
    throw new AdminFlightRequestError("Price must be greater than 0.", 400);
  }

  if (totalSeats <= 0) {
    throw new AdminFlightRequestError("Total seats must be greater than 0.", 400);
  }

  if (availableSeats < 0) {
    throw new AdminFlightRequestError(
      "Available seats cannot be negative.",
      400
    );
  }

  if (availableSeats > totalSeats) {
    throw new AdminFlightRequestError(
      "Available seats cannot exceed total seats.",
      400
    );
  }

  if (!isFlightStatus(status)) {
    throw new AdminFlightRequestError("Status is invalid.", 400);
  }

  return {
    code,
    airline,
    aircraft: aircraftValue,
    origin,
    originCode,
    destination,
    destinationCode,
    departureTime,
    arrivalTime,
    durationMinutes,
    price,
    totalSeats,
    availableSeats,
    status,
  };
}
