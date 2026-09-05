/**
 * Password reset OTP + authorization (D14.2).
 * Codes are never stored in plaintext. Independent from email verification.
 */

import { createHash, randomBytes, randomInt } from "node:crypto";

export const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_AUTH_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_RESET_CODE_LENGTH = 6;
export const PASSWORD_RESET_COOKIE_NAME = "five_stars_password_reset";
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email, we've sent a password reset code.";

export const PASSWORD_RESET_CODE_ERROR =
  "The code is incorrect or has expired.";

const CODE_HASH_PREFIX = "five-stars-password-reset:";
const AUTH_HASH_PREFIX = "five-stars-password-reset-auth:";

export function generatePasswordResetCode() {
  // Inclusive 0..999999, zero-padded to 6 digits.
  const value = randomInt(0, 1_000_000);
  return String(value).padStart(PASSWORD_RESET_CODE_LENGTH, "0");
}

export function hashPasswordResetCode(code: string) {
  return createHash("sha256")
    .update(`${CODE_HASH_PREFIX}${code}`)
    .digest("hex");
}

export function generatePasswordResetAuthorizationToken() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetAuthorizationToken(token: string) {
  return createHash("sha256")
    .update(`${AUTH_HASH_PREFIX}${token}`)
    .digest("hex");
}

export function isSixDigitCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function normalizeResetEmail(email: string) {
  return email.trim().toLowerCase();
}

export function maskEmailForDisplay(email: string) {
  const normalized = normalizeResetEmail(email);
  const at = normalized.indexOf("@");
  if (at <= 0) {
    return "••••@••••";
  }
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}${"•".repeat(Math.max(local.length - 1, 4))}@${domain}`;
}

export function parsePasswordResetRequest(body: unknown) {
  if (!body || typeof body !== "object") {
    return { email: "" };
  }
  const email = normalizeResetEmail(
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, unknown>).email as string)
      : ""
  );
  return { email };
}

export function parsePasswordResetCodeInput(body: unknown) {
  if (!body || typeof body !== "object") {
    return { email: "", code: "" };
  }
  const payload = body as Record<string, unknown>;
  const email = normalizeResetEmail(
    typeof payload.email === "string" ? payload.email : ""
  );
  const rawCode = typeof payload.code === "string" ? payload.code.trim() : "";
  const code = rawCode.replace(/\D/g, "").slice(0, 6);
  return { email, code };
}

export function parsePasswordResetPasswordInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid password payload.");
  }
  const payload = body as Record<string, unknown>;
  const newPassword =
    typeof payload.newPassword === "string" ? payload.newPassword : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";

  if (!newPassword) {
    throw new Error("New password is required.");
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  return { newPassword };
}

export function getPasswordResetCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(PASSWORD_RESET_AUTH_TTL_MS / 1000),
  };
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

export type CodeAttemptEvaluation =
  | { outcome: "accept" }
  | {
      outcome: "reject";
      nextAttemptCount: number;
      invalidate: boolean;
    }
  | { outcome: "invalid" };

/**
 * Pure evaluation of a submitted OTP against a stored challenge row.
 */
export function evaluatePasswordResetCodeAttempt(input: {
  submittedCode: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: string;
  verifiedAt?: string | null;
  consumedAt?: string | null;
  now?: number;
}): CodeAttemptEvaluation {
  const now = input.now ?? Date.now();

  if (input.consumedAt || input.verifiedAt) {
    return { outcome: "invalid" };
  }

  if (!isSixDigitCode(input.submittedCode)) {
    return { outcome: "invalid" };
  }

  if (isExpiredIso(input.expiresAt, now)) {
    return { outcome: "invalid" };
  }

  if (input.attemptCount >= PASSWORD_RESET_MAX_ATTEMPTS) {
    return { outcome: "invalid" };
  }

  if (hashPasswordResetCode(input.submittedCode) === input.codeHash) {
    return { outcome: "accept" };
  }

  const nextAttemptCount = input.attemptCount + 1;
  return {
    outcome: "reject",
    nextAttemptCount,
    invalidate: nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS,
  };
}

export function isPasswordResetAuthorizationValid(input: {
  authorizationToken: string;
  authorizationTokenHash: string | null | undefined;
  authorizationExpiresAt: string | null | undefined;
  verifiedAt: string | null | undefined;
  consumedAt: string | null | undefined;
  now?: number;
}) {
  if (!input.authorizationToken || !input.authorizationTokenHash) {
    return false;
  }
  if (!input.verifiedAt || input.consumedAt) {
    return false;
  }
  if (isExpiredIso(input.authorizationExpiresAt, input.now)) {
    return false;
  }
  return (
    hashPasswordResetAuthorizationToken(input.authorizationToken) ===
    input.authorizationTokenHash
  );
}

export function isResendCooldownActive(
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
  return now - created < PASSWORD_RESET_RESEND_COOLDOWN_MS;
}
