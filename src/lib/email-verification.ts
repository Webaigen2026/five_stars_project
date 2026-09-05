import { createHash, randomBytes } from "node:crypto";

import { requireCanonicalAppUrl, joinAppPath } from "./app-url";
import { db } from "../prisma/db";

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * @deprecated Prefer getCanonicalAppUrl / requireCanonicalAppUrl.
 * Kept temporarily for any callers; no longer uses request Host.
 */
export function getAppBaseUrl(_request?: Request) {
  return requireCanonicalAppUrl();
}

export function buildVerificationUrl(baseUrl: string, rawToken: string) {
  const path = `/verify-email?token=${encodeURIComponent(rawToken)}`;
  return joinAppPath(baseUrl, path);
}

export async function deleteVerificationTokensForUser(userId: number) {
  await db.orm.public.EmailVerificationToken.where({
    userId,
  }).delete();
}

/**
 * Creates a hashed verification token for the user.
 * Does not send email — callers must use sendVerificationEmail.
 */
export async function issueEmailVerificationToken(userId: number) {
  await deleteVerificationTokensForUser(userId);

  const rawToken = generateVerificationToken();
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();

  await db.orm.public.EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  const url = buildVerificationUrl(requireCanonicalAppUrl(), rawToken);

  console.log("Issued email verification token", {
    userId,
    expiresAt,
  });

  return { rawToken, url };
}
