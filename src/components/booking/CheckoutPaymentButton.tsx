"use client";

import { useState } from "react";

export default function CheckoutPaymentButton({
  bookingReference,
  disabled = false,
}: {
  bookingReference: string;
  disabled?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isSubmitting || disabled) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingReference }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; checkoutUrl?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to start payment.");
        return;
      }

      if (!payload?.checkoutUrl) {
        setError("Payment session was created, but no checkout URL was returned.");
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      setError("Unable to start payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSubmitting || disabled}
        className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Preparing payment..." : "Continue to Payment"}
      </button>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
