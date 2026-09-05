/**
 * Booking transactional email send helpers (D14.3).
 */

import "server-only";

import type { BookingEmailContent } from "./booking-email-content";
import {
  EMAIL_SEND_FAILURE_MESSAGE,
  EmailConfigurationError,
  EmailDeliveryError,
  sendTransactionalEmail,
  type SendEmailFn,
} from "./resend";
import { buildBookingCreatedEmail } from "./templates/booking-created";
import { buildBookingPaymentReceivedEmail } from "./templates/booking-payment-received";

export async function sendBookingCreatedEmail(input: {
  to: string;
  content: BookingEmailContent;
  idempotencyKey: string;
  send?: SendEmailFn;
  env?: NodeJS.ProcessEnv;
}) {
  const template = buildBookingCreatedEmail(input.content);

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
        idempotencyKey: input.idempotencyKey,
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

export async function sendBookingPaymentReceivedEmail(input: {
  to: string;
  content: BookingEmailContent;
  idempotencyKey: string;
  send?: SendEmailFn;
  env?: NodeJS.ProcessEnv;
}) {
  const template = buildBookingPaymentReceivedEmail(input.content);

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
        idempotencyKey: input.idempotencyKey,
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
