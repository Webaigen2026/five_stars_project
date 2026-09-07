import { canViewSensitiveTravelerData } from "./authorization";
import {
  ACCOUNT_LOCKED_REAUTH_MESSAGE,
  ACCOUNT_LOCKED_STATUS,
  isAccountLocked,
} from "./account-lockout";
import { parsePositiveInt } from "./admin-bookings";
import { maskPassportNumber } from "./sensitive-data";
import {
  TravelerEncryptionError,
  getDecryptedPassportNumber,
} from "./traveler-encryption";

export type PassengerManifestPassportMode = "masked" | "full";

export const PASSENGER_MANIFEST_MASKED_ACTION =
  "PASSENGER_MANIFEST_EXPORTED_MASKED" as const;
export const PASSENGER_MANIFEST_FULL_ACTION =
  "PASSENGER_MANIFEST_EXPORTED_FULL" as const;

export const PASSENGER_MANIFEST_PASSWORD_REQUIRED_MESSAGE =
  "Password is required.";
export const PASSENGER_MANIFEST_PASSWORD_FAILED_MESSAGE =
  "Password confirmation failed.";
export const PASSENGER_MANIFEST_FORBIDDEN_MESSAGE = "Forbidden.";
export const PASSENGER_MANIFEST_NOT_FOUND_MESSAGE =
  "Flight or passenger manifest was not found.";
export const PASSENGER_MANIFEST_DOCUMENT_UNAVAILABLE_MESSAGE =
  "Passenger document data is unavailable.";
export const PASSENGER_MANIFEST_AUDIT_FAILURE_MESSAGE =
  "Unable to complete request.";
export const PASSENGER_MANIFEST_UNABLE_MESSAGE =
  "Unable to export passenger manifest.";

export const PASSENGER_MANIFEST_CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
} as const;

export const PASSENGER_MANIFEST_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Bookings included on an operational passenger manifest. */
export const MANIFEST_BOOKING_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "TICKETED",
  "COMPLETED",
]);

export const PASSENGER_MANIFEST_COLUMNS = [
  "First Name",
  "Last Name",
  "Date of Birth",
  "Gender",
  "Nationality",
  "Passport Issuing Country",
  "Passport Number",
  "Passport Expiration",
] as const;

export type ManifestPassengerRow = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportCountry: string;
  passportNumberEncrypted: string;
  passportExpiry: string;
};

export type ManifestExportRow = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportIssuingCountry: string;
  passportNumber: string;
  passportExpiration: string;
};

export type ManifestAuditEvent = {
  adminUserId: number;
  flightId: number;
  action:
    | typeof PASSENGER_MANIFEST_MASKED_ACTION
    | typeof PASSENGER_MANIFEST_FULL_ACTION;
};

export type ManifestAccountSecurity = {
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
};

export type ManifestHandlerSuccess = {
  ok: true;
  status: 200;
  flightCode: string;
  departureDate: string;
  rows: ManifestExportRow[];
  auditAction:
    | typeof PASSENGER_MANIFEST_MASKED_ACTION
    | typeof PASSENGER_MANIFEST_FULL_ACTION;
};

export type ManifestHandlerFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ManifestHandlerResult =
  | ManifestHandlerSuccess
  | ManifestHandlerFailure;

export function authorizePassengerManifestExport(
  user: {
    role?: string | null;
    canViewSensitiveTravelerData?: boolean | null;
  } | null
): { ok: true } | { ok: false; status: 401 | 403; error: string } {
  if (!user) {
    return { ok: false, status: 401, error: "Not authenticated." };
  }

  if (!canViewSensitiveTravelerData(user)) {
    return {
      ok: false,
      status: 403,
      error: PASSENGER_MANIFEST_FORBIDDEN_MESSAGE,
    };
  }

  return { ok: true };
}

export function parsePassportMode(value: unknown): PassengerManifestPassportMode | null {
  if (value === "masked" || value === "full") {
    return value;
  }

  return null;
}

export function parseManifestExportBody(body: unknown): {
  passportMode: PassengerManifestPassportMode | null;
  password: string | null;
} {
  if (!body || typeof body !== "object") {
    return { passportMode: null, password: null };
  }

  const payload = body as Record<string, unknown>;
  const passportMode = parsePassportMode(payload.passportMode);
  const password =
    typeof payload.password === "string" && payload.password.length > 0
      ? payload.password
      : null;

  return { passportMode, password };
}

/** Format YYYY-MM-DD (or ISO datetime prefix) as MM/DD/YYYY. */
export function formatManifestDate(value: string) {
  const trimmed = value.trim();
  const dateOnly = trimmed.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);

  if (!match) {
    return trimmed;
  }

  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

export function resolveManifestPassportNumber(
  passenger: { passportNumberEncrypted?: string | null },
  mode: PassengerManifestPassportMode
) {
  const plaintext = getDecryptedPassportNumber(passenger);

  if (mode === "full") {
    return plaintext;
  }

  return maskPassportNumber(plaintext);
}

export function buildManifestExportRows(
  passengers: ManifestPassengerRow[],
  mode: PassengerManifestPassportMode
): ManifestExportRow[] {
  return passengers.map((passenger) => ({
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    dateOfBirth: formatManifestDate(passenger.dateOfBirth),
    gender: passenger.gender,
    nationality: passenger.nationality,
    passportIssuingCountry: passenger.passportCountry,
    passportNumber: resolveManifestPassportNumber(passenger, mode),
    passportExpiration: formatManifestDate(passenger.passportExpiry),
  }));
}

export function manifestAuditActionForMode(mode: PassengerManifestPassportMode) {
  return mode === "full"
    ? PASSENGER_MANIFEST_FULL_ACTION
    : PASSENGER_MANIFEST_MASKED_ACTION;
}

