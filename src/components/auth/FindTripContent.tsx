"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FindTripContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const bookingReference = String(
      formData.get("bookingReference") ?? ""
    ).trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/guest/find-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference, email }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean; message?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to continue. Please try again.");
        return;
      }

      const params = new URLSearchParams({
        ref: bookingReference.toUpperCase(),
        email,
      });
      router.push(`/find-trip/verify?${params.toString()}`);
    } catch {
      setError("Unable to continue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Five Stars
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Find your trip
        </h1>
        <p className="mt-3 text-slate-600">
          Enter your booking reference and the email used for the reservation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="bookingReference"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Booking reference
          </label>
          <input
            id="bookingReference"
            name="bookingReference"
            type="text"
            required
            autoComplete="off"
            placeholder="SJ-XXXXXX"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="guest@example.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Continuing..." : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Have an account?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
