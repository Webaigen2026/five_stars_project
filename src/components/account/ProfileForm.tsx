"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function ProfileForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [firstName, lastName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: String(formData.get("firstName") ?? ""),
          lastName: String(formData.get("lastName") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to update profile.");
        return;
      }

      setSuccess("Profile updated successfully.");
      router.refresh();
    } catch {
      setError("Unable to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label
          htmlFor="firstName"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          First name
        </label>
        <input
          id="firstName"
          name="firstName"
          required
          maxLength={100}
          defaultValue={firstName}
          className={inputClassName}
        />
      </div>

      <div>
        <label
          htmlFor="lastName"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Last name
        </label>
        <input
          id="lastName"
          name="lastName"
          required
          maxLength={100}
          defaultValue={lastName}
          className={inputClassName}
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {success && (
        <p className="text-sm font-medium text-emerald-700">{success}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
