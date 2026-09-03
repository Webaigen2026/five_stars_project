import "server-only";

import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-08-26.dahlia" satisfies Stripe.LatestApiVersion;

export class StripeConfigurationError extends Error {
  constructor(message = "Stripe is not configured.") {
    super(message);
  }
}

function readStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new StripeConfigurationError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY on the server."
    );
  }

  return secretKey;
}

let stripeClient: Stripe | null = null;

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
