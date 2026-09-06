"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowRightLeft,
  Repeat2,
  Search,
} from "lucide-react";

import {
  buildFlightSearchParams,
  isKnownAirportCode,
  parseTripType,
  type TripType,
  validateFlightSearch,
} from "../../lib/flight-search";

import {
  parsePassengerComposition,
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
  initialAdults?: string;
  initialSeniors?: string;
  initialChildren?: string;
  initialInfants?: string;
};

function asInitialAirport(value?: string) {
  return value && isKnownAirportCode(value)
    ? value.trim().toUpperCase()
    : "";
}

function tripTypeButtonClass(active: boolean) {
  return [
    "group flex min-w-[88px] flex-col items-center gap-2 rounded-2xl p-1 text-center transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
    active ? "scale-[1.02]" : "hover:-translate-y-0.5",
  ].join(" ");
}

function tripTypeIconClass(active: boolean) {
  return [
    "flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200",
    active
      ? [
          "border-[#ECF0F3] bg-[#ECF0F3] text-[#020E63]",
          "shadow-[-6px_-6px_12px_rgba(255,255,255,0.95),6px_6px_12px_rgba(15,23,42,0.14)]",
        ].join(" ")
      : [
          "border-white/70 bg-[#B2BCCC] text-white",
          "shadow-[-5px_-5px_10px_rgba(255,255,255,0.85),5px_5px_10px_rgba(15,23,42,0.12)]",
          "group-hover:bg-[#ECF0F3] group-hover:text-[#020E63]",
        ].join(" "),
  ].join(" ");
}

export default function FlightSearchForm({
  initialTripType,
  initialFrom,
  initialTo,
  initialDeparture,
  initialReturnDate,
  initialPassengers,
  initialAdults,
  initialSeniors,
  initialChildren,
  initialInfants,
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
    parsePassengerComposition({
      passengers: initialPassengers,
      adults: initialAdults,
      seniors: initialSeniors,
      children: initialChildren,
      infants: initialInfants,
    })
  );

  const [error, setError] = useState<string | null>(null);

  function selectTripType(next: TripType) {
    setTripType(next);
    setError(null);

    if (next === "one-way") {
      setReturnDate("");
    }
  }

  function swapAirports() {
    setFrom(to);
    setTo(from);
    setError(null);
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
      composition,
    };

    const validationError = validateFlightSearch(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    router.push(
      `/flights/results?${buildFlightSearchParams(values).toString()}`
    );
  }

  return (
    <div className="w-full text-slate-900">
      {/* Heading */}
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
          Flight Search
        </p>

        <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.015em] text-slate-950">
          Find your next flight
        </h2>
      </div>

      {/* Trip type */}
      <div
        role="group"
        aria-label="Trip type"
        className="mb-6 flex items-start gap-3 sm:gap-4"
      >
        <button
          type="button"
          aria-pressed={tripType === "round-trip"}
          onClick={() => selectTripType("round-trip")}
          className={tripTypeButtonClass(tripType === "round-trip")}
        >
          <span className={tripTypeIconClass(tripType === "round-trip")}>
            <Repeat2 className="h-6 w-6" aria-hidden="true" />
          </span>

          <span
            className={[
              "text-sm font-semibold transition-colors",
              tripType === "round-trip"
                ? "text-[#020E63]"
                : "text-slate-600 group-hover:text-[#020E63]",
            ].join(" ")}
          >
            Round trip
          </span>
        </button>

        <button
          type="button"
          aria-pressed={tripType === "one-way"}
          onClick={() => selectTripType("one-way")}
          className={tripTypeButtonClass(tripType === "one-way")}
        >
          <span className={tripTypeIconClass(tripType === "one-way")}>
            <ArrowRight className="h-6 w-6" aria-hidden="true" />
          </span>

          <span
            className={[
              "text-sm font-semibold transition-colors",
              tripType === "one-way"
                ? "text-[#020E63]"
                : "text-slate-600 group-hover:text-[#020E63]",
            ].join(" ")}
          >
            One way
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Main search surface */}
        <div
          className="
            overflow-visible
            rounded-3xl
            bg-[#ECF0F3]
            shadow-[-8px_-8px_18px_rgba(255,255,255,0.95),8px_8px_18px_rgba(15,23,42,0.13)]
            lg:rounded-full
          "
        >
          <div
            className="
              relative
              grid
              grid-cols-1
              divide-y
              divide-slate-300/70
              lg:grid-cols-[minmax(0,1.1fr)_52px_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1fr)_190px]
              lg:items-stretch
              lg:divide-x
              lg:divide-y-0
            "
          >
            {/* From */}
            <div className="min-w-0 px-4 py-4 lg:px-5">
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
            </div>

            {/* Swap */}
            <div className="relative flex items-center justify-center py-2 lg:py-0">
              <button
                type="button"
                onClick={swapAirports}
                aria-label="Swap departure and destination airports"
                className="
                  group
                  z-10
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-[#ECF0F3]
                  text-[#020E63]
                  shadow-[-5px_-5px_10px_rgba(255,255,255,0.95),5px_5px_10px_rgba(15,23,42,0.15)]
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:text-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary/30
                  active:translate-y-0
                "
              >
                <ArrowRightLeft
                  className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* To */}
            <div className="min-w-0 px-4 py-4 lg:px-5">
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
            </div>

            {/* Dates */}
            <div className="min-w-0 px-4 py-4 lg:px-5">
              <div
                className={
                  tripType === "round-trip"
                    ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2"
                    : "grid grid-cols-1"
                }
              >
                <div className="min-w-0">
                  <label
                    htmlFor="departure"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                  >
                    Departure
                  </label>

                  <input
                    id="departure"
                    name="departure"
                    type="date"
                    value={departure}
                    onChange={(event) =>
                      handleDepartureChange(event.target.value)
                    }
                    required
                    className="
                      w-full
                      min-w-0
                      cursor-pointer
                      border-0
                      bg-transparent
                      p-0
                      text-sm
                      font-medium
                      text-slate-900
                      outline-none
                      [color-scheme:light]
                    "
                    style={{ colorScheme: "light" }}
                  />
                </div>

                {tripType === "round-trip" ? (
                  <div className="min-w-0">
                    <label
                      htmlFor="returnDate"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
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
                      className="
                        w-full
                        min-w-0
                        cursor-pointer
                        border-0
                        bg-transparent
                        p-0
                        text-sm
                        font-medium
                        text-slate-900
                        outline-none
                        [color-scheme:light]
                      "
                      style={{ colorScheme: "light" }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Passengers */}
            <div className="min-w-0 px-4 py-4 lg:px-5">
              <PassengerPicker
                value={composition}
                onChange={handleCompositionChange}
                describedBy={error ? "flight-search-error" : undefined}
              />
            </div>

            {/* Search */}
            <div className="flex min-h-[72px] items-stretch p-2 lg:p-0">
              <button
                type="submit"
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-[#020E63]
                  px-6
                  py-4
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  duration-200
                  hover:bg-primary
                  focus-visible:outline-none
                  focus-visible:ring-4
                  focus-visible:ring-primary/25
                  active:scale-[0.985]
                  lg:rounded-l-none
                  lg:rounded-r-full
                "
              >
                <Search className="h-5 w-5 shrink-0" aria-hidden="true" />

                <span>Search Flights</span>
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p
            id="flight-search-error"
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}