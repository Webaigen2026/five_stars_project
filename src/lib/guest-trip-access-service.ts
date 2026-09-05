/**
 * Guest Find My Trip challenge lifecycle (D15.2).
 * Enumeration-safe. Post-OTP issues D15.1 guest booking JWT.
 */

import "server-only";

import { cookies } from "next/headers";

import { normalizeBookingContactEmail } from "./booking-access";
import {
  EmailConfigurationError,
  EmailDeliveryError,
} from "./email/resend";
import { sendGuestTripAccessCodeEmail } from "./email/send-guest-trip-access";
import { setGuestBookingAuthorizationCookie } from "./guest-booking-auth";
import {
  GUEST_TRIP_CHALLENGE_COOKIE_NAME,
  GUEST_TRIP_CODE_ERROR,
  GUEST_TRIP_CODE_TTL_MS,
  GUEST_TRIP_GENERIC_MESSAGE,
  createGuestTripChallengeDecoyToken,
  createGuestTripChallengeToken,
  evaluateGuestTripCodeAttempt,
  generateGuestTripAccessCode,
  getGuestTripChallengeCookieOptions,
  hashGuestTripAccessCode,
  isGuestTripResendCooldownActive,
  isSixDigitGuestTripCode,
  normalizeBookingReference,
  verifyGuestTripChallengeToken,
} from "./guest-trip-access";
import { db } from "../prisma/db";

export class GuestTripAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GuestTripAccessError";
  }
}

type SendFn = Parameters<typeof sendGuestTripAccessCodeEmail>[0]["send"];

function latestChallengeCreatedAt(
  challenges: Array<{ createdAt: string }>
) {
  if (challenges.length === 0) {
    return null;
  }

  return challenges.reduce((latest, row) => {
    return new Date(row.createdAt).getTime() > new Date(latest).getTime()
      ? row.createdAt
      : latest;
  }, challenges[0].createdAt);
}

async function setChallengeCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    GUEST_TRIP_CHALLENGE_COOKIE_NAME,
    token,
    getGuestTripChallengeCookieOptions()
  );
}

async function setDecoyChallengeCookie() {
  const token = await createGuestTripChallengeDecoyToken();
  await setChallengeCookie(token);
}

/**
 * Request a Find My Trip code. Always returns the same generic message.
 * Account-owned bookings get the same response and no usable challenge.
 */
export async function requestGuestTripAccessCode(input: {
  bookingReference: string;
  email: string;
  send?: SendFn;
  env?: NodeJS.ProcessEnv;
}) {
  const bookingReference = normalizeBookingReference(input.bookingReference);
  const email = normalizeBookingContactEmail(input.email);

  const generic = {
    success: true as const,
    message: GUEST_TRIP_GENERIC_MESSAGE,
  };

  if (!bookingReference || !email) {
    await setDecoyChallengeCookie();
    return generic;
  }

  try {
    const booking = await db.orm.public.Booking.where({
      bookingReference,
    }).first();

    // Account-owned or missing / email mismatch → same response, no real OTP.
    if (
      !booking ||
      booking.userId != null ||
      !booking.contactEmail ||
      normalizeBookingContactEmail(booking.contactEmail) !== email
    ) {
      await setDecoyChallengeCookie();
      return generic;
    }

    const existing = await db.orm.public.GuestTripAccessCode.where({
      bookingId: booking.id,
    }).all();
    const latestCreatedAt = latestChallengeCreatedAt(existing);

    if (latestCreatedAt && isGuestTripResendCooldownActive(latestCreatedAt)) {
      console.log("Guest trip access request throttled", {
        bookingReference: booking.bookingReference,
        operation: "find-trip",
      });
      // Keep a challenge cookie if one exists; otherwise decoy.
      const cookieStore = await cookies();
      if (!cookieStore.get(GUEST_TRIP_CHALLENGE_COOKIE_NAME)?.value) {
        await setDecoyChallengeCookie();
      }
      return generic;
    }

    const code = generateGuestTripAccessCode();
    const codeHash = hashGuestTripAccessCode(code);
    const expiresAt = new Date(
      Date.now() + GUEST_TRIP_CODE_TTL_MS
    ).toISOString();

    let challengeId: number | null = null;

    await db.transaction(async (tx) => {
      await tx.orm.public.GuestTripAccessCode.where({
        bookingId: booking.id,
      }).delete();

      await tx.orm.public.GuestTripAccessCode.create({
        bookingId: booking.id,
        codeHash,
        expiresAt,
        attemptCount: 0,
      });
    });

    const created = await db.orm.public.GuestTripAccessCode.where({
      bookingId: booking.id,
      codeHash,
    }).first();
    challengeId = created?.id ?? null;

    if (challengeId == null) {
      await setDecoyChallengeCookie();
      return generic;
    }

    try {
      const sent = await sendGuestTripAccessCodeEmail({
        to: booking.contactEmail,
        code,
        send: input.send,
        env: input.env,
      });

      const token = await createGuestTripChallengeToken({
        challengeId,
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
      });
      await setChallengeCookie(token);

      console.log("Guest trip access code email sent", {
        bookingReference: booking.bookingReference,
        provider: "resend",
        messageId: sent.id,
        operation: "find-trip",
      });
    } catch (error) {
      await db.orm.public.GuestTripAccessCode.where({
        id: challengeId,
      }).delete();
      await setDecoyChallengeCookie();

      console.error("Guest trip access email delivery failed", {
        bookingReference: booking.bookingReference,
        provider: "resend",
        operation: "find-trip",
        code:
          error instanceof EmailDeliveryError ||
          error instanceof EmailConfigurationError
            ? error.name
            : "unexpected",
      });
    }
  } catch (error) {
    console.error("Guest trip access request failed", {
      operation: "find-trip",
      code: error instanceof Error ? error.name : "unexpected",
    });
    try {
      await setDecoyChallengeCookie();
    } catch {
      // ignore cookie failures
    }
  }

  return generic;
}

