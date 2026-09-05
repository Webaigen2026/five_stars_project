/**
 * Guest Find My Trip OTP helpers (D15.2).
 * Purpose-separated from password-reset and email verification.
 */

import { createHash, randomInt } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

export const GUEST_TRIP_CODE_TTL_MS = 10 * 60 * 1000;
export const GUEST_TRIP_MAX_ATTEMPTS = 5;
export const GUEST_TRIP_RESEND_COOLDOWN_MS = 60 * 1000;
export const GUEST_TRIP_CODE_LENGTH = 6;
export const GUEST_TRIP_CHALLENGE_COOKIE_NAME = "five_stars_guest_trip_challenge";
export const GUEST_TRIP_CHALLENGE_PURPOSE = "guest_trip_challenge";

export const GUEST_TRIP_GENERIC_MESSAGE =
  "If the booking information matches, we've sent a verification code.";

export const GUEST_TRIP_CODE_ERROR =
  "The code is incorrect or has expired.";

const CODE_HASH_PREFIX = "five-stars-guest-trip:";

export function normalizeBookingReference(value: string) {
  return value.trim().toUpperCase();
}

export function generateGuestTripAccessCode() {
  const value = randomInt(0, 1_000_000);
  return String(value).padStart(GUEST_TRIP_CODE_LENGTH, "0");
}

export function hashGuestTripAccessCode(code: string) {
  return createHash("sha256")
    .update(`${CODE_HASH_PREFIX}${code}`)
    .digest("hex");
}

export function isSixDigitGuestTripCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function isGuestTripResendCooldownActive(
  latestCreatedAt: string | null | undefined,
  now = Date.now()
) {
  if (!latestCreatedAt) {
    return false;
  }
  const created = new Date(latestCreatedAt).getTime();
  if (Number.isNaN(created)) {
    return false;
  }
  return now - created < GUEST_TRIP_RESEND_COOLDOWN_MS;
}

export function isExpiredIso(value: string | null | undefined, now = Date.now()) {
  if (!value) {
    return true;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return true;
  }
  return date.getTime() <= now;
}

export type GuestTripCodeAttemptEvaluation =
  | { outcome: "accept" }
  | {
      outcome: "reject";
      nextAttemptCount: number;
      invalidate: boolean;
    }
  | { outcome: "invalid" };

export function evaluateGuestTripCodeAttempt(input: {
  submittedCode: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: string;
  verifiedAt?: string | null;
  consumedAt?: string | null;
  now?: number;
}): GuestTripCodeAttemptEvaluation {
  const now = input.now ?? Date.now();

  if (input.consumedAt || input.verifiedAt) {
    return { outcome: "invalid" };
  }

  if (!isSixDigitGuestTripCode(input.submittedCode)) {
    return { outcome: "invalid" };
  }

  if (isExpiredIso(input.expiresAt, now)) {
    return { outcome: "invalid" };
  }

  if (input.attemptCount >= GUEST_TRIP_MAX_ATTEMPTS) {
    return { outcome: "invalid" };
  }

  if (hashGuestTripAccessCode(input.submittedCode) === input.codeHash) {
    return { outcome: "accept" };
  }

  const nextAttemptCount = input.attemptCount + 1;
  return {
    outcome: "reject",
    nextAttemptCount,
    invalidate: nextAttemptCount >= GUEST_TRIP_MAX_ATTEMPTS,
  };
}

export function maskEmailForDisplay(email: string) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) {
    return "••••@••••";
  }
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}${"•".repeat(Math.max(local.length - 1, 4))}@${domain}`;
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to the server environment before using guest trip challenges."
    );
  }
  return new TextEncoder().encode(secret);
}

export function getGuestTripChallengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(GUEST_TRIP_CODE_TTL_MS / 1000),
  };
}

export type GuestTripChallengeContext = {
  challengeId: number;
  bookingId: number;
  bookingReference: string;
};

export async function createGuestTripChallengeToken(
  input: GuestTripChallengeContext
) {
  return new SignJWT({
    purpose: GUEST_TRIP_CHALLENGE_PURPOSE,
    challengeId: input.challengeId,
    bookingId: input.bookingId,
    bookingReference: input.bookingReference,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(GUEST_TRIP_CODE_TTL_MS / 1000)}s`)
    .sign(getAuthSecret());
}

/** Enumeration-safe decoy when no real challenge was created. */
export async function createGuestTripChallengeDecoyToken() {
  return new SignJWT({
    purpose: GUEST_TRIP_CHALLENGE_PURPOSE,
    challengeId: 0,
    bookingId: 0,
    bookingReference: "",
    decoy: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(GUEST_TRIP_CODE_TTL_MS / 1000)}s`)
    .sign(getAuthSecret());
}

export async function verifyGuestTripChallengeToken(
  token: string
): Promise<GuestTripChallengeContext | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.purpose !== GUEST_TRIP_CHALLENGE_PURPOSE) {
      return null;
    }
    if (payload.decoy === true) {
      return null;
    }

    const challengeId = payload.challengeId;
    const bookingId = payload.bookingId;
    const bookingReference = payload.bookingReference;

    if (
      typeof challengeId !== "number" ||
      !Number.isInteger(challengeId) ||
      challengeId <= 0 ||
      typeof bookingId !== "number" ||
      !Number.isInteger(bookingId) ||
      bookingId <= 0 ||
      typeof bookingReference !== "string" ||
      bookingReference.length === 0
    ) {
      return null;
    }

    return { challengeId, bookingId, bookingReference };
  } catch {
    return null;
  }
}
