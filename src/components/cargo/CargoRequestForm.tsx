"use client";

import { FormEvent, useState, type ReactNode } from "react";

import { CARGO_TYPES, type SafeCargoRequest } from "../../lib/cargo";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function CargoRequestForm({
  defaultFullName = "",
  defaultEmail = "",
}: {
  defaultFullName?: string;
  defaultEmail?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SafeCargoRequest | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const quantityValue = String(formData.get("quantity") ?? "").trim();

    setError(null);
    setCreated(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cargo-requests", {
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
          cargoType: String(formData.get("cargoType") ?? ""),
          description: String(formData.get("description") ?? ""),
          quantity: quantityValue ? Number(quantityValue) : null,
          weight: String(formData.get("weight") ?? ""),
          preferredDate: String(formData.get("preferredDate") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; request?: SafeCargoRequest }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to submit cargo request.");
        return;
      }

      if (!payload?.request) {
        setError("Request was created, but no reference was returned.");
        return;
      }

      form.reset();
      setCreated(payload.request);
    } catch {
      setError("Unable to submit cargo request.");
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
          We received your cargo request from {created.origin} to{" "}
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
      <h2 className="text-2xl font-semibold text-slate-950">Cargo request</h2>
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
        <Field label="Cargo type" htmlFor="cargoType">
          <select
            id="cargoType"
            name="cargoType"
            required
            defaultValue="BOX"
            className={inputClassName}
          >
            {CARGO_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Origin" htmlFor="origin">
          <input
            id="origin"
            name="origin"
            required
            placeholder="Boston"
            className={inputClassName}
          />
        </Field>
        <Field label="Destination" htmlFor="destination">
          <input
            id="destination"
            name="destination"
            required
            placeholder="Port-au-Prince"
            className={inputClassName}
          />
        </Field>
        <Field label="Quantity" htmlFor="quantity">
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            className={inputClassName}
          />
        </Field>
        <Field label="Weight" htmlFor="weight">
          <input
            id="weight"
            name="weight"
            placeholder="45 lb"
            className={inputClassName}
          />
        </Field>
        <Field label="Preferred date" htmlFor="preferredDate">
          <input
            id="preferredDate"
            name="preferredDate"
            type="date"
            className={inputClassName}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
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
        {isSubmitting ? "Submitting..." : "Submit cargo request"}
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
