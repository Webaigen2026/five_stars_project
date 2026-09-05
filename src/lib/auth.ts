import { randomBytes } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { db } from "../prisma/db";

export const SESSION_COOKIE_NAME = "starjet_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  userId: number;
  email: string;
  role: string;
  sessionId: string;
};

export type CurrentUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified: boolean;
};

export type CurrentSession = {
  user: CurrentUser;
  sessionId: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to the server environment before using authentication."
    );
  }

  return new TextEncoder().encode(secret);
}

function generateSessionId() {
  return randomBytes(32).toString("hex");
}

function isExpired(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return date.getTime() <= Date.now();
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    userId: user.userId,
    email: user.email,
    role: user.role,
    sessionId: user.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.userId))
    .setJti(user.sessionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;
    const sessionId = payload.sessionId;

    if (
      typeof userId !== "number" ||
      !Number.isInteger(userId) ||
      typeof email !== "string" ||
      typeof role !== "string" ||
      typeof sessionId !== "string" ||
      sessionId.length === 0
    ) {
      return null;
    }

    return {
      userId,
      email,
      role,
      sessionId,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function createUserSession(user: {
  id: number;
  email: string;
  role: string;
}) {
  const sessionId = generateSessionId();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  ).toISOString();

  await db.orm.public.Session.create({
    id: sessionId,
    userId: user.id,
    expiresAt,
  });

  try {
    return await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
  } catch (error) {
    await db.orm.public.Session.where({ id: sessionId }).update({
      revokedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export async function revokeSession(sessionId: string) {
  const session = await db.orm.public.Session.where({
    id: sessionId,
  }).first();

  if (!session || session.revokedAt) {
    return;
  }

  await db.orm.public.Session.where({ id: sessionId }).update({
    revokedAt: new Date().toISOString(),
  });
}

/** Revoke every session for a user (password reset / account recovery). */
export async function revokeAllSessionsForUser(userId: number) {
  const revokedAt = new Date().toISOString();
  const sessions = await db.orm.public.Session.where({ userId }).all();

  for (const session of sessions) {
    if (session.revokedAt) {
      continue;
    }
    await db.orm.public.Session.where({ id: session.id }).update({
      revokedAt,
    });
  }
}

export async function cleanupExpiredSessions() {
  const expiredSessions = await db.orm.public.Session.all();
  const now = Date.now();

  for (const session of expiredSessions) {
    if (new Date(session.expiresAt).getTime() <= now) {
      await db.orm.public.Session.where({ id: session.id }).delete();
    }
  }
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const claims = await verifySessionToken(token);

  if (!claims) {
    return null;
  }

  const session = await db.orm.public.Session.where({
    id: claims.sessionId,
  }).first();

  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    return null;
  }

  if (isExpired(session.expiresAt)) {
    return null;
  }

  if (session.userId !== claims.userId) {
    return null;
  }

  const user = await db.orm.public.User.select(
    "id",
    "email",
    "firstName",
    "lastName",
    "role",
    "emailVerified"
  )
    .where({
      id: claims.userId,
    })
    .first();

  if (!user) {
    return null;
  }

  return {
    user,
    sessionId: session.id,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const currentSession = await getCurrentSession();
  return currentSession?.user ?? null;
}
