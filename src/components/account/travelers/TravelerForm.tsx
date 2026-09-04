"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { SafeTraveler } from "../../../lib/traveler-shared";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type TravelerFormProps = {
  traveler?: SafeTraveler | null;
  defaultPrimary?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
};

export default function TravelerForm({
  traveler,
  defaultPrimary = false,
  onCancel,
  onSaved,
}: TravelerFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(traveler);

  useEffect(() => {
    setError(null);
  }, [traveler?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      label: String(formData.get("label") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      nationality: String(formData.get("nationality") ?? ""),
      passportNumber: String(formData.get("passportNumber") ?? ""),
      passportCountry: String(formData.get("passportCountry") ?? ""),
      passportExpiry: String(formData.get("passportExpiry") ?? ""),
      isPrimary: formData.get("isPrimary") === "on",
    };

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        isEdit && traveler ? `/api/travelers/${traveler.id}` : "/api/travelers",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(result?.error ?? "Unable to save traveler.");
        return;
      }

      onSaved?.();
      router.refresh();
    } catch {
      setError("Unable to save traveler.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="label" className="mb-2 block text-sm font-medium text-slate-700">
            Label
          </label>
          <input
            id="label"
            name="label"
            maxLength={80}
            placeholder="Myself, Spouse, Child..."
            defaultValue={traveler?.label ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            maxLength={100}
            defaultValue={traveler?.firstName ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            maxLength={100}
            defaultValue={traveler?.lastName ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="mb-2 block text-sm font-medium text-slate-700">
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            defaultValue={traveler?.dateOfBirth ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="gender" className="mb-2 block text-sm font-medium text-slate-700">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue={traveler?.gender ?? ""}
            className={inputClassName}
          >
            <option value="" disabled>
              Select gender
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="nationality" className="mb-2 block text-sm font-medium text-slate-700">
            Nationality
          </label>
          <input
            id="nationality"
            name="nationality"
            required
            maxLength={80}
            defaultValue={traveler?.nationality ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="passportNumber" className="mb-2 block text-sm font-medium text-slate-700">
            Passport number
          </label>
          <input
            id="passportNumber"
            name="passportNumber"
            required
            maxLength={30}
            autoComplete="off"
            defaultValue={traveler?.passportNumber ?? ""}
            className={`${inputClassName} uppercase`}
          />
        </div>

        <div>
          <label
            htmlFor="passportCountry"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Passport issuing country
          </label>
          <input
            id="passportCountry"
            name="passportCountry"
            required
            maxLength={80}
            defaultValue={traveler?.passportCountry ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="passportExpiry" className="mb-2 block text-sm font-medium text-slate-700">
            Passport expiration
          </label>
          <input
            id="passportExpiry"
            name="passportExpiry"
            type="date"
            required
            defaultValue={traveler?.passportExpiry ?? ""}
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isPrimary"
            defaultChecked={traveler?.isPrimary ?? defaultPrimary}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
          />
          This is me / Primary traveler
        </label>
        <p className="mt-2 text-sm text-slate-500">
          Your primary traveler is used for the &quot;Myself&quot; option during
          booking.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save traveler" : "Add traveler"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
