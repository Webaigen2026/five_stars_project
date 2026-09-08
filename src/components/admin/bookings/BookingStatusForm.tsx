"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatusFormProps = {
  bookingId: number;
  currentStatus: string;
  allowedTransitions: string[];
};

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function BookingStatusForm({
  bookingId,
  currentStatus,
  allowedTransitions,
}: BookingStatusFormProps) {
  const router = useRouter();

  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus("");
  }, [currentStatus, allowedTransitions]);

  if (allowedTransitions.length === 0) {
    return (
      <div
        className="
          mt-6
          border-t
          border-dashed
          border-slate-200
          pt-5
        "
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Status management
        </p>

        <div
          className="
            mt-3
            border-l-2
            border-slate-300
            bg-slate-50/70
            px-4
            py-3
          "
        >
          <p className="text-sm leading-6 text-slate-600">
            No manual status changes are available for this booking.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !status) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to update status.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
        mt-6
        border-t
        border-dashed
        border-slate-200
        pt-5
      "
    >
      {/* Header */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
          Status management
        </p>

        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Choose the next valid status for this booking.
        </p>
      </div>

      {/* Controls */}
      <div
        className="
          grid
          gap-3
          sm:grid-cols-[minmax(0,1fr)_auto]
          sm:items-end
        "
      >
        <div className="min-w-0">
          <label
            htmlFor="booking-status"
            className="
              mb-2
              block
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-500
            "
          >
            Next status
          </label>

          <div className="relative">
            <select
              id="booking-status"
              value={status}
              required
              onChange={(event) => {
                setStatus(event.target.value);
                setError(null);
              }}
              className="
                min-h-12
                w-full
                appearance-none
                rounded-lg
                border
                border-slate-300
                bg-white
                px-4
                py-3
                pr-11
                text-sm
                font-medium
                text-slate-950
                outline-none
                transition
                hover:border-slate-400
                focus:border-[#0078D2]
                focus:ring-2
                focus:ring-[#0078D2]/15
              "
            >
              <option value="" disabled>
                Select a new status
              </option>

              {allowedTransitions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            >
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !status}
          className="
            group
            inline-flex
            min-h-12
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-[#0078D2]
            px-5
            py-3
            text-sm
            font-semibold
            text-white
            shadow-[0_4px_12px_rgba(0,120,210,0.16)]
            transition
            hover:bg-[#006bbd]
            hover:shadow-[0_7px_18px_rgba(0,120,210,0.22)]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-[#0078D2]/30
            focus-visible:ring-offset-2
            disabled:cursor-not-allowed
            disabled:opacity-50
            disabled:shadow-none
            sm:min-w-[155px]
          "
        >
          <span>{isSubmitting ? "Saving..." : "Update status"}</span>

          {!isSubmitting ? (
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRightIcon />
            </span>
          ) : null}
        </button>
      </div>

      {/* Error */}
      {error ? (
        <div
          role="alert"
          className="
            mt-4
            border-l-2
            border-rose-500
            bg-rose-50
            px-4
            py-3
          "
        >
          <p className="text-sm font-medium text-rose-700">
            {error}
          </p>
        </div>
      ) : null}
    </form>
  );
}