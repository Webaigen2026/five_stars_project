/**
 * Short-lived guest booking authorization (D15.1).
 *
 * Signed JWT in an HttpOnly cookie — no DB token table required.
 * contactEmail and bookingReference are NEVER authorization secrets.
 */

import { randomBytes } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const GUEST_BOOKING_COOKIE_NAME = "five_stars_guest_booking";
/** Long enough for seats → checkout → Stripe; short enough to limit replay. */
export const GUEST_BOOKING_AUTH_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const GUEST_BOOKING_PURPOSE = "guest_booking_access";

export type GuestBookingAuthorization = {
  bookingId: number;
  bookingReference: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to the server environment before using guest booking authorization."
    );
  }

  return new TextEncoder().encode(secret);
}

export function getGuestBookingCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_BOOKING_AUTH_TTL_SECONDS,
  };
}

export async function createGuestBookingAuthorizationToken(input: {
  bookingId: number;
  bookingReference: string;
}) {
  const jti = randomBytes(16).toString("hex");

  return new SignJWT({
    purpose: GUEST_BOOKING_PURPOSE,
    bookingId: input.bookingId,
    bookingReference: input.bookingReference,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${GUEST_BOOKING_AUTH_TTL_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifyGuestBookingAuthorizationToken(
  token: string
): Promise<GuestBookingAuthorization | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());

    if (payload.purpose !== GUEST_BOOKING_PURPOSE) {
      return null;
    }

    const bookingId = payload.bookingId;
    const bookingReference = payload.bookingReference;

    if (
      typeof bookingId !== "number" ||
      !Number.isInteger(bookingId) ||
      bookingId <= 0 ||
      typeof bookingReference !== "string" ||
      bookingReference.length === 0
    ) {
      return null;
    }

    return { bookingId, bookingReference };
  } catch {
    return null;
  }
}

export async function setGuestBookingAuthorizationCookie(input: {
  bookingId: number;
  bookingReference: string;
}) {
  const token = await createGuestBookingAuthorizationToken(input);
  const cookieStore = await cookies();
  cookieStore.set(
    GUEST_BOOKING_COOKIE_NAME,
    token,
    getGuestBookingCookieOptions()
  );
}

export async function clearGuestBookingAuthorizationCookie() {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_BOOKING_COOKIE_NAME, "", {
    ...getGuestBookingCookieOptions(),
    maxAge: 0,
  });
}

export async function getGuestBookingAuthorization(): Promise<GuestBookingAuthorization | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_BOOKING_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyGuestBookingAuthorizationToken(token);
}
