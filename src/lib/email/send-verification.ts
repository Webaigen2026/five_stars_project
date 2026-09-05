/**
 * Verification email delivery (D14.1).
 * Presentation + provider stay separate from auth token issuance.
 */

import "server-only";

import {
  EMAIL_SEND_FAILURE_MESSAGE,
  EmailConfigurationError,
  EmailDeliveryError,
  sendTransactionalEmail,
  type SendEmailInput,
} from "./resend";
import { buildVerifyEmailTemplate } from "./templates/verify-email";

export { EMAIL_SEND_FAILURE_MESSAGE };

type SendFn = (payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) => Promise<{
  id?: string | null;
  error?: { message?: string; name?: string } | null;
}>;

export async function sendVerificationEmail(input: {
  to: string;
  verificationUrl: string;
  expiresInLabel?: string;
  send?: SendFn;
  env?: NodeJS.ProcessEnv;
}) {
  const template = buildVerifyEmailTemplate({
    verificationUrl: input.verificationUrl,
    expiresInLabel: input.expiresInLabel ?? "24 hours",
    recipientEmail: input.to,
  });

  const payload: SendEmailInput = {
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  };

  try {
    const result = await sendTransactionalEmail(payload, {
      env: input.env,
      send: input.send,
    });

    return {
      ok: true as const,
      id: result.id,
      subject: template.subject,
    };
  } catch (error) {
    if (
      error instanceof EmailDeliveryError ||
      error instanceof EmailConfigurationError
    ) {
      throw error instanceof EmailDeliveryError
        ? error
        : new EmailDeliveryError(EMAIL_SEND_FAILURE_MESSAGE, "config");
    }

    throw new EmailDeliveryError(EMAIL_SEND_FAILURE_MESSAGE, "unexpected");
  }
}

export function getSafeVerificationEmailErrorMessage(_error: unknown) {
  return EMAIL_SEND_FAILURE_MESSAGE;
}
