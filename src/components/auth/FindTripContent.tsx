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

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/guest/find-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingReference,
          email,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            success?: boolean;
            message?: string;
          }
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
    <div className="mx-auto w-full max-w-[620px]">
      {/* Section heading */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-slate-950">
          Reservation details
        </h2>

        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Enter the information exactly as it appears on your reservation.
        </p>
      </div>

      {/* Reservation form */}
      <form onSubmit={handleSubmit} className="pt-5">
        <div className="space-y-[14px]">
          {/* Booking reference */}
          <div>
            <label
              htmlFor="bookingReference"
              className="mb-1.5 block text-[12px] font-medium text-slate-700"
            >
              Booking reference
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            </label>

            <input
              id="bookingReference"
              name="bookingReference"
              type="text"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="SJ-XXXXXX"
              className="fs-nums h-[43px] w-full rounded-[4px] border border-slate-300 bg-white px-3.5 text-[13px] font-medium uppercase text-slate-900 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0078D2] focus:ring-1 focus:ring-[#0078D2]"
            />
          </div>

          {/* Email address */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[12px] font-medium text-slate-700"
            >
              Email address
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="guest@example.com"
              className="h-[43px] w-full rounded-[4px] border border-slate-300 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0078D2] focus:ring-1 focus:ring-[#0078D2]"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 border-l-2 border-red-500 bg-red-50 px-3.5 py-2.5"
          >
            <p className="text-[12px] font-medium leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Primary action */}
        <div className="mt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-[40px] min-w-[138px] items-center justify-center rounded-[4px] bg-[#0078D2] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#006bbd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Continuing..." : "Continue"}
          </button>
        </div>

        {/* Booking reference help */}
        <p className="mt-3 text-[10.5px] leading-[18px] text-slate-500">
          Your booking reference is available in your reservation confirmation
          email.
        </p>
      </form>

      {/* Account sign in */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[12px] font-medium text-slate-800">
            Have a Five Stars account?
          </p>

          <Link
            href="/login"
            className="text-[12px] font-semibold text-[#0078D2] transition-colors hover:text-[#006bbd]"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-1 text-[10.5px] leading-[18px] text-slate-500">
          View your saved trips and traveler details.
        </p>
      </div>
    </div>
  );
}