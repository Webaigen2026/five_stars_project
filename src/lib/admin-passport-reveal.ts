import { canViewSensitiveTravelerData } from "./authorization";
import { parsePositiveInt } from "./admin-bookings";
import {
  ACCOUNT_LOCKED_REAUTH_MESSAGE,
  ACCOUNT_LOCKED_STATUS,
  isAccountLocked,
} from "./account-lockout";
import {
  TravelerEncryptionError,
  getDecryptedPassportNumber,
} from "./traveler-encryption";

export const PASSPORT_UNAVAILABLE_MESSAGE = "Passport number is unavailable.";
export const PASSPORT_REVEAL_AUDIT_FAILURE_MESSAGE =
  "Unable to complete request.";
export const PASSPORT_PASSWORD_REQUIRED_MESSAGE = "Password is required.";
export const PASSPORT_PASSWORD_FAILED_MESSAGE =
  "Password confirmation failed.";
export const PASSPORT_REVEALED_ACTION = "PASSPORT_REVEALED" as const;

export const PASSPORT_REVEAL_CACHE_HEADERS = {
  "Cache-Control": "no-store, private",
  Pragma: "no-cache",
} as const;

export type PassportRevealAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

export type PassportRevealAuditEvent = {
  adminUserId: number;
  passengerId: number;
  action: typeof PASSPORT_REVEALED_ACTION;
};

export type PassportRevealAccountSecurity = {
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
};

export type PassportRevealResult = {
  status: number;
  body: Record<string, unknown>;
};

/**
 * Authorization for admin passport reveal.
 * Requires authenticated ADMIN with canViewSensitiveTravelerData === true.
 */
export function authorizePassportReveal(
  user: {
    role?: string | null;
    canViewSensitiveTravelerData?: boolean | null;
  } | null
): PassportRevealAuthResult {
  if (!user) {
    return { ok: false, status: 401, error: "Not authenticated." };
  }

  if (!canViewSensitiveTravelerData(user)) {
    return { ok: false, status: 403, error: "Forbidden." };
  }

  return { ok: true };
}

export function parseRevealPassword(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const password = (body as { password?: unknown }).password;

  if (typeof password !== "string" || password.length === 0) {
    return null;
  }

  return password;
}

export function revealPassengerPassportNumber(passenger: {
  passportNumberEncrypted?: string | null;
}) {
  return getDecryptedPassportNumber(passenger);
}

export function buildPassportRevealAuditEvent(input: {
  adminUserId: number;
  passengerId: number;
}): PassportRevealAuditEvent {
  return {
    adminUserId: input.adminUserId,
    passengerId: input.passengerId,
    action: PASSPORT_REVEALED_ACTION,
  };
}

export function mapPassportRevealFailure(error: unknown): {
  status: number;
  error: string;
  internalCode?: string;
} {
  if (error instanceof TravelerEncryptionError) {
    return {
      status: 404,
      error: PASSPORT_UNAVAILABLE_MESSAGE,
      internalCode: error.code,
    };
  }

  return {
    status: 500,
    error: PASSPORT_UNAVAILABLE_MESSAGE,
    internalCode: "UNEXPECTED",
  };
}

/**
 * Full reveal flow with injectable deps for tests.
 * Order: auth → password present → lock check → bcrypt → reset lockout →
 * passenger → decrypt → audit → response.
 */
export async function handlePassportRevealRequest(deps: {
  user: {
    id: number;
    role?: string | null;
    canViewSensitiveTravelerData?: boolean | null;
  } | null;
  password: string | null;
  passengerIdRaw: string;
  loadAccountSecurity: () => Promise<PassportRevealAccountSecurity | null>;
  verifyPassword: (
    password: string,
    passwordHash: string
  ) => Promise<boolean>;
  /** Must use atomic shared lockout recording (not a stale local count). */
  recordFailedAttempt: () => Promise<{ isNowLocked: boolean }>;
  clearFailedAttempts: () => Promise<void>;
  loadPassenger: (id: number) => Promise<{
    id: number;
    passportNumberEncrypted?: string | null;
  } | null>;
  writeAudit: (event: PassportRevealAuditEvent) => Promise<void>;
}): Promise<PassportRevealResult> {
  const auth = authorizePassportReveal(deps.user);

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.error } };
  }

  const adminUser = deps.user!;

  if (deps.password == null || deps.password.length === 0) {
    return {
      status: 400,
      body: { error: PASSPORT_PASSWORD_REQUIRED_MESSAGE },
    };
  }

  const account = await deps.loadAccountSecurity();

  if (!account) {
    return {
      status: 401,
      body: { error: "Not authenticated." },
    };
  }

  if (isAccountLocked(account.lockedUntil)) {
    return {
      status: ACCOUNT_LOCKED_STATUS,
      body: { error: ACCOUNT_LOCKED_REAUTH_MESSAGE },
    };
  }

  let passwordMatches = false;

  try {
    passwordMatches = await deps.verifyPassword(
      deps.password,
      account.passwordHash
    );
  } catch {
    console.error("Passport reveal password verification failed", {
      adminUserId: adminUser.id,
      code: "PASSWORD_VERIFY_ERROR",
    });
    return {
      status: 401,
      body: { error: PASSPORT_PASSWORD_FAILED_MESSAGE },
    };
  }

  if (!passwordMatches) {
    const failure = await deps.recordFailedAttempt();

    if (failure.isNowLocked) {
      return {
        status: ACCOUNT_LOCKED_STATUS,
        body: { error: ACCOUNT_LOCKED_REAUTH_MESSAGE },
      };
    }

    return {
      status: 401,
      body: { error: PASSPORT_PASSWORD_FAILED_MESSAGE },
    };
  }

  await deps.clearFailedAttempts();

  const id = parsePositiveInt(deps.passengerIdRaw);

  if (id == null) {
    return { status: 404, body: { error: "Passenger not found." } };
  }

  const passenger = await deps.loadPassenger(id);

  if (!passenger) {
    return { status: 404, body: { error: "Passenger not found." } };
  }

  let passportNumber: string;

  try {
    passportNumber = revealPassengerPassportNumber(passenger);
  } catch (error) {
    const mapped = mapPassportRevealFailure(error);
    console.error("Passport reveal failed", {
      passengerId: passenger.id,
      adminUserId: adminUser.id,
      code: mapped.internalCode ?? "UNKNOWN",
    });
    return { status: mapped.status, body: { error: mapped.error } };
  }

  const auditEvent = buildPassportRevealAuditEvent({
    adminUserId: adminUser.id,
    passengerId: passenger.id,
  });

  try {
    await deps.writeAudit(auditEvent);
  } catch {
    console.error("Passport reveal audit write failed", {
      passengerId: passenger.id,
      adminUserId: adminUser.id,
      action: PASSPORT_REVEALED_ACTION,
    });
    return {
      status: 500,
      body: { error: PASSPORT_REVEAL_AUDIT_FAILURE_MESSAGE },
    };
  }

  return { status: 200, body: { passportNumber } };
}
