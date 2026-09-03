"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildFlightSearchParams,
  isKnownAirportCode,
  validateFlightSearch,
} from "../../lib/flight-search";
import AirportSelect from "./AirportSelect";

type FlightSearchFormProps = {
  initialFrom?: string;
  initialTo?: string;
  initialDeparture?: string;
  initialPassengers?: string;
};

function asInitialAirport(value?: string) {
  return value && isKnownAirportCode(value) ? value.trim().toUpperCase() : "";
}

export default function FlightSearchForm({
  initialFrom,
  initialTo,
  initialDeparture,
  initialPassengers,
}: FlightSearchFormProps) {
  const router = useRouter();

  const [from, setFrom] = useState(asInitialAirport(initialFrom));
  const [to, setTo] = useState(asInitialAirport(initialTo));
  const [departure, setDeparture] = useState(initialDeparture ?? "");
  const [passengers, setPassengers] = useState(initialPassengers ?? "1");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const values = { from, to, departure, passengers };
    const validationError = validateFlightSearch(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    router.push(`/flights/results?${buildFlightSearchParams(values).toString()}`);
  }

  return (
    <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
          Flight Search
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Find your next flight
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
      >
        <AirportSelect
          id="from"
          name="from"
          label="From"
          value={from}
          excludeCode={to}
          describedBy={error ? "flight-search-error" : undefined}
          onChange={(code) => {
            setFrom(code);
            setError(null);
          }}
        />

        <AirportSelect
          id="to"
          name="to"
          label="To"
          value={to}
          excludeCode={from}
          describedBy={error ? "flight-search-error" : undefined}
          onChange={(code) => {
            setTo(code);
            setError(null);
          }}
        />

        <div>
          <label
            htmlFor="departure"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Departure
          </label>

          <input
            id="departure"
            name="departure"
            type="date"
            value={departure}
            onChange={(event) => {
              setDeparture(event.target.value);
              setError(null);
            }}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="passengers"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Passengers
          </label>

          <select
            id="passengers"
            name="passengers"
            value={passengers}
            onChange={(event) => setPassengers(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="1">1 Passenger</option>
            <option value="2">2 Passengers</option>
            <option value="3">3 Passengers</option>
            <option value="4">4 Passengers</option>
            <option value="5">5 Passengers</option>
            <option value="6">6 Passengers</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Search Flights
          </button>
        </div>
      </form>

      {error ? (
        <p
          id="flight-search-error"
          role="alert"
          className="mt-4 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
