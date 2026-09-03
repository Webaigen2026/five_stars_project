"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PassengerForm from "../booking/PassengerForm";

const PASSENGER_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportNumber",
  "passportCountry",
  "passportExpiry",
] as const;

export default function PassengersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flightId = searchParams.get("flight") ?? "";
  const passengerParam = searchParams.get("passengers") ?? "1";

  const parsedPassengerCount = Number.parseInt(passengerParam, 10);

  const passengerCount =
    Number.isNaN(parsedPassengerCount) || parsedPassengerCount < 1
      ? 1
      : Math.min(parsedPassengerCount, 6);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const passengers = Array.from({ length: passengerCount }, (_, index) => {
      const passenger = {
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        nationality: "",
        passportNumber: "",
        passportCountry: "",
        passportExpiry: "",
      };

      for (const field of PASSENGER_FIELDS) {
        passenger[field] = String(
          formData.get(`passengers.${index}.${field}`) ?? ""
        ).trim();
      }

      return passenger;
    });

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flightCode: flightId,
          passengers,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { bookingReference?: string; error?: string }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ?? "Unable to create booking. Please try again."
        );
        return;
      }

      if (!payload?.bookingReference) {
        setError("Booking was created, but no reference was returned.");
        return;
      }

      router.push(
        `/checkout?booking=${encodeURIComponent(payload.bookingReference)}`
      );
    } catch {
      setError("Unable to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Passenger Details
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Who is traveling?
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Enter passenger information exactly as it appears on each
            traveler&apos;s travel documents.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {flightId && (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Flight{" "}
                <span className="font-semibold text-slate-950">{flightId}</span>
              </div>
            )}

            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              Travelers{" "}
              <span className="font-semibold text-slate-950">
                {passengerCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {Array.from({ length: passengerCount }).map((_, index) => (
            <PassengerForm key={index} index={index} />
          ))}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Ready to continue?
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Review the passenger details before continuing to checkout.
                </p>

                {error && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating booking..." : "Continue to Checkout"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}
