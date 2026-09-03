"use client";

import { FormEvent, useState, type ReactNode } from "react";

import type { SafeCharterRequest } from "../../lib/charter";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function CharterRequestForm({
  defaultFullName = "",
  defaultEmail = "",
}: {
  defaultFullName?: string;
  defaultEmail?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SafeCharterRequest | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setError(null);
    setCreated(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/charter-requests", {
        method: "POST",
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
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; request?: SafeCharterRequest }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to submit charter request.");
        return;
      }

      if (!payload?.request) {
        setError("Request was created, but no reference was returned.");
        return;
      }

      form.reset();
      setCreated(payload.request);
    } catch {
      setError("Unable to submit charter request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          Request received
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {created.reference}
        </h2>
        <p className="mt-3 text-slate-600">
          We received your charter request from {created.origin} to{" "}
          {created.destination}. Keep this reference for follow-up.
        </p>
        <button
          type="button"
          onClick={() => setCreated(null)}
          className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h2 className="text-2xl font-semibold text-slate-950">Charter request</h2>
      <p className="mt-2 text-slate-600">
        You can submit this form without creating an account.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Field label="Full name" htmlFor="fullName">
          <input
            id="fullName"
            name="fullName"
            required
            defaultValue={defaultFullName}
            className={inputClassName}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            className={inputClassName}
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input id="phone" name="phone" className={inputClassName} />
        </Field>
        <Field label="Passenger count" htmlFor="passengerCount">
          <input
            id="passengerCount"
            name="passengerCount"
            type="number"
            min={1}
            required
            defaultValue={1}
            className={inputClassName}
          />
        </Field>
        <Field label="Origin" htmlFor="origin">
          <input
            id="origin"
            name="origin"
            required
            placeholder="Miami"
            className={inputClassName}
          />
        </Field>
        <Field label="Destination" htmlFor="destination">
          <input
            id="destination"
            name="destination"
            required
            placeholder="Cap-Haïtien"
            className={inputClassName}
          />
        </Field>
        <Field label="Departure date" htmlFor="departureDate">
          <input
            id="departureDate"
            name="departureDate"
            type="date"
            required
            className={inputClassName}
          />
        </Field>
        <Field label="Return date" htmlFor="returnDate">
          <input
            id="returnDate"
            name="returnDate"
            type="date"
            className={inputClassName}
          />
        </Field>
        <Field label="Aircraft preference" htmlFor="aircraftPreference">
          <input
            id="aircraftPreference"
            name="aircraftPreference"
            placeholder="Light jet"
            className={inputClassName}
          />
        </Field>
        <Field label="Budget" htmlFor="budget">
          <input
            id="budget"
            name="budget"
            placeholder="Flexible"
            className={inputClassName}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className={inputClassName}
            />
          </Field>
        </div>
      </div>

      {error && (
        <p className="mt-5 text-sm font-medium text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Submitting..." : "Submit charter request"}
      </button>
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
