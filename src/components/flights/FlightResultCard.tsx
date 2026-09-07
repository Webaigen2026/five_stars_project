"use client";

import { getCustomerAirlineName } from "../../lib/brand";

import {
  formatArrivalTime,
  formatDepartureTime,
  formatDuration,
} from "../../lib/trip-formatting";

export type FlightResultCardFlight = {
  id: number;
  code: string;
  airline: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  availableSeats: number;
};

type FlightResultCardProps = {
  flight: FlightResultCardFlight;
  selectLabel?: string;
  onSelect?: () => void;
};

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function FlightResultCard({
  flight,
  selectLabel = "Select Flight",
  onSelect,
}: FlightResultCardProps) {
  const airlineName = getCustomerAirlineName(flight.airline);
  const price = (flight.price / 100).toFixed(2);

  return (
    <article
      className="
        group
        relative
        isolate
        w-full
        min-w-0
        font-sans
        transition-transform
        duration-300
        motion-safe:hover:-translate-y-1
      "
    >
      {/* Soft ticket shadow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-8
          -bottom-3
          -z-10
          h-8
          rounded-[50%]
          bg-slate-950/10
          blur-2xl
          transition
          duration-300
          group-hover:bg-slate-950/15
        "
      />

      <div
        className="
          relative
          w-full
          min-w-0
          overflow-hidden
          bg-white
          shadow-[0_8px_30px_rgba(15,23,42,0.08)]
         
          transition-shadow
          duration-300
          group-hover:shadow-[0_18px_46px_rgba(15,23,42,0.12)]
        "
      >
        {/* Ticket corner cutouts */}
        {[
          "-left-5 -top-5",
          "-bottom-5 -left-5",
          "-right-5 -top-5",
          "-bottom-5 -right-5",
        ].map((position) => (
          <div
            key={position}
            aria-hidden="true"
            className={`
              pointer-events-none
              absolute
              z-30
              h-10
              w-10
              rounded-full
              bg-slate-50
              ${position}
            `}
          />
        ))}

        {/* Middle notches */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -left-3
            top-1/2
            z-30
            h-6
            w-6
            -translate-y-1/2
            rounded-full
            bg-slate-100
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-3
            top-1/2
            z-30
            h-6
            w-6
            -translate-y-1/2
            rounded-full
            bg-slate-50
          "
        />

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_260px]">
          {/* Main ticket */}
          <div className="min-w-0 p-5 sm:p-6 lg:p-8">
            {/* Top row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span
                  className="
                    inline-flex
                    shrink-0
                    items-center
                    rounded-lg
                    border
                    border-[#0078D2]/15
                    bg-[#0078D2]/[0.06]
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    tracking-[0.04em]
                    text-[#0078D2]
                  "
                >
                  {flight.code}
                </span>

                <span className="truncate text-sm font-medium text-slate-600">
                  {airlineName}
                </span>
              </div>

              <span
                className="
                  hidden
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-slate-400
                  sm:block
                "
              >
                Flight
              </span>
            </div>

            {/* Route */}
            <div
              className="
                mt-7
                grid
                min-w-0
                gap-6
                sm:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)]
                sm:items-center
                lg:mt-8
                lg:grid-cols-[minmax(0,1fr)_210px_minmax(0,1fr)]
              "
            >
              {/* Departure */}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                  Departure
                </p>

                <p
                  className="
                    font-american-sans
                    mt-2
                    text-[2rem]
                    font-light
                    leading-none
                    tracking-[-0.03em]
                    text-slate-950
                    sm:text-[2.15rem]
                  "
                >
                  {formatDepartureTime(flight)}
                </p>

                <div className="mt-3 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {flight.origin}
                  </p>

                  <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-[#0078D2]">
                    {flight.originCode}
                  </p>
                </div>
              </div>

              {/* Flight path */}
              <div className="min-w-0 py-1">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="h-px w-4 bg-slate-200" />

                  <span className="text-xs font-medium text-slate-500">
                    {formatDuration(flight.durationMinutes)}
                  </span>

                  <span className="h-px w-4 bg-slate-200" />
                </div>

                <div className="flex items-center">
                  <span
                    className="
                      h-2.5
                      w-2.5
                      shrink-0
                      rounded-full
                      border-2
                      border-[#0078D2]
                      bg-white
                    "
                  />

                  <div className="relative flex-1 px-1">
                    <div className="border-t border-dashed border-slate-300" />

                    <span
                      className="
                        absolute
                        left-1/2
                        top-1/2
                        flex
                        h-8
                        w-8
                        -translate-x-1/2
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-slate-200
                        bg-white
                        text-[#0078D2]
                        shadow-sm
                      "
                    >
                      <ArrowRightIcon />
                    </span>
                  </div>

                  <span
                    className="
                      h-2.5
                      w-2.5
                      shrink-0
                      rounded-full
                      border-2
                      border-[#0078D2]
                      bg-white
                    "
                  />
                </div>

                <div className="mt-3 text-center">
                  <span
                    className="
                      inline-flex
                      rounded-md
                      bg-emerald-50
                      px-2.5
                      py-1
                      text-xs
                      font-semibold
                      text-emerald-700
                    "
                  >
                    Nonstop
                  </span>
                </div>
              </div>

              {/* Arrival */}
              <div className="min-w-0 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                  Arrival
                </p>

                <p
                  className="
                    font-american-sans
                    mt-2
                    text-[2rem]
                    font-light
                    leading-none
                    tracking-[-0.03em]
                    text-slate-950
                    sm:text-[2.15rem]
                  "
                >
                  {formatArrivalTime(flight)}
                </p>

                <div className="mt-3 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {flight.destination}
                  </p>

                  <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-[#0078D2]">
                    {flight.destinationCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom metadata */}
            <div
              className="
                mt-7
                flex
                flex-wrap
                items-center
                gap-x-5
                gap-y-3
                border-t
                border-slate-100
                pt-4
              "
            >
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span
                  className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full
                    bg-slate-50
                    text-slate-400
                  "
                >
                  <UsersIcon />
                </span>

                <span>
                  <span className="font-semibold text-slate-800">
                    {flight.availableSeats}
                  </span>{" "}
                  seats remaining
                </span>
              </div>

              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Economy
              </span>
            </div>
          </div>

          {/* Fare stub */}
          <aside
            className="
              relative
              min-w-0
              border-t
              border-dashed
              border-slate-300
              bg-slate-50/80
              p-5
              sm:p-6
              lg:border-l
              lg:border-t-0
              lg:p-7
            "
          >
            {/* Perforation notches */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -top-3
                left-1/2
                z-30
                h-6
                w-6
                -translate-x-1/2
                rounded-full
                bg-slate-50
                ring-1
                ring-slate-200
                lg:-left-3
                lg:top-[-12px]
                lg:translate-x-0
              "
            />

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-3
                left-1/2
                z-30
                h-6
                w-6
                -translate-x-1/2
                rounded-full
                bg-slate-50
                ring-1
                ring-slate-200
                lg:-left-3
                lg:translate-x-0
              "
            />

            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                  Fare from
                </p>

                <p
                  className="
                    font-american-sans
                    mt-2
                    text-[2rem]
                    font-light
                    leading-none
                    tracking-[-0.03em]
                    text-slate-950
                  "
                >
                  ${price}
                </p>

                <p className="mt-1.5 text-xs text-slate-500">
                  per passenger
                </p>

                <dl className="mt-5 space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-slate-500">
                      Cabin
                    </dt>

                    <dd className="text-xs font-medium text-slate-800">
                      Economy
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-slate-500">
                      Route
                    </dt>

                    <dd className="text-xs font-medium text-slate-800">
                      {flight.originCode} → {flight.destinationCode}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                onClick={onSelect}
                className="
                  group/button
                  mt-6
                  inline-flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-[#0078D2]
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  shadow-[0_5px_14px_rgba(0,120,210,0.22)]
                  transition
                  duration-200
                  hover:bg-[#006bbd]
                  hover:shadow-[0_8px_20px_rgba(0,120,210,0.26)]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/30
                  focus-visible:ring-offset-2
                  active:translate-y-px
                "
              >
                <span>{selectLabel}</span>

                <span className="transition-transform duration-200 group-hover/button:translate-x-0.5">
                  <ArrowRightIcon />
                </span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}