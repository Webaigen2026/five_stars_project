"use client";

import { useId, useState } from "react";
import Link from "next/link";

import CheckoutPaymentButton from "./CheckoutPaymentButton";
import type { CheckoutPaymentAction } from "../../lib/checkout";

export default function CheckoutPaymentPanel({
  bookingReference,
  paymentAction,
}: {
  bookingReference: string;
  paymentAction: CheckoutPaymentAction;
}) {
  const confirmId = useId();
  const [confirmed, setConfirmed] = useState(false);
  const showConfirmation =
    paymentAction === "ready" || paymentAction === "unavailable";

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-slate-600">
        Seats are subject to availability until payment is confirmed.
      </p>

      {showConfirmation ? (
        <label
          htmlFor={confirmId}
          className="flex items-start gap-3 text-sm text-slate-700"
        >
          <input
            id={confirmId}
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
          />
          <span>
            I confirm that the traveler names and trip details are correct.
          </span>
        </label>
      ) : null}

      {paymentAction === "ready" ? (
        <CheckoutPaymentButton
          bookingReference={bookingReference}
          disabled={!confirmed}
        />
      ) : null}

      {paymentAction === "unavailable" ? (
        <div>
          <p className="text-sm font-medium text-slate-600">
            Online payment is not available yet.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 font-semibold text-slate-500"
          >
            Continue to Payment
          </button>
        </div>
      ) : null}

      {paymentAction === "signin" ? (
        <div>
          <p className="text-sm font-medium text-slate-600">
            Sign in is required before payment.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Sign in to continue
          </Link>
        </div>
      ) : null}

      {paymentAction === "ineligible" ? (
        <p className="text-sm font-medium text-slate-600">
          Payment is not available for this booking.
        </p>
      ) : null}
    </div>
  );
}
