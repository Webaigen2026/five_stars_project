"use client";

import {
  FormEvent,
  useState,
  type SVGProps,
} from "react";

import { useRouter } from "next/navigation";

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
import FlightDateRangePicker from "./FlightDateRangePicker";
import PassengerPicker from "./PassengerPicker";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function asInitialAirport(value?: string) {
  return value && isKnownAirportCode(value)
    ? value.trim().toUpperCase()
    : "";
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function OneWayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h15" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function RoundTripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 7h12" />
      <path d="m14 4 3 3-3 3" />

      <path d="M19 17H7" />
      <path d="m10 14-3 3 3 3" />
    </svg>
  );
}

function SearchArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Trip type control                                                          */
/* -------------------------------------------------------------------------- */

function TripTypeControl({
  value,
  onChange,
}: {
  value: TripType;
  onChange: (value: TripType) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Trip type"
      className="flex items-center gap-8"
    >
      {/* One way */}
      <button
        type="button"
        role="tab"
        aria-selected={value === "one-way"}
        onClick={() => onChange("one-way")}
        className={cn(
          "group relative flex h-11 items-center gap-2",
          "text-[14px] font-medium",
          "transition-colors duration-150",
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[#0078D2]/25",
          "focus-visible:ring-offset-2",
          value === "one-way"
            ? "text-[#0078D2]"
            : "text-slate-500 hover:text-slate-900"
        )}
      >
        <OneWayIcon
          className="h-[14px] w-[14px]"
          aria-hidden="true"
        />

        <span>One way</span>

        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-px left-0 right-0 h-[2px]",
            value === "one-way"
              ? "bg-[#0078D2]"
              : "bg-transparent"
          )}
        />
      </button>

      {/* Round trip */}
      <button
        type="button"
        role="tab"
        aria-selected={value === "round-trip"}
        onClick={() => onChange("round-trip")}
        className={cn(
          "group relative flex h-11 items-center gap-2",
          "text-[14px] font-medium",
          "transition-colors duration-150",
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[#0078D2]/25",
          "focus-visible:ring-offset-2",
          value === "round-trip"
            ? "text-[#0078D2]"
            : "text-slate-500 hover:text-slate-900"
        )}
      >
        <RoundTripIcon
          className="h-[14px] w-[14px]"
          aria-hidden="true"
        />

        <span>Round trip</span>

        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-px left-0 right-0 h-[2px]",
            value === "round-trip"
              ? "bg-[#0078D2]"
              : "bg-transparent"
          )}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Flight search form                                                         */
