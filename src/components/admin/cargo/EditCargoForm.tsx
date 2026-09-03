"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  CARGO_STATUSES,
  CARGO_TYPES,
  type SafeCargoRequest,
} from "../../../lib/cargo";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function EditCargoForm({
  cargoRequest,
}: {
  cargoRequest: SafeCargoRequest;
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
    const quantityValue = String(formData.get("quantity") ?? "").trim();

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/cargo/${cargoRequest.id}`, {
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
          cargoType: String(formData.get("cargoType") ?? ""),
          description: String(formData.get("description") ?? ""),
          quantity: quantityValue ? Number(quantityValue) : null,
          weight: String(formData.get("weight") ?? ""),
          preferredDate: String(formData.get("preferredDate") ?? ""),
          status: String(formData.get("status") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to update cargo request.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update cargo request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
      <Field label="Full name" htmlFor="admin-cargo-fullName">
        <input
          id="admin-cargo-fullName"
          name="fullName"
          required
          defaultValue={cargoRequest.fullName}
          className={inputClassName}
        />
      </Field>
      <Field label="Email" htmlFor="admin-cargo-email">
        <input
          id="admin-cargo-email"
          name="email"
          type="email"
          required
          defaultValue={cargoRequest.email}
          className={inputClassName}
        />
      </Field>
      <Field label="Phone" htmlFor="admin-cargo-phone">
        <input
          id="admin-cargo-phone"
          name="phone"
          defaultValue={cargoRequest.phone ?? ""}
          className={inputClassName}
        />
      </Field>
      <Field label="Status" htmlFor="admin-cargo-status">
        <select
          id="admin-cargo-status"
          name="status"
          required
          defaultValue={cargoRequest.status}
          className={inputClassName}
        >
          {CARGO_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Origin" htmlFor="admin-cargo-origin">
        <input
          id="admin-cargo-origin"
          name="origin"
          required
          defaultValue={cargoRequest.origin}
          className={inputClassName}
        />
      </Field>
      <Field label="Destination" htmlFor="admin-cargo-destination">
        <input
          id="admin-cargo-destination"
          name="destination"
          required
          defaultValue={cargoRequest.destination}
          className={inputClassName}
        />
      </Field>
      <Field label="Cargo type" htmlFor="admin-cargo-cargoType">
        <select
          id="admin-cargo-cargoType"
          name="cargoType"
          required
          defaultValue={cargoRequest.cargoType}
          className={inputClassName}
        >
          {CARGO_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quantity" htmlFor="admin-cargo-quantity">
        <input
          id="admin-cargo-quantity"
          name="quantity"
          type="number"
          min={1}
          defaultValue={cargoRequest.quantity ?? ""}
          className={inputClassName}
        />
      </Field>
      <Field label="Weight" htmlFor="admin-cargo-weight">
        <input
          id="admin-cargo-weight"
          name="weight"
          defaultValue={cargoRequest.weight ?? ""}
          className={inputClassName}
        />
      </Field>
      <Field label="Preferred date" htmlFor="admin-cargo-preferredDate">
        <input
          id="admin-cargo-preferredDate"
          name="preferredDate"
          type="date"
          defaultValue={cargoRequest.preferredDate ?? ""}
          className={inputClassName}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Description" htmlFor="admin-cargo-description">
          <textarea
            id="admin-cargo-description"
            name="description"
            rows={4}
            defaultValue={cargoRequest.description ?? ""}
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
