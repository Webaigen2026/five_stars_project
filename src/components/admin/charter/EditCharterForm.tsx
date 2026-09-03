"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  CHARTER_STATUSES,
  type SafeCharterRequest,
} from "../../../lib/charter";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function EditCharterForm({
  charterRequest,
}: {
  charterRequest: SafeCharterRequest;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/charter/${charterRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          origin: String(formData.get("origin") ?? ""),
          destination: String(formData.get("destination") ?? ""),
          departureDate: String(formData.get("departureDate") ?? ""),
          returnDate: String(formData.get("returnDate") ?? ""),
          passengerCount: Number(formData.get("passengerCount")),
          aircraftPreference: String(formData.get("aircraftPreference") ?? ""),
          budget: String(formData.get("budget") ?? ""),
          notes: String(formData.get("notes") ?? ""),
          status: String(formData.get("status") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to update charter request.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update charter request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
      <Field label="Full name" htmlFor="admin-charter-fullName">
        <input
          id="admin-charter-fullName"
          name="fullName"
          required
          defaultValue={charterRequest.fullName}
          className={inputClassName}
        />
      </Field>
      <Field label="Email" htmlFor="admin-charter-email">
        <input
          id="admin-charter-email"
          name="email"
          type="email"
          required
          defaultValue={charterRequest.email}
          className={inputClassName}
        />
      </Field>
      <Field label="Phone" htmlFor="admin-charter-phone">
        <input
          id="admin-charter-phone"
          name="phone"
          defaultValue={charterRequest.phone ?? ""}
          className={inputClassName}
        />
      </Field>
      <Field label="Status" htmlFor="admin-charter-status">
        <select
          id="admin-charter-status"
          name="status"
          required
          defaultValue={charterRequest.status}
          className={inputClassName}
        >
          {CHARTER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Origin" htmlFor="admin-charter-origin">
        <input
          id="admin-charter-origin"
          name="origin"
          required
          defaultValue={charterRequest.origin}
          className={inputClassName}
        />
      </Field>
      <Field label="Destination" htmlFor="admin-charter-destination">
        <input
          id="admin-charter-destination"
          name="destination"
          required
          defaultValue={charterRequest.destination}
          className={inputClassName}
        />
      </Field>
      <Field label="Departure date" htmlFor="admin-charter-departureDate">
        <input
          id="admin-charter-departureDate"
          name="departureDate"
          type="date"
          required
          defaultValue={charterRequest.departureDate}
          className={inputClassName}
        />
      </Field>
      <Field label="Return date" htmlFor="admin-charter-returnDate">
        <input
          id="admin-charter-returnDate"
          name="returnDate"
          type="date"
          defaultValue={charterRequest.returnDate ?? ""}
          className={inputClassName}
        />
      </Field>
      <Field label="Passenger count" htmlFor="admin-charter-passengerCount">
        <input
          id="admin-charter-passengerCount"
          name="passengerCount"
          type="number"
          min={1}
          required
          defaultValue={charterRequest.passengerCount}
          className={inputClassName}
        />
      </Field>
      <Field label="Aircraft preference" htmlFor="admin-charter-aircraftPreference">
        <input
          id="admin-charter-aircraftPreference"
          name="aircraftPreference"
          defaultValue={charterRequest.aircraftPreference ?? ""}
          className={inputClassName}
        />
      </Field>
      <Field label="Budget" htmlFor="admin-charter-budget">
        <input
          id="admin-charter-budget"
          name="budget"
          defaultValue={charterRequest.budget ?? ""}
          className={inputClassName}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes" htmlFor="admin-charter-notes">
          <textarea
            id="admin-charter-notes"
            name="notes"
            rows={4}
            defaultValue={charterRequest.notes ?? ""}
            className={inputClassName}
          />
        </Field>
      </div>

      {error && (
        <p className="md:col-span-2 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Save request details"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