/* -------------------------------------------------------------------------- */

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

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [tripType, setTripType] = useState<TripType>(
    parseTripType(initialTripType)
  );

  const [from, setFrom] = useState(
    asInitialAirport(initialFrom)
  );

  const [to, setTo] = useState(
    asInitialAirport(initialTo)
  );

  const [departure, setDeparture] = useState(
    initialDeparture ?? ""
  );

  const [returnDate, setReturnDate] = useState(
    initialReturnDate ?? ""
  );

  const [composition, setComposition] =
    useState<PassengerComposition>(() =>
      parsePassengerComposition({
        passengers: initialPassengers,
        adults: initialAdults,
        seniors: initialSeniors,
        children: initialChildren,
        infants: initialInfants,
      })
    );

  const [error, setError] = useState<string | null>(
    null
  );

  /* ------------------------------------------------------------------------ */
  /* Trip type                                                                */
  /* ------------------------------------------------------------------------ */

  function selectTripType(next: TripType) {
    setTripType(next);
    setError(null);

    if (next === "one-way") {
      setReturnDate("");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Departure                                                                */
  /* ------------------------------------------------------------------------ */

  function handleDepartureChange(value: string) {
    setDeparture(value);
    setError(null);

    /*
     * If the passenger changes departure to a date
     * later than the currently selected return date,
     * clear the return date.
     */
    if (
      returnDate &&
      value &&
      returnDate < value
    ) {
      setReturnDate("");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Return                                                                   */
  /* ------------------------------------------------------------------------ */

  function handleReturnChange(value: string) {
    setReturnDate(value);
    setError(null);
  }

  /* ------------------------------------------------------------------------ */
  /* Passengers                                                               */
  /* ------------------------------------------------------------------------ */

  function handleCompositionChange(
    next: PassengerComposition
  ) {
    setComposition(next);
    setError(null);
  }

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const passengers = String(
      totalPassengers(composition)
    );

    const values = {
      tripType,
      from,
      to,
      departure,

      returnDate:
        tripType === "round-trip"
          ? returnDate
          : "",

      passengers,
      composition,
    };

    const validationError =
      validateFlightSearch(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    const searchParams =
      buildFlightSearchParams(values);

    router.push(
      `/flights/results?${searchParams.toString()}`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="w-full text-slate-950">
      {/* -------------------------------------------------------------- */}
      {/* Trip type                                                      */}
      {/* -------------------------------------------------------------- */}

      <div className="border-b border-slate-200">
        <TripTypeControl
          value={tripType}
          onChange={selectTripType}
        />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Search form                                                    */}
      {/* -------------------------------------------------------------- */}

      <form
        onSubmit={handleSubmit}
        className="
          grid
          grid-cols-1
          gap-3
          pt-4

          md:grid-cols-2

          xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(170px,0.88fr)_minmax(175px,0.9fr)_190px]
          xl:gap-2
        "
      >
        {/* ------------------------------------------------------------ */}
        {/* From                                                         */}
        {/* ------------------------------------------------------------ */}

        <div className="min-w-0">
          <AirportSelect
            id="from"
            name="from"
            label="From"
            value={from}
            excludeCode={to}
            describedBy={
              error
                ? "flight-search-error"
                : undefined
            }
            onChange={(code) => {
              setFrom(code);
              setError(null);
            }}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* To                                                           */}
        {/* ------------------------------------------------------------ */}

        <div className="min-w-0">
          <AirportSelect
            id="to"
            name="to"
            label="To"
            value={to}
            excludeCode={from}
            describedBy={
              error
                ? "flight-search-error"
                : undefined
            }
            onChange={(code) => {
              setTo(code);
              setError(null);
            }}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Travel dates                                                 */}
        {/* ------------------------------------------------------------ */}

        <div
          className={cn(
            "min-w-0",

            tripType === "round-trip" &&
              "md:col-span-2 xl:col-span-1"
          )}
        >
          <FlightDateRangePicker
            tripType={tripType}
            departure={departure}
            returnDate={returnDate}
            onDepartureChange={
              handleDepartureChange
            }
            onReturnChange={
              handleReturnChange
            }
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Passengers                                                   */}
        {/* ------------------------------------------------------------ */}

        <div className="min-w-0">
          <PassengerPicker
            value={composition}
            onChange={
              handleCompositionChange
            }
            describedBy={
              error
                ? "flight-search-error"
                : undefined
            }
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Search button                                                */}
        {/* ------------------------------------------------------------ */}

        <div className="flex min-w-0">
          <button
            type="submit"
            className="
              group
              flex
              h-[72px]
              w-full
              items-center
              justify-between

              bg-[#0078D2]

              px-5

              text-[15px]
              font-medium
              text-white

              transition-colors
              duration-150

              hover:bg-[#006bbd]

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/40
              focus-visible:ring-offset-2

              active:bg-[#005fa8]
            "
          >
            <span>Search flights</span>

            <SearchArrowIcon
              aria-hidden="true"
              className="
                h-[16px]
                w-[16px]
                shrink-0

                transition-transform
                duration-150

                group-hover:translate-x-0.5
              "
            />
          </button>
        </div>
      </form>

      {/* -------------------------------------------------------------- */}
      {/* Validation                                                     */}
      {/* -------------------------------------------------------------- */}

      {error ? (
        <div
          id="flight-search-error"
          role="alert"
          className="
            mt-3
            border-l-2
            border-red-500
            pl-3

            text-[13px]
            font-medium
            leading-5
            text-red-700
          "
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}