export function buildManifestAuditEvent(input: {
  adminUserId: number;
  flightId: number;
  passportMode: PassengerManifestPassportMode;
}): ManifestAuditEvent {
  return {
    adminUserId: input.adminUserId,
    flightId: input.flightId,
    action: manifestAuditActionForMode(input.passportMode),
  };
}

export function sanitizeFlightCodeForFilename(code: string) {
  const cleaned = code
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 32) : "FLIGHT";
}

export function buildManifestFilename(input: {
  flightCode: string;
  departureDate: string;
}) {
  const code = sanitizeFlightCodeForFilename(input.flightCode);
  const dateOnly = input.departureDate.trim().slice(0, 10);
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : "unknown-date";

  return `FiveStars_Passenger_Manifest_${code}_${date}.xlsx`;
}

export function uniqueBookingIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

export function isManifestEligibleBookingStatus(status: string) {
  return MANIFEST_BOOKING_STATUSES.has(status);
}

/**
 * Full export request flow with injectable deps for tests.
 * Order: auth → mode → password → lockout → bcrypt → reset →
 * flight → passengers → rows → audit metadata (caller writes audit then file).
 */
export async function handlePassengerManifestRequest(deps: {
  user: {
    id: number;
    role?: string | null;
    canViewSensitiveTravelerData?: boolean | null;
  } | null;
  password: string | null;
  passportMode: PassengerManifestPassportMode | null;
  flightIdRaw: string;
  loadAccountSecurity: () => Promise<ManifestAccountSecurity | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  recordFailedAttempt: () => Promise<{ isNowLocked: boolean }>;
  clearFailedAttempts: () => Promise<void>;
  loadFlight: (
    id: number
  ) => Promise<{ id: number; code: string; departureTime: string } | null>;
  loadPassengersForFlight: (flightId: number) => Promise<ManifestPassengerRow[]>;
}): Promise<ManifestHandlerResult> {
  const auth = authorizePassengerManifestExport(deps.user);

  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }

  const adminUser = deps.user!;

  if (deps.passportMode == null) {
    return {
      ok: false,
      status: 400,
      error: "passportMode must be masked or full.",
    };
  }

  if (deps.password == null || deps.password.length === 0) {
    return {
      ok: false,
      status: 400,
      error: PASSENGER_MANIFEST_PASSWORD_REQUIRED_MESSAGE,
    };
  }

  const account = await deps.loadAccountSecurity();

  if (!account) {
    return { ok: false, status: 401, error: "Not authenticated." };
  }

  if (isAccountLocked(account.lockedUntil)) {
    return {
      ok: false,
      status: ACCOUNT_LOCKED_STATUS,
      error: ACCOUNT_LOCKED_REAUTH_MESSAGE,
    };
  }

  let passwordMatches = false;

  try {
    passwordMatches = await deps.verifyPassword(
      deps.password,
      account.passwordHash
    );
  } catch {
    console.error("Passenger manifest password verification failed", {
      adminUserId: adminUser.id,
      code: "PASSWORD_VERIFY_ERROR",
    });
    return {
      ok: false,
      status: 401,
      error: PASSENGER_MANIFEST_PASSWORD_FAILED_MESSAGE,
    };
  }

  if (!passwordMatches) {
    const failure = await deps.recordFailedAttempt();

    if (failure.isNowLocked) {
      return {
        ok: false,
        status: ACCOUNT_LOCKED_STATUS,
        error: ACCOUNT_LOCKED_REAUTH_MESSAGE,
      };
    }

    return {
      ok: false,
      status: 401,
      error: PASSENGER_MANIFEST_PASSWORD_FAILED_MESSAGE,
    };
  }

  await deps.clearFailedAttempts();

  const flightId = parsePositiveInt(deps.flightIdRaw);

  if (flightId == null) {
    return {
      ok: false,
      status: 404,
      error: PASSENGER_MANIFEST_NOT_FOUND_MESSAGE,
    };
  }

  const flight = await deps.loadFlight(flightId);

  if (!flight) {
    return {
      ok: false,
      status: 404,
      error: PASSENGER_MANIFEST_NOT_FOUND_MESSAGE,
    };
  }

  let passengers: ManifestPassengerRow[];

  try {
    passengers = await deps.loadPassengersForFlight(flight.id);
  } catch {
    console.error("Passenger manifest load failed", {
      flightId: flight.id,
      adminUserId: adminUser.id,
      code: "MANIFEST_LOAD_ERROR",
    });
    return {
      ok: false,
      status: 500,
      error: PASSENGER_MANIFEST_UNABLE_MESSAGE,
    };
  }

  let rows: ManifestExportRow[];

  try {
    rows = buildManifestExportRows(passengers, deps.passportMode);
  } catch (error) {
    if (error instanceof TravelerEncryptionError) {
      console.error("Passenger manifest decrypt failed", {
        flightId: flight.id,
        adminUserId: adminUser.id,
        code: error.code,
      });
      return {
        ok: false,
        status: 404,
        error: PASSENGER_MANIFEST_DOCUMENT_UNAVAILABLE_MESSAGE,
      };
    }

    console.error("Passenger manifest row build failed", {
      flightId: flight.id,
      adminUserId: adminUser.id,
      code: "MANIFEST_ROW_ERROR",
    });
    return {
      ok: false,
      status: 500,
      error: PASSENGER_MANIFEST_UNABLE_MESSAGE,
    };
  }

  return {
    ok: true,
    status: 200,
    flightCode: flight.code,
    departureDate: flight.departureTime,
    rows,
    auditAction: manifestAuditActionForMode(deps.passportMode),
  };
}
