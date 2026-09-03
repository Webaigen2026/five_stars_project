"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { SafePassenger } from "../../../lib/admin-passengers";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function EditPassengerForm({
  passenger,
}: {
  passenger: SafePassenger;
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
      const response = await fetch(`/api/admin/passengers/${passenger.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: String(formData.get("firstName") ?? ""),
          lastName: String(formData.get("lastName") ?? ""),
          dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
          gender: String(formData.get("gender") ?? ""),
          nationality: String(formData.get("nationality") ?? ""),
          passportNumber: String(formData.get("passportNumber") ?? ""),
          passportCountry: String(formData.get("passportCountry") ?? ""),
          passportExpiry: String(formData.get("passportExpiry") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to update passenger.");
        return;
      }

      router.push(`/admin/bookings/${passenger.bookingId}`);
      router.refresh();
    } catch {
      setError("Unable to update passenger.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
      <Field label="First name" htmlFor="firstName">
        <input
          id="firstName"
          name="firstName"
          required
          defaultValue={passenger.firstName}
          className={inputClassName}
        />
      </Field>

      <Field label="Last name" htmlFor="lastName">
        <input
          id="lastName"
          name="lastName"
          required
          defaultValue={passenger.lastName}
          className={inputClassName}
        />
      </Field>

      <Field label="Date of birth" htmlFor="dateOfBirth">
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          required
          defaultValue={passenger.dateOfBirth}
          className={inputClassName}
        />
      </Field>

      <Field label="Gender" htmlFor="gender">
        <select
          id="gender"
          name="gender"
          required
          defaultValue={passenger.gender}
          className={inputClassName}
        >
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          {passenger.gender !== "MALE" &&
            passenger.gender !== "FEMALE" &&
            passenger.gender !== "OTHER" && (
              <option value={passenger.gender}>{passenger.gender}</option>
            )}
        </select>
      </Field>

      <Field label="Nationality" htmlFor="nationality">
        <input
          id="nationality"
          name="nationality"
          required
          defaultValue={passenger.nationality}
          className={inputClassName}
        />
      </Field>

      <Field label="Passport number" htmlFor="passportNumber">
        <input
          id="passportNumber"
          name="passportNumber"
          required
          defaultValue={passenger.passportNumber}
          className={inputClassName}
        />
      </Field>

      <Field label="Passport issuing country" htmlFor="passportCountry">
        <input
          id="passportCountry"
          name="passportCountry"
          required
          defaultValue={passenger.passportCountry}
          className={inputClassName}
        />
      </Field>

      <Field label="Passport expiration" htmlFor="passportExpiry">
        <input
          id="passportExpiry"
          name="passportExpiry"
          type="date"
          required
          defaultValue={passenger.passportExpiry}
          className={inputClassName}
        />
      </Field>

      {error && (
        <p className="md:col-span-2 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Save passenger"}
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
