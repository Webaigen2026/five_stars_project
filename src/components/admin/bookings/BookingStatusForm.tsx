"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatusFormProps = {
  bookingId: number;
  currentStatus: string;
  allowedTransitions: string[];
};

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
      <p className="mt-6 text-sm text-slate-600">
        No manual status changes available.
      </p>
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
    <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1">
        <label
          htmlFor="booking-status"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Next status
        </label>
        <select
          id="booking-status"
          value={status}
          required
          onChange={(event) => setStatus(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !status}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Update status"}
      </button>

      {error && (
        <p className="w-full text-sm font-medium text-red-600">{error}</p>
      )}
    </form>
  );
}
