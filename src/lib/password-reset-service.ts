/**
 * Password-reset challenge lifecycle (D14.2).
 * Server-only. Never logs raw codes, hashes, passwords, or auth secrets.
 */

import "server-only";

import bcrypt from "bcryptjs";

import {
  EmailConfigurationError,
  EmailDeliveryError,
} from "./email/resend";
import { sendPasswordResetCodeEmail } from "./email/send-password-reset";
import {
  PASSWORD_RESET_AUTH_TTL_MS,
  PASSWORD_RESET_CODE_ERROR,
  PASSWORD_RESET_CODE_TTL_MS,
  PASSWORD_RESET_GENERIC_MESSAGE,
  generatePasswordResetAuthorizationToken,
  generatePasswordResetCode,
  hashPasswordResetAuthorizationToken,
  hashPasswordResetCode,
  isExpiredIso,
  isSixDigitCode,
  normalizeResetEmail,
  parsePasswordResetPasswordInput,
  evaluatePasswordResetCodeAttempt,
  isResendCooldownActive,
} from "./password-reset";
import { db } from "../prisma/db";

const BCRYPT_ROUNDS = 12;

export class PasswordResetError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PasswordResetError";
  }
}

type SendFn = Parameters<typeof sendPasswordResetCodeEmail>[0]["send"];

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

async function deleteChallengesForUser(userId: number) {
  await db.orm.public.PasswordResetCode.where({ userId }).delete();
}

/**
 * Request a password-reset code. Always returns the same customer-facing
 * message (account enumeration safe). Does not expose whether email exists.
 */
export async function requestPasswordResetCode(input: {
  email: string;
  send?: SendFn;
  env?: NodeJS.ProcessEnv;
}) {
  const email = normalizeResetEmail(input.email);

  if (!email) {
    return {
      success: true as const,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    };
  }

  try {
    const user = await db.orm.public.User.where({ email }).first();

    if (!user) {
      return {
        success: true as const,
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      };
    }

    const existing = await db.orm.public.PasswordResetCode.where({
      userId: user.id,
    }).all();
    const latestCreatedAt = latestChallengeCreatedAt(existing);

    if (latestCreatedAt && isResendCooldownActive(latestCreatedAt)) {
      console.log("Password reset request throttled", {
        userId: user.id,
        operation: "forgot-password",
      });
      return {
        success: true as const,
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      };
    }

    const code = generatePasswordResetCode();
    const codeHash = hashPasswordResetCode(code);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_CODE_TTL_MS
    ).toISOString();

    let challengeId: number | null = null;

    await db.transaction(async (tx) => {
      await tx.orm.public.PasswordResetCode.where({
        userId: user.id,
      }).delete();

      await tx.orm.public.PasswordResetCode.create({
        userId: user.id,
        codeHash,
        expiresAt,
        attemptCount: 0,
      });
    });

    const created = await db.orm.public.PasswordResetCode.where({
      userId: user.id,
      codeHash,
    }).first();
    challengeId = created?.id ?? null;

    try {
      const sent = await sendPasswordResetCodeEmail({
        to: user.email,
        code,
        send: input.send,
        env: input.env,
      });

      console.log("Password reset code email sent", {
        userId: user.id,
        provider: "resend",
        messageId: sent.id,
        operation: "forgot-password",
      });
    } catch (error) {
      if (challengeId != null) {
        await db.orm.public.PasswordResetCode.where({
          id: challengeId,
        }).delete();
      }

      console.error("Password reset email delivery failed", {
        userId: user.id,
        provider: "resend",
        operation: "forgot-password",
        code:
          error instanceof EmailDeliveryError ||
          error instanceof EmailConfigurationError
            ? error.name
            : "unexpected",
      });
    }
  } catch (error) {
    console.error("Password reset request failed", {
      operation: "forgot-password",
      code: error instanceof Error ? error.name : "unexpected",
    });
  }

  return {
    success: true as const,
    message: PASSWORD_RESET_GENERIC_MESSAGE,
  };
}

/**
 * Verify a six-digit code and issue a short-lived reset authorization token.
 */
