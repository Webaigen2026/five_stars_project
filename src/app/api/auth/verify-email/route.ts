import {
  hashVerificationToken,
} from "../../../../lib/email-verification";
import { db } from "../../../../prisma/db";

const INVALID_TOKEN_MESSAGE =
  "This verification link is invalid or has expired.";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isExpired(expiresAt: string) {
  const expiresAtDate = new Date(expiresAt);

  if (Number.isNaN(expiresAtDate.getTime())) {
    return true;
  }

  return expiresAtDate.getTime() <= Date.now();
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }

    const token = asTrimmedString(
      body && typeof body === "object"
        ? (body as Record<string, unknown>).token
        : ""
    );

    if (!token) {
      return Response.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }

    const tokenHash = hashVerificationToken(token);
    const verificationToken =
      await db.orm.public.EmailVerificationToken.where({
        tokenHash,
      }).first();

    if (!verificationToken || isExpired(verificationToken.expiresAt)) {
      if (verificationToken) {
        await db.orm.public.EmailVerificationToken.where({
          id: verificationToken.id,
        }).delete();
      }

      return Response.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }

    const user = await db.orm.public.User.where({
      id: verificationToken.userId,
    }).first();

    if (!user) {
      await db.orm.public.EmailVerificationToken.where({
        id: verificationToken.id,
      }).delete();

      return Response.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.User.where({ id: user.id }).update({
        emailVerified: true,
      });

      await tx.orm.public.EmailVerificationToken.where({
        id: verificationToken.id,
      }).delete();
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to verify email:", error);
    return Response.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 });
  }
}
