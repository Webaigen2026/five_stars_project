/**
 * D13.2 Stripe TEST-MODE prerequisite check.
 * Does not call Stripe network. Does not print secrets.
 *
 * Usage:
 *   npx tsx scripts/check-stripe-test-mode.ts
 */

import "dotenv/config";

import {
  getStripeSecretMode,
  isStripeConfigured,
  isStripeTestModeReady,
  isStripeWebhookConfigured,
} from "../src/lib/payments";

function main() {
  const secretMode = getStripeSecretMode();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const publishableMode = !publishable
    ? "missing"
    : publishable.startsWith("pk_live_")
      ? "live"
      : publishable.startsWith("pk_test_")
        ? "test"
        : "unknown";

  const report = {
    phase: "D13.2",
    liveStripeDisabled: true,
    STRIPE_SECRET_KEY_mode: secretMode,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_mode: publishableMode,
    STRIPE_WEBHOOK_SECRET: isStripeWebhookConfigured() ? "present" : "missing",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim() || "missing",
    isStripeConfigured: isStripeConfigured(),
    isStripeTestModeReady: isStripeTestModeReady(),
    webhookForwardCommand:
      "stripe listen --forward-to localhost:3000/api/stripe/webhook",
    expireSessionCommand: "stripe checkout sessions expire cs_test_...",
    readyForManualE2E:
      isStripeTestModeReady() &&
      isStripeWebhookConfigured() &&
      publishableMode !== "live" &&
      secretMode === "test",
  };

  console.log(JSON.stringify(report, null, 2));

  if (secretMode === "live" || publishableMode === "live") {
    console.error("REJECTED: live Stripe keys detected. D13.2 is TEST MODE only.");
    process.exitCode = 2;
    return;
  }

  if (!report.readyForManualE2E) {
    console.error(
      "NOT READY: add Stripe TEST keys + webhook secret to local .env (never commit)."
    );
    process.exitCode = 1;
  }
}

main();