export async function verifyPasswordResetCode(input: {
  email: string;
  code: string;
}) {
  const email = normalizeResetEmail(input.email);
  const code = input.code.trim();

  if (!email || !isSixDigitCode(code)) {
    throw new PasswordResetError(PASSWORD_RESET_CODE_ERROR, 400);
  }

  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    throw new PasswordResetError(PASSWORD_RESET_CODE_ERROR, 400);
  }

  const challenges = await db.orm.public.PasswordResetCode.where({
    userId: user.id,
  }).all();

  const challenge = challenges
    .filter((row) => !row.consumedAt && !row.verifiedAt)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
    )[0];

  if (!challenge || isExpiredIso(challenge.expiresAt)) {
    if (challenge) {
      await db.orm.public.PasswordResetCode.where({
        id: challenge.id,
      }).delete();
    }
    throw new PasswordResetError(PASSWORD_RESET_CODE_ERROR, 400);
  }

  const evaluation = evaluatePasswordResetCodeAttempt({
    submittedCode: code,
    codeHash: challenge.codeHash,
    attemptCount: challenge.attemptCount,
    expiresAt: challenge.expiresAt,
    verifiedAt: challenge.verifiedAt,
    consumedAt: challenge.consumedAt,
  });

  if (evaluation.outcome === "invalid") {
    throw new PasswordResetError(PASSWORD_RESET_CODE_ERROR, 400);
  }

  if (evaluation.outcome === "reject") {
    if (evaluation.invalidate) {
      await db.orm.public.PasswordResetCode.where({
        id: challenge.id,
      }).delete();
    } else {
      await db.orm.public.PasswordResetCode.where({
        id: challenge.id,
      }).update({
        attemptCount: evaluation.nextAttemptCount,
      });
    }

    throw new PasswordResetError(PASSWORD_RESET_CODE_ERROR, 400);
  }

  const authorizationToken = generatePasswordResetAuthorizationToken();
  const authorizationTokenHash =
    hashPasswordResetAuthorizationToken(authorizationToken);
  const verifiedAt = new Date().toISOString();
  const authorizationExpiresAt = new Date(
    Date.now() + PASSWORD_RESET_AUTH_TTL_MS
  ).toISOString();

  await db.orm.public.PasswordResetCode.where({ id: challenge.id }).update({
    verifiedAt,
    authorizationTokenHash,
    authorizationExpiresAt,
  });

  console.log("Password reset code verified", {
    userId: user.id,
    operation: "verify-password-reset-code",
  });

  return {
    success: true as const,
    authorizationToken,
    email: user.email,
  };
}

/**
 * Complete password reset using the HttpOnly authorization token.
 */
export async function completePasswordReset(input: {
  authorizationToken: string | undefined | null;
  body: unknown;
}) {
  const token = input.authorizationToken?.trim() ?? "";

  if (!token) {
    throw new PasswordResetError(
      "Your password reset session has expired. Please request a new code.",
      401
    );
  }

  let passwords: { newPassword: string };

  try {
    passwords = parsePasswordResetPasswordInput(input.body);
  } catch (error) {
    throw new PasswordResetError(
      error instanceof Error ? error.message : "Invalid password payload.",
      400
    );
  }

  const authorizationTokenHash =
    hashPasswordResetAuthorizationToken(token);

  const challenges = await db.orm.public.PasswordResetCode.where({
    authorizationTokenHash,
  }).all();
  const challenge = challenges[0] ?? null;

  if (
    !challenge ||
    challenge.consumedAt ||
    !challenge.verifiedAt ||
    isExpiredIso(challenge.authorizationExpiresAt)
  ) {
    if (challenge && !challenge.consumedAt) {
      await db.orm.public.PasswordResetCode.where({
        id: challenge.id,
      }).delete();
    }
    throw new PasswordResetError(
      "Your password reset session has expired. Please request a new code.",
      401
    );
  }

  const user = await db.orm.public.User.where({
    id: challenge.userId,
  }).first();

  if (!user) {
    throw new PasswordResetError(
      "Your password reset session has expired. Please request a new code.",
      401
    );
  }

  const hashedPassword = await bcrypt.hash(
    passwords.newPassword,
    BCRYPT_ROUNDS
  );
  const consumedAt = new Date().toISOString();

  await db.transaction(async (tx) => {
    const locked = await tx.orm.public.PasswordResetCode.where({
      id: challenge.id,
    }).first();

    if (
      !locked ||
      locked.consumedAt ||
      locked.authorizationTokenHash !== authorizationTokenHash
    ) {
      throw new PasswordResetError(
        "Your password reset session has expired. Please request a new code.",
        401
      );
    }

    await tx.orm.public.User.where({ id: user.id }).update({
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await tx.orm.public.PasswordResetCode.where({ id: challenge.id }).update({
      consumedAt,
      authorizationTokenHash: null,
      authorizationExpiresAt: null,
    });

    const leftovers = await tx.orm.public.PasswordResetCode.where({
      userId: user.id,
    }).all();

    for (const row of leftovers) {
      if (row.id === challenge.id || row.consumedAt) {
        continue;
      }
      await tx.orm.public.PasswordResetCode.where({ id: row.id }).delete();
    }

    const sessions = await tx.orm.public.Session.where({
      userId: user.id,
    }).all();
    const revokedAt = new Date().toISOString();

    for (const session of sessions) {
      if (session.revokedAt) {
        continue;
      }
      await tx.orm.public.Session.where({ id: session.id }).update({
        revokedAt,
      });
    }
  });

  console.log("Password reset completed", {
    userId: user.id,
    operation: "reset-password",
  });

  return {
    success: true as const,
    message:
      "Your password has been changed successfully. For security, please sign in again.",
  };
}

/** Test helper: hash + compare without touching DB. */
export async function hashPasswordForTests(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function passwordsMatchForTests(
  password: string,
  hash: string
) {
  return bcrypt.compare(password, hash);
}

export { deleteChallengesForUser };
