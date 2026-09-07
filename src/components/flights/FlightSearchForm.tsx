"use client";

import {
  FormEvent,
  useState,
  type ComponentType,
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

type TripTypeIcon = ComponentType<SVGProps<SVGSVGElement>>;

type TripTypeOption = {
  value: TripType;
  label: string;
  icon: TripTypeIcon;
};

function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function OneWayIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M4 12h15" />
      <path d="m14 7 5 5-5 5" />
      <path d="M7 8.5 4 12l3 3.5" opacity="0.35" />
    </svg>
  );
}

function RoundTripIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M5 7h12" />
      <path d="m14 4 3 3-3 3" />
      <path d="M19 17H7" />
      <path d="m10 14-3 3 3 3" />
    </svg>
  );
}

const TRIP_TYPES: TripTypeOption[] = [
  {
    value: "one-way",
    label: "One way",
    icon: OneWayIcon,
  },
  {
    value: "round-trip",
    label: "Round trip",
    icon: RoundTripIcon,
  },
];

function asInitialAirport(value?: string) {
  return value && isKnownAirportCode(value)
    ? value.trim().toUpperCase()
    : "";
}

function TripTypeInlineControl({
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
      className="
        flex
        flex-wrap
        items-start
        justify-center
        gap-4
        sm:justify-start
      "
    >
      {TRIP_TYPES.map(({ value: type, label, icon: Icon }) => {
        const active = value === type;

        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(type)}
            className={cn(
              `
                group
                flex
                w-[5.5rem]
                cursor-pointer
                flex-col
                items-center
                justify-start
                gap-2
                rounded-2xl
                p-1
                text-center
                transition-all
                duration-200
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]
                focus-visible:ring-offset-2
                sm:w-[5.75rem]
              `,
              active
                ? "scale-[1.03]"
                : "hover:-translate-y-0.5"
            )}
          >
            <span
              className={cn(
                `
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  border
                  transition-all
                  duration-200
                  sm:h-16
                  sm:w-16
                `,
                active
                  ? `
                      border-[#0078D2]
                      bg-[#0078D2]
                      shadow-[0_6px_16px_rgba(0,120,210,0.22)]
                    `
                  : `
                      border-slate-200
                      bg-white
                      shadow-sm
                      group-hover:border-[#0078D2]
                      group-hover:shadow-[0_5px_14px_rgba(0,120,210,0.12)]
                    `
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-6 w-6 shrink-0 transition-colors duration-200",
                  active
                    ? "text-white"
                    : "text-[#0078D2]"
                )}
              />
            </span>

            <span
              className={cn(
                `
                  block
                  min-h-5
                  w-full
                  whitespace-nowrap
                  text-center
                  text-xs
                  font-semibold
                  leading-5
                  tracking-[-0.01em]
                  transition-all
                  duration-200
                  sm:text-sm
                `,
                active
                  ? "text-[#0078D2]"
                  : "text-slate-700 group-hover:text-[#0078D2]"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
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

  function handleCompositionChange(
    next: PassengerComposition
  ) {
    setComposition(next);
    setError(null);
  }

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
        tripType === "round-trip" ? returnDate : "",
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

    router.push(
      `/flights/results?${buildFlightSearchParams(
        values
      ).toString()}`
    );
  }

  const fieldGridClass =
    "grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-12";

  return (
    <div
      className="
       
        border
        border-slate-200
        bg-white
        p-4
        text-slate-900
        shadow-[0_10px_35px_rgba(15,23,42,0.08)]
        sm:p-5
        lg:p-6
        xl:p-7
      "
    >
      {/* Header */}
      {/* <div className="mb-6"> */}
        {/* <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#0078D2]">
          Flight Search
        </p> */}

        {/* <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.015em] text-slate-950 sm:text-3xl">
          Find your next flight
        </h2>
      </div> */}

      {/* Trip type */}
      <div className="mb-7 border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <TripTypeInlineControl
          value={tripType}
          onChange={selectTripType}
        />
        <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.015em] text-slate-950 sm:text-3xl sm:mt-0">
          Find your next flight with Five Stars.
        </h2>
      </div>


      {/* Search fields */}
      <form
        onSubmit={handleSubmit}
        className={fieldGridClass}
      >
        {/* From */}
        <div
          className={cn(
            "min-w-0",
            tripType === "round-trip"
              ? "xl:col-span-2"
              : "xl:col-span-3"
          )}
        >
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

        {/* To */}
        <div
          className={cn(
            "min-w-0",
            tripType === "round-trip"
              ? "xl:col-span-2"
              : "xl:col-span-3"
          )}
        >
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

        {/* Dates */}
        <div
          className={cn(
            "min-w-0",
            tripType === "round-trip"
              ? "md:col-span-2 xl:col-span-4"
              : "xl:col-span-2"
          )}
        >
          <FlightDateRangePicker
            tripType={tripType}
            departure={departure}
            returnDate={returnDate}
            onDepartureChange={
              handleDepartureChange
            }
            onReturnChange={(value) => {
              setReturnDate(value);
              setError(null);
            }}
          />
        </div>

        {/* Passengers */}
        <div className="min-w-0 xl:col-span-2">
          <PassengerPicker
            value={composition}
            onChange={handleCompositionChange}
            describedBy={
              error
                ? "flight-search-error"
                : undefined
            }
          />
        </div>

        {/* Search button */}
        <div className="flex min-w-0 items-end xl:col-span-2">
          <button
            type="submit"
            className="
              flex
              h-[66px]
              w-full
              items-center
              justify-center
              rounded-lg
              bg-[#0078D2]
              px-5
              text-base
              font-semibold
              text-white
              shadow-[0_4px_12px_rgba(0,120,210,0.18)]
              transition-all
              duration-200
              hover:bg-[#006bbd]
              hover:shadow-[0_6px_16px_rgba(0,120,210,0.24)]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]
              focus-visible:ring-offset-2
              active:translate-y-px
            "
          >
        Flights
          </button>
        </div>
      </form>

      {/* Error */}
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