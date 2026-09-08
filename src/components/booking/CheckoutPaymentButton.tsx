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
        setError(
          payload?.error ?? "We couldn't start payment. Please try again."
        );
        return;
      }

      if (!payload?.checkoutUrl) {
        setError("We couldn't start payment. Please try again.");
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      setError("We couldn't start payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSubmitting || disabled}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0078D2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#006bbd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Preparing payment..." : "Pay securely"}
      </button>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
