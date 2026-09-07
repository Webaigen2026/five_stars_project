import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  createUserSession,
  getSessionCookieOptions,
} from "../../../../lib/auth";
import {
  ACCOUNT_LOCKED_LOGIN_MESSAGE,
  ACCOUNT_LOCKED_STATUS,
  clearedLockoutState,
  isAccountLocked,
} from "../../../../lib/account-lockout";
import { recordFailedLoginAttempt } from "../../../../lib/account-lockout-db";
import { canSignInWithCredentials } from "../../../../lib/auth-email-policy";
import { db } from "../../../../prisma/db";

class LoginRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new LoginRequestError("Invalid JSON body.", 400);
    }

    if (!body || typeof body !== "object") {
      throw new LoginRequestError("Invalid login payload.", 400);
    }

    const payload = body as Record<string, unknown>;
    const email = asTrimmedString(payload.email).toLowerCase();
    const password =
      typeof payload.password === "string" ? payload.password : "";

    if (!email) {
      throw new LoginRequestError("Email is required.", 400);
    }

    if (!password) {
      throw new LoginRequestError("Password is required.", 400);
    }

    const user = await db.orm.public.User.where({ email }).first();

    if (!user) {
      throw new LoginRequestError("Invalid email or password.", 401);
    }

    if (isAccountLocked(user.lockedUntil)) {
      throw new LoginRequestError(
        ACCOUNT_LOCKED_LOGIN_MESSAGE,
        ACCOUNT_LOCKED_STATUS
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      await recordFailedLoginAttempt(user.id);
      throw new LoginRequestError("Invalid email or password.", 401);
    }

    // D14.1.1: emailVerified does not block ordinary customer sign-in.
    if (
      !canSignInWithCredentials({
        emailVerified: user.emailVerified,
      })
    ) {
      throw new LoginRequestError("Invalid email or password.", 401);
    }

    await db.orm.public.User.where({ id: user.id }).update(
      clearedLockoutState()
    );

    const token = await createUserSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof LoginRequestError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to log in:", error);
    return jsonError("Unable to sign in.", 500);
  }
}
