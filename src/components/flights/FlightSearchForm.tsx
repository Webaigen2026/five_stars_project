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
                relative
                flex
                items-center
                gap-2
                border-b-2
                pb-3
                text-sm
                font-semibold
                transition-colors
                duration-150
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]
                focus-visible:ring-offset-4
              `,
              active
                ? "border-[#0078D2] text-[#0078D2]"
                : `
                    border-transparent
                    text-slate-500
                    hover:text-slate-900
                  `
            )}
          >
            <Icon
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
            />

            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ArrowIcon(props: SVGProps<SVGSVGElement>) {
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

  return (
    <div className="w-full text-slate-900">
      {/* Trip type */}
      <div className="border-b border-slate-200">
        <TripTypeControl
          value={tripType}
          onChange={selectTripType}
        />
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        className="
          grid
          grid-cols-1
          gap-4
          pt-6
          md:grid-cols-2
          xl:grid-cols-12
          xl:gap-3
        "
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
              error ? "flight-search-error" : undefined
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
              error ? "flight-search-error" : undefined
            }
            onChange={(code) => {
              setTo(code);
              setError(null);
            }}
          />
        </div>

        {/* Date */}
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
            onDepartureChange={handleDepartureChange}
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
              error ? "flight-search-error" : undefined
            }
          />
        </div>

        {/* Search */}
        <div
          className="
            flex
            min-w-0
            items-end
            md:col-span-2
            xl:col-span-2
          "
        >
          <button
            type="submit"
            className="
              group
              flex
              h-[66px]
              w-full
              items-center
              justify-between
              bg-[#0078D2]
              px-5
              text-left
              text-[15px]
              font-semibold
              text-white
              transition-colors
              duration-150
              hover:bg-[#006CBF]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]
              focus-visible:ring-offset-2
            "
          >
            <span>Search flights</span>

            <ArrowIcon
              aria-hidden="true"
              className="
                h-[18px]
                w-[18px]
                transition-transform
                duration-150
                group-hover:translate-x-1
              "
            />
          </button>
        </div>
      </form>

      {/* Error */}
      {error ? (
        <div
          id="flight-search-error"
          role="alert"
          className="
            mt-4
            border-l-2
            border-red-600
            bg-red-50
            px-4
            py-3
            text-sm
            font-medium
            text-red-700
          "
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}