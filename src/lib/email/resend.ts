/**
 * Server-only Resend transactional email client (D14.1 / D14.3).
 * Never import from client components.
 */

import "server-only";

import { Resend } from "resend";

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly causeCode?: string
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export const EMAIL_SEND_FAILURE_MESSAGE =
  "We couldn't send the verification email. Please try again.";

export function isEmailConfigured(
  env: NodeJS.ProcessEnv = process.env
) {
  return Boolean(
    env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim()
  );
}

export function readEmailFrom(env: NodeJS.ProcessEnv = process.env) {
  const from = env.EMAIL_FROM?.trim();
  if (!from) {
    throw new EmailConfigurationError(
      "EMAIL_FROM is not configured."
    );
  }
  return from;
}

export function readResendApiKey(env: NodeJS.ProcessEnv = process.env) {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new EmailConfigurationError(
      "RESEND_API_KEY is not configured."
    );
  }
  return key;
}

let resendClient: Resend | null = null;

export function getResendClient(env: NodeJS.ProcessEnv = process.env) {
  if (!resendClient) {
    resendClient = new Resend(readResendApiKey(env));
  }
  return resendClient;
}

/** Test helper — reset singleton between tests. */
export function resetResendClientForTests() {
  resendClient = null;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult = {
  id: string | null;
};

export type SendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailOptions = {
  /** Deterministic Resend Idempotency-Key (D14.3 concurrency/retry complement). */
  idempotencyKey?: string;
};

export type SendEmailFn = (
  payload: SendEmailPayload,
  options?: SendEmailOptions
) => Promise<{
  id?: string | null;
  error?: { message?: string; name?: string } | null;
}>;

export async function sendTransactionalEmail(
  input: SendEmailInput,
  deps?: {
    env?: NodeJS.ProcessEnv;
    send?: SendEmailFn;
    idempotencyKey?: string;
  }
): Promise<SendEmailResult> {
  const env = deps?.env ?? process.env;
  const from = readEmailFrom(env);
  const idempotencyKey = deps?.idempotencyKey?.trim() || undefined;
  const sendOptions: SendEmailOptions | undefined = idempotencyKey
    ? { idempotencyKey }
    : undefined;

  if (!input.to.trim()) {
    throw new EmailDeliveryError("A recipient email is required.");
  }

  const payload: SendEmailPayload = {
    from,
    to: input.to.trim(),
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  try {
    if (deps?.send) {
      const result = await deps.send(payload, sendOptions);

      if (result.error) {
        throw new EmailDeliveryError(
          EMAIL_SEND_FAILURE_MESSAGE,
          result.error.name ?? "provider_error"
        );
      }

      return { id: result.id ?? null };
    }

    const resend = getResendClient(env);
    const { data, error } = await resend.emails.send(
      {
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      },
      sendOptions?.idempotencyKey
        ? { idempotencyKey: sendOptions.idempotencyKey }
        : undefined
    );

    if (error) {
      throw new EmailDeliveryError(
        EMAIL_SEND_FAILURE_MESSAGE,
        error.name ?? "provider_error"
      );
    }

    return { id: data?.id ?? null };
  } catch (error) {
    if (
      error instanceof EmailConfigurationError ||
      error instanceof EmailDeliveryError
    ) {
      throw error;
    }

    throw new EmailDeliveryError(EMAIL_SEND_FAILURE_MESSAGE, "unexpected");
  }
}
