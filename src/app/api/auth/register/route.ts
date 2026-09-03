import bcrypt from "bcryptjs";

import { issueEmailVerificationToken } from "../../../../lib/email-verification";
import { db } from "../../../../prisma/db";

const BCRYPT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class RegisterRequestError extends Error {
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

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const sqlState =
    "sqlState" in error && typeof error.sqlState === "string"
      ? error.sqlState
      : undefined;

  return sqlState === "23505";
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new RegisterRequestError("Invalid JSON body.", 400);
    }

    if (!body || typeof body !== "object") {
      throw new RegisterRequestError("Invalid registration payload.", 400);
    }

    const payload = body as Record<string, unknown>;
    const firstName = asTrimmedString(payload.firstName);
    const lastName = asTrimmedString(payload.lastName);
    const email = asTrimmedString(payload.email).toLowerCase();
    const password =
      typeof payload.password === "string" ? payload.password : "";
    const confirmPassword =
      typeof payload.confirmPassword === "string"
        ? payload.confirmPassword
        : "";

    if (!firstName) {
      throw new RegisterRequestError("First name is required.", 400);
    }

    if (!lastName) {
      throw new RegisterRequestError("Last name is required.", 400);
    }

    if (!email) {
      throw new RegisterRequestError("Email is required.", 400);
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new RegisterRequestError("Enter a valid email address.", 400);
    }

    if (!password) {
      throw new RegisterRequestError("Password is required.", 400);
    }

    if (password.length < 8) {
      throw new RegisterRequestError(
        "Password must be at least 8 characters.",
        400
      );
    }

    if (password !== confirmPassword) {
      throw new RegisterRequestError("Passwords do not match.", 400);
    }

    const existingUser = await db.orm.public.User.where({
      email,
    }).first();

    if (existingUser) {
      throw new RegisterRequestError(
        "An account with this email already exists.",
        409
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.orm.public.User.select(
      "id",
      "email",
      "firstName",
      "lastName"
    ).create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "CUSTOMER",
      emailVerified: false,
      failedLoginAttempts: 0,
    });

    await issueEmailVerificationToken(user.id, request);

    return Response.json(
      {
        success: true,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RegisterRequestError) {
      return jsonError(error.message, error.status);
    }

    if (isUniqueViolation(error)) {
      return jsonError("An account with this email already exists.", 409);
    }

    console.error("Failed to register user:", error);
    return jsonError("Unable to create account.", 500);
  }
}
