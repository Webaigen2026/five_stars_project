"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  FLIGHT_STATUSES,
  type SafeFlight,
} from "../../../lib/admin-flights";
import {
  formatInstantAsDatetimeLocal,
  getAirportTimeZone,
  wallClockInTimeZoneToUtcIso,
} from "../../../lib/airport-timezones";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type AdminFlightFormProps = {
  mode: "create" | "edit";
  flight?: SafeFlight;
};

function dollarsToCents(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

export default function AdminFlightForm({
  mode,
  flight,
}: AdminFlightFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const priceCents = dollarsToCents(String(formData.get("priceDollars") ?? ""));

    if (priceCents == null || priceCents <= 0) {
      setError("Enter a valid price in dollars.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const originCode = String(formData.get("originCode") ?? "");
    const destinationCode = String(formData.get("destinationCode") ?? "");

    const payload = {
      code: String(formData.get("code") ?? ""),
      airline: String(formData.get("airline") ?? ""),
      aircraft: String(formData.get("aircraft") ?? ""),
      origin: String(formData.get("origin") ?? ""),
      originCode,
      destination: String(formData.get("destination") ?? ""),
      destinationCode,
      departureTime: wallClockInTimeZoneToUtcIso(
        String(formData.get("departureTime") ?? ""),
        getAirportTimeZone(originCode)
      ),
      arrivalTime: wallClockInTimeZoneToUtcIso(
        String(formData.get("arrivalTime") ?? ""),
        getAirportTimeZone(destinationCode)
      ),
      durationMinutes: Number(formData.get("durationMinutes")),
      price: priceCents,
      totalSeats: Number(formData.get("totalSeats")),
      availableSeats: Number(formData.get("availableSeats")),
      status: String(formData.get("status") ?? ""),
    };

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/flights"
          : `/api/admin/flights/${flight?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const body = (await response.json().catch(() => null)) as
        | { error?: string; flight?: SafeFlight }
        | null;

      if (!response.ok) {
        setError(body?.error ?? "Unable to save flight.");
        return;
      }

      if (mode === "create") {
        form.reset();
        setSuccess("Flight created.");
        router.refresh();
        return;
      }

      router.push("/admin/flights");
      router.refresh();
    } catch {
      setError("Unable to save flight.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
      <Field label="Flight code" htmlFor={`${mode}-code`}>
        <input
          id={`${mode}-code`}
          name="code"
          required
          defaultValue={flight?.code ?? ""}
          placeholder="SJ600"
          className={inputClassName}
        />
      </Field>

      <Field label="Airline" htmlFor={`${mode}-airline`}>
        <input
          id={`${mode}-airline`}
          name="airline"
          required
          defaultValue={flight?.airline ?? "StarJet"}
          className={inputClassName}
        />
      </Field>

      <Field label="Aircraft" htmlFor={`${mode}-aircraft`}>
        <input
          id={`${mode}-aircraft`}
          name="aircraft"
          defaultValue={flight?.aircraft ?? ""}
          placeholder="Airbus A320"
          className={inputClassName}
        />
      </Field>

      <Field label="Status" htmlFor={`${mode}-status`}>
        <select
          id={`${mode}-status`}
          name="status"
          required
          defaultValue={flight?.status ?? "SCHEDULED"}
          className={inputClassName}
        >
          {FLIGHT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Origin" htmlFor={`${mode}-origin`}>
        <input
          id={`${mode}-origin`}
          name="origin"
          required
          defaultValue={flight?.origin ?? ""}
          placeholder="Boston"
          className={inputClassName}
        />
      </Field>

      <Field label="Origin code" htmlFor={`${mode}-originCode`}>
        <input
          id={`${mode}-originCode`}
          name="originCode"
          required
          defaultValue={flight?.originCode ?? ""}
          placeholder="BOS"
          className={inputClassName}
        />
      </Field>

      <Field label="Destination" htmlFor={`${mode}-destination`}>
        <input
          id={`${mode}-destination`}
          name="destination"
          required
          defaultValue={flight?.destination ?? ""}
          placeholder="Port-au-Prince"
          className={inputClassName}
        />
      </Field>

      <Field label="Destination code" htmlFor={`${mode}-destinationCode`}>
        <input
          id={`${mode}-destinationCode`}
          name="destinationCode"
          required
          defaultValue={flight?.destinationCode ?? ""}
          placeholder="PAP"
          className={inputClassName}
        />
      </Field>

      <Field label="Departure (origin local time)" htmlFor={`${mode}-departureTime`}>
        <input
          id={`${mode}-departureTime`}
          name="departureTime"
          type="datetime-local"
          required
          defaultValue={
            flight
              ? formatInstantAsDatetimeLocal(
                  flight.departureTime,
                  getAirportTimeZone(flight.originCode)
                )
              : ""
          }
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-slate-500">
          Enter the departure wall-clock time at the origin airport.
        </p>
      </Field>

      <Field label="Arrival (destination local time)" htmlFor={`${mode}-arrivalTime`}>
        <input
          id={`${mode}-arrivalTime`}
          name="arrivalTime"
          type="datetime-local"
          required
          defaultValue={
            flight
              ? formatInstantAsDatetimeLocal(
                  flight.arrivalTime,
                  getAirportTimeZone(flight.destinationCode)
                )
              : ""
          }
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-slate-500">
          Enter the arrival wall-clock time at the destination airport.
        </p>
      </Field>

      <Field label="Duration (minutes)" htmlFor={`${mode}-durationMinutes`}>
        <input
          id={`${mode}-durationMinutes`}
          name="durationMinutes"
          type="number"
          min={1}
          required
          defaultValue={flight?.durationMinutes ?? ""}
          className={inputClassName}
        />
      </Field>

      <Field label="Price (USD)" htmlFor={`${mode}-priceDollars`}>
        <input
          id={`${mode}-priceDollars`}
          name="priceDollars"
          type="number"
          min={0.01}
          step="0.01"
          required
          defaultValue={
            flight ? (flight.price / 100).toFixed(2) : ""
          }
          placeholder="349.00"
          className={inputClassName}
        />
      </Field>

      <Field label="Total seats" htmlFor={`${mode}-totalSeats`}>
        <input
          id={`${mode}-totalSeats`}
          name="totalSeats"
          type="number"
          min={1}
          required
          defaultValue={flight?.totalSeats ?? ""}
          className={inputClassName}
        />
      </Field>

      <Field label="Available seats" htmlFor={`${mode}-availableSeats`}>
        <input
          id={`${mode}-availableSeats`}
          name="availableSeats"
          type="number"
          min={0}
          required
          defaultValue={flight?.availableSeats ?? ""}
          className={inputClassName}
        />
      </Field>

      {error && (
        <p className="md:col-span-2 text-sm font-medium text-red-600">{error}</p>
      )}

      {success && (
        <p className="md:col-span-2 text-sm font-medium text-green-700">
          {success}
        </p>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create flight"
              : "Save changes"}
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
