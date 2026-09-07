import { AdminBookingRequestError } from "./admin-bookings";
import { canViewSensitiveTravelerData } from "./authorization";
import { maskPassportNumber } from "./sensitive-data";
import { getDecryptedPassportNumber } from "./traveler-encryption";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const IDENTITY_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportCountry",
  "passportExpiry",
] as const;

type IdentityField = (typeof IDENTITY_FIELDS)[number];

/** @deprecated Prefer PassengerEditView for any client-facing mapping. */
export type SafePassenger = {
  id: number;
  bookingId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passengerType: string;
  /** Never plaintext — masked display only if present. */
  passportNumber: string;
  passportCountry: string;
  passportExpiry: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Client-safe passenger edit DTO.
 * Never includes plaintext passport or ciphertext.
 */
export type PassengerEditView = {
  id: number;
  bookingId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passengerType: string;
  passportCountry: string;
  passportExpiry: string;
  createdAt: string;
  updatedAt: string;
  maskedPassport: string;
  canReplacePassport: boolean;
};

export type PassengerUpdateInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportCountry: string;
  passportExpiry: string;
  /**
   * null = leave existing encrypted passport unchanged.
   * string = validated replacement plaintext (server encrypts before write).
   */
  passportNumberReplacement: string | null;
};

export type PassportReplacementDecision =
  | { action: "preserve" }
  | { action: "replace"; passportNumber: string }
  | { action: "reject"; status: 403; error: string };

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Mask existing passport for admin display.
 * Decrypts briefly in server memory only — never returns plaintext.
 */
export function maskExistingPassengerPassport(passenger: {
  passportNumberEncrypted?: string | null;
}) {
  if (!passenger.passportNumberEncrypted?.trim()) {
    return "Unavailable";
  }

  try {
    return maskPassportNumber(getDecryptedPassportNumber(passenger));
  } catch {
    return "Unavailable";
  }
}

export function toPassengerEditView(
  passenger: {
    id: number;
    bookingId: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    passengerType?: string | null;
    passportNumberEncrypted?: string | null;
    passportCountry: string;
    passportExpiry: string;
    createdAt: string;
    updatedAt: string;
  },
  options: {
    canReplacePassport: boolean;
  }
): PassengerEditView {
  return {
    id: passenger.id,
    bookingId: passenger.bookingId,
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    dateOfBirth: passenger.dateOfBirth,
    gender: passenger.gender,
    nationality: passenger.nationality,
    passengerType: passenger.passengerType ?? "ADULT",
    passportCountry: passenger.passportCountry,
    passportExpiry: passenger.passportExpiry,
    createdAt: passenger.createdAt,
    updatedAt: passenger.updatedAt,
    maskedPassport: maskExistingPassengerPassport(passenger),
    canReplacePassport: options.canReplacePassport === true,
  };
}

/**
 * @deprecated Do not use for client props. Prefer toPassengerEditView.
 * Returns masked passport in passportNumber — never plaintext.
 */
export function toSafePassenger(
  passenger: Omit<SafePassenger, "passportNumber"> & {
    passportNumberEncrypted?: string | null;
    passengerType?: string | null;
  }
): SafePassenger {
  const view = toPassengerEditView(passenger, { canReplacePassport: false });

  return {
    id: view.id,
    bookingId: view.bookingId,
    firstName: view.firstName,
    lastName: view.lastName,
    dateOfBirth: view.dateOfBirth,
    gender: view.gender,
    nationality: view.nationality,
    passengerType: view.passengerType,
    passportNumber: view.maskedPassport,
    passportCountry: view.passportCountry,
    passportExpiry: view.passportExpiry,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

/**
 * Parse passenger PATCH body.
 * passportNumber may be omitted or blank → preserve existing ciphertext.
 * Non-empty passportNumber → replacement candidate (permission checked separately).
 * Client-supplied role / permission flags are ignored here.
 */
export function parsePassengerUpdateInput(body: unknown): PassengerUpdateInput {
  if (!body || typeof body !== "object") {
    throw new AdminBookingRequestError("Invalid passenger payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const parsed = {} as Record<IdentityField, string>;

  for (const field of IDENTITY_FIELDS) {
    const value = asTrimmedString(payload[field]);

    if (!value) {
      throw new AdminBookingRequestError(`${field} is required.`, 400);
    }

    if (
      (field === "dateOfBirth" || field === "passportExpiry") &&
      !DATE_ONLY_PATTERN.test(value)
    ) {
      throw new AdminBookingRequestError(`${field} must be YYYY-MM-DD.`, 400);
    }

    parsed[field] = value;
  }

  const rawPassport = payload.passportNumber;
  let passportNumberReplacement: string | null = null;

  if (rawPassport !== undefined && rawPassport !== null) {
    if (typeof rawPassport !== "string") {
      throw new AdminBookingRequestError(
        "passportNumber must be a string.",
        400
      );
    }

    const trimmed = rawPassport.trim();
    passportNumberReplacement = trimmed.length > 0 ? trimmed : null;
  }

  return {
    ...parsed,
    passportNumberReplacement,
  };
}

/** @deprecated Use parsePassengerUpdateInput — passport is no longer always required. */
export function parsePassengerWriteInput(body: unknown) {
  const updated = parsePassengerUpdateInput(body);

  if (updated.passportNumberReplacement == null) {
    throw new AdminBookingRequestError("passportNumber is required.", 400);
  }

  return {
    firstName: updated.firstName,
    lastName: updated.lastName,
    dateOfBirth: updated.dateOfBirth,
    gender: updated.gender,
    nationality: updated.nationality,
    passportNumber: updated.passportNumberReplacement,
    passportCountry: updated.passportCountry,
    passportExpiry: updated.passportExpiry,
  };
}

/**
 * Decide whether a passport replacement may proceed.
 * Authorization must use the authenticated server user — never client flags.
 */
export function resolvePassportReplacement(input: {
  passportNumberReplacement: string | null;
  user: {
    role?: string | null;
    canViewSensitiveTravelerData?: boolean | null;
  };
}): PassportReplacementDecision {
  if (input.passportNumberReplacement == null) {
    return { action: "preserve" };
  }

  if (!canViewSensitiveTravelerData(input.user)) {
    return {
      action: "reject",
      status: 403,
      error: "Not authorized to change passport number.",
    };
  }

  return {
    action: "replace",
    passportNumber: input.passportNumberReplacement,
  };
}

/** True when a client edit DTO accidentally includes secrets. */
export function passengerEditViewLeaksSecrets(view: Record<string, unknown>) {
  if ("passportNumberEncrypted" in view) {
    return true;
  }

  if (
    typeof view.passportNumber === "string" &&
    view.passportNumber.length > 0 &&
    !view.passportNumber.startsWith("••••") &&
    view.passportNumber !== "Unavailable"
  ) {
    return true;
  }

  return false;
}
