"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RequestStatusFormProps = {
  actionUrl: string;
  currentStatus: string;
  statuses: readonly string[];
};

export default function RequestStatusForm({
  actionUrl,
  currentStatus,
  statuses,
}: RequestStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(actionUrl, {
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
          htmlFor="request-status"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Status
        </label>
        <select
          id="request-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {!statuses.includes(currentStatus) && (
            <option value={currentStatus}>{currentStatus}</option>
          )}
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
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
