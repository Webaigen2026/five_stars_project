"use client";

import { FormEvent, useState, type ReactNode } from "react";
import type { SafeCharterRequest } from "../../lib/charter";

const inputClassName =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-[14px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary/20";

const textareaClassName =
  "w-full resize-y rounded-md border border-slate-300 bg-white px-3.5 py-3 text-[14px] font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary/20";

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
          aircraftPreference: String(
            formData.get("aircraftPreference") ?? ""
          ),
          budget: String(formData.get("budget") ?? ""),
          notes: String(formData.get("notes") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            request?: SafeCharterRequest;
          }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ?? "Unable to submit charter request."
        );
        return;
      }

      if (!payload?.request) {
        setError(
          "Request was created, but no reference was returned."
        );
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
      <section className="mx-auto max-w-[800px] py-2">
        <div className="border-l-2 border-primary pl-5 sm:pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Request received
          </p>

          <h2 className="font-american-sans mt-2 text-[21px] font-medium leading-tight tracking-[-0.015em] text-slate-950">
            Your charter request has been submitted
          </h2>

          <p className="fs-nums mt-4 text-[13px] font-semibold text-slate-900">
            Reference: {created.reference}
          </p>

          <p className="mt-2 max-w-xl text-[13px] leading-5 text-slate-600">
            We received your charter request from {created.origin} to{" "}
            {created.destination}. Keep your reference number for
            follow-up.
          </p>

          <button
            type="button"
            onClick={() => setCreated(null)}
            className="mt-5 h-10 rounded-md bg-primary px-5 text-[13px] font-semibold text-white transition hover:bg-primary-hover"
          >
            Submit another request
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-[800px]"
    >
      {/* FORM HEADER */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="font-american-sans text-[20px] font-medium leading-tight tracking-[-0.015em] text-slate-950">
          Charter request
        </h2>

        <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
          Provide your travel details and contact information.
        </p>
      </div>

      {/* CONTACT INFORMATION */}
      <fieldset className="py-6">
        <legend className="mb-4 text-[13px] font-semibold tracking-[-0.005em] text-slate-800">
          Contact information
        </legend>

        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label="Full name"
            htmlFor="fullName"
            required
          >
            <input
              id="fullName"
              name="fullName"
              required
              defaultValue={defaultFullName}
              autoComplete="name"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            required
          >
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={defaultEmail}
              autoComplete="email"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Phone"
            htmlFor="phone"
            required
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Passenger count"
            htmlFor="passengerCount"
            required
          >
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
        </div>
      </fieldset>

      {/* FLIGHT INFORMATION */}
      <fieldset className="border-t border-slate-200 py-6">
        <legend className="px-0 text-[13px] font-semibold tracking-[-0.005em] text-slate-800">
          Flight information
        </legend>

        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label="Origin"
            htmlFor="origin"
            required
          >
            <input
              id="origin"
              name="origin"
              required
              placeholder="Miami"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Destination"
            htmlFor="destination"
            required
          >
            <input
              id="destination"
              name="destination"
              required
              placeholder="Cap-Haïtien"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Departure date"
            htmlFor="departureDate"
            required
          >
            <input
              id="departureDate"
              name="departureDate"
              type="date"
              required
              className={inputClassName}
            />
          </Field>

          <Field
            label="Return date"
            htmlFor="returnDate"
          >
            <input
              id="returnDate"
              name="returnDate"
              type="date"
              className={inputClassName}
            />
          </Field>
        </div>
      </fieldset>

      {/* CHARTER PREFERENCES */}
      <fieldset className="border-t border-slate-200 py-6">
        <legend className="px-0 text-[13px] font-semibold tracking-[-0.005em] text-slate-800">
          Charter preferences
        </legend>

        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label="Aircraft preference"
            htmlFor="aircraftPreference"
          >
            <input
              id="aircraftPreference"
              name="aircraftPreference"
              placeholder="Light jet"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Budget"
            htmlFor="budget"
          >
            <input
              id="budget"
              name="budget"
              placeholder="Flexible"
              className={inputClassName}
            />
          </Field>
        </div>
      </fieldset>

      {/* ADDITIONAL DETAILS */}
      <fieldset className="border-t border-slate-200 py-6">
        <legend className="px-0 text-[13px] font-semibold tracking-[-0.005em] text-slate-800">
          Additional details
        </legend>

        <div className="mt-4">
          <Field
            label="Notes"
            htmlFor="notes"
          >
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Aircraft requirements, luggage, schedule flexibility, accessibility needs, or other details"
              className={textareaClassName}
            />
          </Field>
        </div>
      </fieldset>

      {/* ERROR */}
      {error && (
        <p
          className="mt-1 text-[12px] font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* SUBMIT AREA */}
      <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[11px] leading-4 text-slate-500">
          Charter requests are reviewed by our team before
          availability is confirmed.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 shrink-0 rounded-md bg-primary px-5 text-[13px] font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? "Submitting..."
            : "Submit charter request"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[12px] font-medium tracking-[0.005em] text-slate-700"
      >
        {label}

        {required && (
          <>
            <span
              className="ml-0.5 text-[12px] font-semibold text-red-500"
              aria-hidden="true"
            >
              *
            </span>

            <span className="sr-only"> required</span>
          </>
        )}
      </label>

      {children}
    </div>
  );
}