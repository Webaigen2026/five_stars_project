import "server-only";

import Stripe from "stripe";

import {
  getStripeSecretMode,
  isStripeConfigured,
} from "./payments";

export const STRIPE_API_VERSION = "2026-08-26.dahlia" satisfies Stripe.LatestApiVersion;

export class StripeConfigurationError extends Error {
  constructor(message = "Stripe is not configured.") {
    super(message);
  }
}

/**
 * D13.2: reject live-mode secrets. Do not log the key.
 */
export function assertStripeSecretIsTestMode(secretKey: string) {
  const mode = getStripeSecretMode(secretKey);
  if (mode === "live") {
    throw new StripeConfigurationError(
      "Live Stripe keys are disabled for this phase. Use a Stripe TEST mode secret key (sk_test_...)."
    );
  }
}

export function isStripeSecretTestMode(secretKey: string | null | undefined) {
  return getStripeSecretMode(secretKey) === "test";
}

function readStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new StripeConfigurationError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY on the server."
    );
  }

  assertStripeSecretIsTestMode(secretKey);

  return secretKey;
}

let stripeClient: Stripe | null = null;

export { isStripeConfigured };

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(readStripeSecretKey(), {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  return stripeClient;
}

export function getStripeAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (!appUrl) {
    throw new StripeConfigurationError(
      "Stripe is not configured. Set NEXT_PUBLIC_APP_URL on the server."
    );
  }

  return appUrl;
}

export function getStripePaymentIntentId(
  paymentIntent: string | { id: string } | null
) {
  if (typeof paymentIntent === "string" && paymentIntent) {
    return paymentIntent;
  }

  if (paymentIntent && typeof paymentIntent === "object" && paymentIntent.id) {
    return paymentIntent.id;
  }

  return null;
}

/**
 * After Stripe Checkout Session creation fails, restore sale inventory only.
 * SeatAssignment rows are intentional pre-payment selections and must remain.
 * See payment-checkout.shouldReleaseSeatsOnCheckoutSessionFailure().
 */
export { shouldReleaseSeatsOnCheckoutSessionFailure } from "./payment-checkout";
