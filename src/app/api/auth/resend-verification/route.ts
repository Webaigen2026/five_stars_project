import { issueEmailVerificationToken } from "../../../../lib/email-verification";
import {
  getSafeVerificationEmailErrorMessage,
  sendVerificationEmail,
} from "../../../../lib/email/send-verification";
import {
  EmailConfigurationError,
  EmailDeliveryError,
} from "../../../../lib/email/resend";
import { db } from "../../../../prisma/db";

const GENERIC_SUCCESS = {
  success: true,
  message:
    "If an eligible account exists, a verification link has been sent.",
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
      const { url } = await issueEmailVerificationToken(user.id);

      try {
        const sent = await sendVerificationEmail({
          to: user.email,
          verificationUrl: url,
        });
        console.log("Verification email resent", {
          userId: user.id,
          provider: "resend",
          messageId: sent.id,
        });
      } catch (error) {
        console.error("Failed to resend verification email", {
          userId: user.id,
          provider: "resend",
          code:
            error instanceof EmailDeliveryError ||
            error instanceof EmailConfigurationError
              ? error.name
              : "unexpected",
          message: getSafeVerificationEmailErrorMessage(error),
        });
        // Keep generic success to avoid email enumeration.
      }
    }
  } catch (error) {
    console.error("Failed to resend verification:", error);
  }

  return Response.json(GENERIC_SUCCESS);
}
