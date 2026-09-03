import { issueEmailVerificationToken } from "../../../../lib/email-verification";
import { db } from "../../../../prisma/db";

const GENERIC_SUCCESS = {
  success: true,
  message:
    "If an eligible account exists, a verification link has been generated.",
} as const;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(GENERIC_SUCCESS);
    }

    const email = asTrimmedString(
      body && typeof body === "object"
        ? (body as Record<string, unknown>).email
        : ""
    ).toLowerCase();

    if (!email) {
      return Response.json(GENERIC_SUCCESS);
    }

    const user = await db.orm.public.User.where({ email }).first();

    if (user && !user.emailVerified) {
      await issueEmailVerificationToken(user.id, request);
    }
  } catch (error) {
    console.error("Failed to resend verification:", error);
  }

  return Response.json(GENERIC_SUCCESS);
}
