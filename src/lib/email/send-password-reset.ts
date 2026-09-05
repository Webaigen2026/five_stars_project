/**
 * Password reset code email delivery (D14.2).
 */

import "server-only";

import {
  EMAIL_SEND_FAILURE_MESSAGE,
  EmailConfigurationError,
  EmailDeliveryError,
  sendTransactionalEmail,
} from "./resend";
import { buildPasswordResetCodeEmail } from "./templates/password-reset";

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

export async function sendPasswordResetCodeEmail(input: {
  to: string;
  code: string;
  send?: SendFn;
  env?: NodeJS.ProcessEnv;
}) {
  const template = buildPasswordResetCodeEmail({
    code: input.code,
    expiresInLabel: "10 minutes",
  });

  try {
    const result = await sendTransactionalEmail(
      {
        to: input.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      },
      {
        env: input.env,
        send: input.send,
      }
    );

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
