export const CHARTER_STATUSES = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "APPROVED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type CharterStatus = (typeof CHARTER_STATUSES)[number];

export type SafeCharterRequest = {
  id: number;
  userId: number | null;
  reference: string;
  fullName: string;
  email: string;
  phone: string | null;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  passengerCount: number;
  aircraftPreference: string | null;
  budget: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CharterWriteInput = {
  fullName: string;
  email: string;
  phone: string | null;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  passengerCount: number;
  aircraftPreference: string | null;
  budget: string | null;
  notes: string | null;
};

export class CharterRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCharterStatus(value: string): value is CharterStatus {
  return (CHARTER_STATUSES as readonly string[]).includes(value);
}

export function toSafeCharterRequest(
  request: SafeCharterRequest
): SafeCharterRequest {
  return {
    id: request.id,
    userId: request.userId,
    reference: request.reference,
    fullName: request.fullName,
    email: request.email,
    phone: request.phone,
    origin: request.origin,
    destination: request.destination,
    departureDate: request.departureDate,
    returnDate: request.returnDate,
    passengerCount: request.passengerCount,
    aircraftPreference: request.aircraftPreference,
    budget: request.budget,
    notes: request.notes,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const trimmed = asTrimmedString(value);
  return trimmed || null;
}

function asRequiredDate(value: unknown, field: string) {
  const date = asTrimmedString(value);

  if (!date) {
    throw new CharterRequestError(`${field} is required.`, 400);
  }

  if (!DATE_ONLY_PATTERN.test(date)) {
    throw new CharterRequestError(`${field} must be YYYY-MM-DD.`, 400);
  }

  return date;
}

function asOptionalDate(value: unknown, field: string) {
  const date = asOptionalString(value);

  if (date && !DATE_ONLY_PATTERN.test(date)) {
    throw new CharterRequestError(`${field} must be YYYY-MM-DD.`, 400);
  }

  return date;
}

function asPositiveInt(value: unknown, field: string) {
  let parsed: number | null = null;

  if (typeof value === "number" && Number.isInteger(value)) {
    parsed = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    const next = Number(value);
    parsed = Number.isInteger(next) ? next : null;
  }

  if (parsed == null) {
    throw new CharterRequestError(`${field} must be an integer.`, 400);
  }

  if (parsed <= 0) {
    throw new CharterRequestError(`${field} must be greater than 0.`, 400);
  }

  return parsed;
}

function parseCharterDetails(body: unknown): CharterWriteInput {
  if (!body || typeof body !== "object") {
    throw new CharterRequestError("Invalid charter request payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const fullName = asTrimmedString(payload.fullName);
  const email = asTrimmedString(payload.email).toLowerCase();
  const origin = asTrimmedString(payload.origin);
  const destination = asTrimmedString(payload.destination);
  const departureDate = asRequiredDate(payload.departureDate, "Departure date");
  const returnDate = asOptionalDate(payload.returnDate, "Return date");
  const passengerCount = asPositiveInt(payload.passengerCount, "Passenger count");

  if (!fullName) {
    throw new CharterRequestError("Full name is required.", 400);
  }

  if (!email) {
    throw new CharterRequestError("Email is required.", 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new CharterRequestError("Enter a valid email address.", 400);
  }

  if (!origin) {
    throw new CharterRequestError("Origin is required.", 400);
  }

  if (!destination) {
    throw new CharterRequestError("Destination is required.", 400);
  }

  if (returnDate && returnDate < departureDate) {
    throw new CharterRequestError(
      "Return date cannot be before departure date.",
      400
    );
  }

  return {
    fullName,
    email,
    phone: asOptionalString(payload.phone),
    origin,
    destination,
    departureDate,
    returnDate,
    passengerCount,
    aircraftPreference: asOptionalString(payload.aircraftPreference),
    budget: asOptionalString(payload.budget),
    notes: asOptionalString(payload.notes),
  };
}

export function parseCharterCreateInput(body: unknown): CharterWriteInput {
  return parseCharterDetails(body);
}

export function parseCharterStatus(body: unknown): CharterStatus {
  if (!body || typeof body !== "object") {
    throw new CharterRequestError("Invalid charter request payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const extraKeys = Object.keys(payload).filter((key) => key !== "status");

  if (extraKeys.length > 0) {
    throw new CharterRequestError("Staff may only update request status.", 403);
  }

  const status =
    typeof payload.status === "string" ? payload.status.trim().toUpperCase() : "";

  if (!status) {
    throw new CharterRequestError("Status is required.", 400);
  }

  if (!isCharterStatus(status)) {
    throw new CharterRequestError("Status is invalid.", 400);
  }

  return status;
}

export function parseCharterAdminUpdate(body: unknown): CharterWriteInput & {
  status: CharterStatus;
} {
  if (!body || typeof body !== "object") {
    throw new CharterRequestError("Invalid charter request payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const details = parseCharterDetails(payload);
  const status =
    typeof payload.status === "string" ? payload.status.trim().toUpperCase() : "";

  if (!status) {
    throw new CharterRequestError("Status is required.", 400);
  }

  if (!isCharterStatus(status)) {
    throw new CharterRequestError("Status is invalid.", 400);
  }

  return {
    ...details,
    status,
  };
}
