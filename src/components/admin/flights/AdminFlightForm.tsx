"use client";

import { FormEvent, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  FLIGHT_STATUSES,
  type SafeFlight,
} from "../../../lib/admin-flights";
import {
  elapsedDurationMinutes,
  formatInstantAsDatetimeLocal,
  getAirportTimeZone,
  wallClockInTimeZoneToUtcIso,
} from "../../../lib/airport-timezones";
import {
  buildAdminFareFamilyPreview,
  parseBaseFareDollarsToCents,
} from "../../../lib/fare-families";
import { formatMoney } from "../../../lib/trip-formatting";
import AdminAirportDateTimeField from "./AdminAirportDateTimeField";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type AdminFlightFormProps = {
  mode: "create" | "edit";
  flight?: SafeFlight;
};

function dollarsToCents(value: string) {
  return parseBaseFareDollarsToCents(value);
}

function formatDurationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m (${minutes} min)`;
}

export default function AdminFlightForm({
  mode,
  flight,
}: AdminFlightFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [originCode, setOriginCode] = useState(flight?.originCode ?? "");
  const [destinationCode, setDestinationCode] = useState(
    flight?.destinationCode ?? ""
  );
  const [departureLocal, setDepartureLocal] = useState(
    flight
      ? formatInstantAsDatetimeLocal(
          flight.departureTime,
          getAirportTimeZone(flight.originCode)
        )
      : ""
  );
  const [arrivalLocal, setArrivalLocal] = useState(
    flight
      ? formatInstantAsDatetimeLocal(
          flight.arrivalTime,
          getAirportTimeZone(flight.destinationCode)
        )
      : ""
  );
  const [priceDollars, setPriceDollars] = useState(
    flight ? (flight.price / 100).toFixed(2) : ""
  );

  const computed = useMemo(() => {
    if (!departureLocal || !arrivalLocal) {
      return { utcDeparture: null, utcArrival: null, durationMinutes: null };
    }

    const utcDeparture = wallClockInTimeZoneToUtcIso(
      departureLocal,
      getAirportTimeZone(originCode)
    );
    const utcArrival = wallClockInTimeZoneToUtcIso(
      arrivalLocal,
      getAirportTimeZone(destinationCode)
    );
    const durationMinutes = elapsedDurationMinutes(utcDeparture, utcArrival);

    return { utcDeparture, utcArrival, durationMinutes };
  }, [arrivalLocal, departureLocal, destinationCode, originCode]);

  const farePreview = useMemo(() => {
    const cents = parseBaseFareDollarsToCents(priceDollars);
    if (cents == null) {
      return null;
    }
    return buildAdminFareFamilyPreview(cents);
  }, [priceDollars]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const priceCents = dollarsToCents(String(formData.get("priceDollars") ?? ""));

    if (priceCents == null || priceCents <= 0) {
      setError("Enter a valid base fare in dollars.");
      return;
    }

    if (!computed.utcDeparture || !computed.utcArrival) {
      setError("Departure and arrival times are required.");
      return;
    }

    if (computed.durationMinutes == null || computed.durationMinutes <= 0) {
      setError("Arrival must be after departure.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const payload = {
      code: String(formData.get("code") ?? ""),
      airline: String(formData.get("airline") ?? ""),
      aircraft: String(formData.get("aircraft") ?? ""),
      origin: String(formData.get("origin") ?? ""),
      originCode,
      destination: String(formData.get("destination") ?? ""),
      destinationCode,
      departureTime: computed.utcDeparture,
      arrivalTime: computed.utcArrival,
      durationMinutes: computed.durationMinutes,
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
        setOriginCode("");
        setDestinationCode("");
        setDepartureLocal("");
        setArrivalLocal("");
        setPriceDollars("");
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
          className={inputClassName}
        />
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
          value={originCode}
          onChange={(event) => setOriginCode(event.target.value.toUpperCase())}
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
          value={destinationCode}
          onChange={(event) =>
            setDestinationCode(event.target.value.toUpperCase())
          }
          placeholder="PAP"
          className={inputClassName}
        />
      </Field>

      <AdminAirportDateTimeField
        id={`${mode}-departure`}
        title="Departure"
        helper="Departure time at the origin airport."
        airportCode={originCode}
        value={departureLocal}
        onChange={setDepartureLocal}
      />

      <AdminAirportDateTimeField
        id={`${mode}-arrival`}
        title="Arrival"
        helper="Arrival time at the destination airport."
        airportCode={destinationCode}
        value={arrivalLocal}
        onChange={setArrivalLocal}
      />

      <Field label="Duration (calculated)" htmlFor={`${mode}-durationMinutes`}>
        <input
          id={`${mode}-durationMinutes`}
          name="durationMinutes"
          type="number"
          readOnly
          value={computed.durationMinutes ?? ""}
          className={`${inputClassName} bg-slate-50 text-slate-700`}
        />
        <p className="mt-2 text-xs text-slate-500">
          {computed.durationMinutes != null
            ? `Calculated from timestamps: ${formatDurationLabel(computed.durationMinutes)}`
            : "Enter departure and arrival so duration can be calculated."}
        </p>
      </Field>

      <div>
        <label
          htmlFor={`${mode}-priceDollars`}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Base fare / StarJet Basic (USD)
        </label>
        <input
          id={`${mode}-priceDollars`}
          name="priceDollars"
          type="number"
          min={0.01}
          step="0.01"
          required
          value={priceDollars}
          onChange={(event) => setPriceDollars(event.target.value)}
          placeholder="349.00"
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-slate-500">
          Standard and Flex fares are derived automatically.
        </p>

        <div
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Fare preview
          </p>
          {farePreview ? (
            <dl className="mt-3 space-y-2 text-sm">
              {farePreview.map((row) => (
                <div
                  key={row.family}
                  className="flex items-center justify-between gap-4"
                >
                  <dt className="text-slate-700">{row.label}</dt>
                  <dd className="font-medium text-slate-950">
                    {formatMoney(row.priceCents)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Enter a valid base fare to preview fare families.
            </p>
          )}
        </div>
      </div>

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
