import { createHash, randomBytes } from "node:crypto";

import { db } from "../prisma/db";

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAppBaseUrl(request: Request) {
  const fromEnv = process.env.APP_URL ?? process.env.NEXTAUTH_URL;

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

export function buildVerificationUrl(baseUrl: string, rawToken: string) {
  return `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

export function logVerificationUrl(url: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Email verification URL: ${url}`);
  }
}

export async function deleteVerificationTokensForUser(userId: number) {
  await db.orm.public.EmailVerificationToken.where({
    userId,
  }).delete();
}

export async function issueEmailVerificationToken(
  userId: number,
  request: Request
) {
  await deleteVerificationTokensForUser(userId);

  const rawToken = generateVerificationToken();
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();

  await db.orm.public.EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  const url = buildVerificationUrl(getAppBaseUrl(request), rawToken);
  logVerificationUrl(url);

  return { rawToken, url };
}
