"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildFlightSearchParams,
  isKnownAirportCode,
  parseTripType,
  type TripType,
  validateFlightSearch,
} from "../../lib/flight-search";
import {
  compositionFromPassengerCount,
  totalPassengers,
  type PassengerComposition,
} from "../../lib/passenger-composition";
import AirportSelect from "./AirportSelect";
import PassengerPicker from "./PassengerPicker";

type FlightSearchFormProps = {
  initialTripType?: string;
  initialFrom?: string;
  initialTo?: string;
  initialDeparture?: string;
  initialReturnDate?: string;
  initialPassengers?: string;
};

function asInitialAirport(value?: string) {
  return value && isKnownAirportCode(value) ? value.trim().toUpperCase() : "";
}

function tripTypeButtonClass(active: boolean) {
  return [
    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
    active
      ? "border-primary/30 bg-sky-50 text-primary"
      : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

export default function FlightSearchForm({
  initialTripType,
  initialFrom,
  initialTo,
  initialDeparture,
  initialReturnDate,
  initialPassengers,
}: FlightSearchFormProps) {
  const router = useRouter();

  const [tripType, setTripType] = useState<TripType>(
    parseTripType(initialTripType)
  );
  const [from, setFrom] = useState(asInitialAirport(initialFrom));
  const [to, setTo] = useState(asInitialAirport(initialTo));
  const [departure, setDeparture] = useState(initialDeparture ?? "");
  const [returnDate, setReturnDate] = useState(initialReturnDate ?? "");
  const [composition, setComposition] = useState<PassengerComposition>(() =>
    compositionFromPassengerCount(initialPassengers)
  );
  const [error, setError] = useState<string | null>(null);

  function selectTripType(next: TripType) {
    setTripType(next);
    setError(null);

    if (next === "one-way") {
      setReturnDate("");
    }
  }

  function handleDepartureChange(value: string) {
    setDeparture(value);
    setError(null);

    if (returnDate && value && returnDate < value) {
      setReturnDate("");
    }
  }

  function handleCompositionChange(next: PassengerComposition) {
    setComposition(next);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passengers = String(totalPassengers(composition));
    const values = {
      tripType,
      from,
      to,
      departure,
      returnDate: tripType === "round-trip" ? returnDate : "",
      passengers,
    };
    const validationError = validateFlightSearch(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    router.push(`/flights/results?${buildFlightSearchParams(values).toString()}`);
  }

  const fieldGridClass =
    tripType === "round-trip"
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      : "grid gap-4 md:grid-cols-2 lg:grid-cols-5";

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

      <div
        role="group"
        aria-label="Trip type"
        className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1"
      >
        <button
          type="button"
          aria-pressed={tripType === "one-way"}
          onClick={() => selectTripType("one-way")}
          className={tripTypeButtonClass(tripType === "one-way")}
        >
          One way
        </button>
        <button
          type="button"
          aria-pressed={tripType === "round-trip"}
          onClick={() => selectTripType("round-trip")}
          className={tripTypeButtonClass(tripType === "round-trip")}
        >
          Round trip
        </button>
      </div>

      <form onSubmit={handleSubmit} className={fieldGridClass}>
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
            onChange={(event) => handleDepartureChange(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {tripType === "round-trip" ? (
          <div>
            <label
              htmlFor="returnDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Return
            </label>

            <input
              id="returnDate"
              name="returnDate"
              type="date"
              value={returnDate}
              min={departure || undefined}
              onChange={(event) => {
                setReturnDate(event.target.value);
                setError(null);
              }}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : null}

        <PassengerPicker
          value={composition}
          onChange={handleCompositionChange}
          describedBy={error ? "flight-search-error" : undefined}
        />

        <div className="flex items-end md:col-span-2 lg:col-span-1 xl:col-span-1">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
