"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CONTACT_STATUSES } from "../../../lib/contact";

type ContactMessageActionsProps = {
  messageId: number;
  currentStatus: string;
  currentInternalNote: string | null;
};

export default function ContactMessageActions({
  messageId,
  currentStatus,
  currentInternalNote,
}: ContactMessageActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [internalNote, setInternalNote] = useState(currentInternalNote ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
    setInternalNote(currentInternalNote ?? "");
  }, [currentStatus, currentInternalNote]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          internalNote,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to update message.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label
          htmlFor="contact-status"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Status
        </label>
        <select
          id="contact-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {!CONTACT_STATUSES.includes(
            currentStatus as (typeof CONTACT_STATUSES)[number]
          ) && <option value={currentStatus}>{currentStatus}</option>}
          {CONTACT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="contact-internal-note"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Internal note
        </label>
        <textarea
          id="contact-internal-note"
          value={internalNote}
          onChange={(event) => setInternalNote(event.target.value)}
          maxLength={5000}
          rows={5}
          placeholder="Visible only to staff and admins"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Save updates"}
      </button>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
