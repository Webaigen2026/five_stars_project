export const CARGO_STATUSES = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "APPROVED",
  "IN_TRANSIT",
  "COMPLETED",
  "CANCELLED",
] as const;

export const CARGO_TYPES = [
  "DOCUMENT",
  "BOX",
  "BARREL",
  "PALLET",
  "OTHER",
] as const;

export type CargoStatus = (typeof CARGO_STATUSES)[number];
export type CargoType = (typeof CARGO_TYPES)[number];

export type SafeCargoRequest = {
  id: number;
  userId: number | null;
  reference: string;
  fullName: string;
  email: string;
  phone: string | null;
  origin: string;
  destination: string;
  cargoType: string;
  description: string | null;
  quantity: number | null;
  weight: string | null;
  preferredDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CargoWriteInput = {
  fullName: string;
  email: string;
  phone: string | null;
  origin: string;
  destination: string;
  cargoType: CargoType;
  description: string | null;
  quantity: number | null;
  weight: string | null;
  preferredDate: string | null;
};

export class CargoRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCargoStatus(value: string): value is CargoStatus {
  return (CARGO_STATUSES as readonly string[]).includes(value);
}

export function isCargoType(value: string): value is CargoType {
  return (CARGO_TYPES as readonly string[]).includes(value);
}

export function toSafeCargoRequest(request: SafeCargoRequest): SafeCargoRequest {
  return {
    id: request.id,
    userId: request.userId,
    reference: request.reference,
    fullName: request.fullName,
    email: request.email,
    phone: request.phone,
    origin: request.origin,
    destination: request.destination,
    cargoType: request.cargoType,
    description: request.description,
    quantity: request.quantity,
    weight: request.weight,
    preferredDate: request.preferredDate,
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

function asOptionalPositiveInt(value: unknown, field: string) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    if (value <= 0) {
      throw new CargoRequestError(`${field} must be greater than 0.`, 400);
    }

    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new CargoRequestError(`${field} must be greater than 0.`, 400);
    }

    return parsed;
  }

  throw new CargoRequestError(`${field} must be an integer.`, 400);
}

function asOptionalDate(value: unknown, field: string) {
  const date = asOptionalString(value);

  if (date && !DATE_ONLY_PATTERN.test(date)) {
    throw new CargoRequestError(`${field} must be YYYY-MM-DD.`, 400);
  }

  return date;
}

function parseCargoDetails(body: unknown): CargoWriteInput {
  if (!body || typeof body !== "object") {
    throw new CargoRequestError("Invalid cargo request payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const fullName = asTrimmedString(payload.fullName);
  const email = asTrimmedString(payload.email).toLowerCase();
  const origin = asTrimmedString(payload.origin);
  const destination = asTrimmedString(payload.destination);
  const cargoType = asTrimmedString(payload.cargoType).toUpperCase();

  if (!fullName) {
    throw new CargoRequestError("Full name is required.", 400);
  }

  if (!email) {
    throw new CargoRequestError("Email is required.", 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new CargoRequestError("Enter a valid email address.", 400);
  }

  if (!origin) {
    throw new CargoRequestError("Origin is required.", 400);
  }

  if (!destination) {
    throw new CargoRequestError("Destination is required.", 400);
  }

  if (!isCargoType(cargoType)) {
    throw new CargoRequestError("Cargo type is invalid.", 400);
  }

  return {
    fullName,
    email,
    phone: asOptionalString(payload.phone),
    origin,
    destination,
    cargoType,
    description: asOptionalString(payload.description),
    quantity: asOptionalPositiveInt(payload.quantity, "Quantity"),
    weight: asOptionalString(payload.weight),
    preferredDate: asOptionalDate(payload.preferredDate, "Preferred date"),
  };
}

export function parseCargoCreateInput(body: unknown): CargoWriteInput {
  return parseCargoDetails(body);
}

export function parseCargoStatus(body: unknown): CargoStatus {
  if (!body || typeof body !== "object") {
    throw new CargoRequestError("Invalid cargo request payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const extraKeys = Object.keys(payload).filter((key) => key !== "status");

  if (extraKeys.length > 0) {
    throw new CargoRequestError("Staff may only update request status.", 403);
  }

  const status =
    typeof payload.status === "string" ? payload.status.trim().toUpperCase() : "";

  if (!status) {
    throw new CargoRequestError("Status is required.", 400);
  }

  if (!isCargoStatus(status)) {
    throw new CargoRequestError("Status is invalid.", 400);
  }

  return status;
}

export function parseCargoAdminUpdate(body: unknown): CargoWriteInput & {
  status: CargoStatus;
} {
  if (!body || typeof body !== "object") {
    throw new CargoRequestError("Invalid cargo request payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const details = parseCargoDetails(payload);
  const status =
    typeof payload.status === "string" ? payload.status.trim().toUpperCase() : "";

  if (!status) {
    throw new CargoRequestError("Status is required.", 400);
  }

  if (!isCargoStatus(status)) {
    throw new CargoRequestError("Status is invalid.", 400);
  }

  return {
    ...details,
    status,
  };
}