/**
 * Verify OTP using challenge cookie context. Issues D15.1 guest booking JWT.
 */
export async function verifyGuestTripAccessCode(input: {
  code: string;
  challengeToken?: string | null;
}) {
  const code = input.code.trim();

  if (!isSixDigitGuestTripCode(code)) {
    throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
  }

  const cookieStore = await cookies();
  const token =
    input.challengeToken ??
    cookieStore.get(GUEST_TRIP_CHALLENGE_COOKIE_NAME)?.value ??
    null;

  const context = token ? await verifyGuestTripChallengeToken(token) : null;

  if (!context) {
    throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
  }

  const challenge = await db.orm.public.GuestTripAccessCode.where({
    id: context.challengeId,
  }).first();

  if (
    !challenge ||
    challenge.bookingId !== context.bookingId ||
    challenge.consumedAt ||
    challenge.verifiedAt
  ) {
    throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
  }

  const booking = await db.orm.public.Booking.where({
    id: context.bookingId,
  }).first();

  if (
    !booking ||
    booking.userId != null ||
    booking.bookingReference !== context.bookingReference
  ) {
    throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
  }

  const evaluation = evaluateGuestTripCodeAttempt({
    submittedCode: code,
    codeHash: challenge.codeHash,
    attemptCount: challenge.attemptCount,
    expiresAt: challenge.expiresAt,
    verifiedAt: challenge.verifiedAt,
    consumedAt: challenge.consumedAt,
  });

  if (evaluation.outcome === "invalid") {
    throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
  }

  if (evaluation.outcome === "reject") {
    if (evaluation.invalidate) {
      await db.orm.public.GuestTripAccessCode.where({
        id: challenge.id,
      }).delete();
    } else {
      await db.orm.public.GuestTripAccessCode.where({
        id: challenge.id,
      }).update({
        attemptCount: evaluation.nextAttemptCount,
      });
    }
    throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
  }

  const verifiedAt = new Date().toISOString();
  const consumedAt = verifiedAt;

  await db.orm.public.GuestTripAccessCode.where({ id: challenge.id }).update({
    verifiedAt,
    consumedAt,
  });

  await setGuestBookingAuthorizationCookie({
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
  });

  // Clear challenge cookie after successful OTP.
  cookieStore.set(GUEST_TRIP_CHALLENGE_COOKIE_NAME, "", {
    ...getGuestTripChallengeCookieOptions(),
    maxAge: 0,
  });

  console.log("Guest trip access verified", {
    bookingReference: booking.bookingReference,
    operation: "find-trip-verify",
  });

  return {
    success: true as const,
    bookingReference: booking.bookingReference,
  };
}
