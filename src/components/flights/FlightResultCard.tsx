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
  /** Opens fare modal (preferred). */
  onSelect?: () => void;
};

export default function FlightResultCard({
  flight,
  selectLabel = "Select Flight",
  onSelect,
}: FlightResultCardProps) {
  return (
    <article
      className="
        group
        relative
        isolate
        font-sans
        transition-all
        duration-300
        hover:-translate-y-1
      "
    >
      {/* Floating shadow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-8
          -bottom-4
          -z-10
          h-10
          rounded-[50%]
          bg-slate-950/10
          blur-2xl
          transition-all
          duration-300
          group-hover:bg-slate-950/15
        "
      />

      {/* Main ticket body */}
      <div
        className="
          relative
          overflow-hidden
          bg-white
          shadow-[0_10px_34px_rgba(15,23,42,0.08)]
          transition-shadow
          duration-300
          group-hover:shadow-[0_18px_48px_rgba(15,23,42,0.13)]
        "
      >
        {/* Subtle inner border */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-x-[10px]
            top-[10px]
            bottom-[10px]
            border-y
            border-slate-100
          "
        />

        {/* Top-left concave corner */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -left-5
            -top-5
            z-30
            h-10
            w-10
            rounded-full
            bg-slate-100
          "
        />

        {/* Bottom-left concave corner */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -bottom-5
            -left-5
            z-30
            h-10
            w-10
            rounded-full
            bg-slate-100
          "
        />

        {/* Top-right concave corner */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-5
            -top-5
            z-30
            h-10
            w-10
            rounded-full
            bg-slate-100
          "
        />

        {/* Bottom-right concave corner */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -bottom-5
            -right-5
            z-30
            h-10
            w-10
            rounded-full
            bg-slate-100
          "
        />

        {/* Left middle ticket notch */}
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

        {/* Right middle ticket notch */}
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
            bg-slate-100
          "
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_250px]">
          {/* Main ticket section */}
          <div className="relative p-5 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="
                    fs-label
                    inline-flex
                    items-center
                    rounded-full
                    border
                    border-sky-100
                    bg-sky-50
                    px-3
                    py-1.5
                    text-primary
                  "
                >
                  {flight.code}
                </span>

                <span
                  className="
                    font-american-sans
                    text-sm
                    font-light
                    tracking-[-0.015em]
                    text-slate-600
                  "
                >
                  {getCustomerAirlineName(flight.airline)}
                </span>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <span className="h-px w-6 bg-slate-200" />

                <span className="fs-label text-slate-400">
                  Flight ticket
                </span>
              </div>
            </div>

            {/* Route */}
            <div
              className="
                mt-8
                grid
                gap-6
                sm:grid-cols-[1fr_minmax(170px,230px)_1fr]
                sm:items-center
              "
            >
              {/* Departure */}
              <div>
                <p className="fs-label text-slate-400">
                  Departure
                </p>

                <p
                  className="
                    font-american-sans
                    fs-nums
                    mt-2
                    text-[2rem]
                    font-light
                    tracking-[-0.025em]
                    text-slate-950
                    sm:text-[2.15rem]
                  "
                >
                  {formatDepartureTime(flight)}
                </p>

                <div className="mt-2.5">
                  <p
                    className="
                      font-american-sans
                      text-sm
                      font-light
                      tracking-[-0.015em]
                      text-slate-900
                    "
                  >
                    {flight.origin}
                  </p>

                  <p className="fs-label mt-1 text-primary">
                    {flight.originCode}
                  </p>
                </div>
              </div>

              {/* Route visualization */}
              <div className="relative py-3">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="h-px w-5 bg-slate-200" />

                  <p className="fs-label text-slate-400">
                    {formatDuration(flight.durationMinutes)}
                  </p>

                  <span className="h-px w-5 bg-slate-200" />
                </div>

                <div className="flex items-center">
                  <span
                    className="
                      h-2.5
                      w-2.5
                      shrink-0
                      rounded-full
                      border-2
                      border-primary
                      bg-white
                      shadow-[0_0_0_3px_rgba(14,165,233,0.08)]
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
                        text-primary
                        shadow-[0_4px_12px_rgba(15,23,42,0.08)]
                      "
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 rotate-90 sm:rotate-0"
                        aria-hidden="true"
                      >
                        <path d="M3 12h18" />
                        <path d="m15 6 6 6-6 6" />
                      </svg>
                    </span>
                  </div>

                  <span
                    className="
                      h-2.5
                      w-2.5
                      shrink-0
                      rounded-full
                      border-2
                      border-primary
                      bg-white
                      shadow-[0_0_0_3px_rgba(14,165,233,0.08)]
                    "
                  />
                </div>

                <div className="mt-3 flex justify-center">
                  <span
                    className="
                      fs-label
                      inline-flex
                      items-center
                      rounded-full
                      bg-emerald-50
                      px-2.5
                      py-1
                      text-emerald-700
                    "
                  >
                    Nonstop
                  </span>
                </div>
              </div>

              {/* Arrival */}
              <div className="sm:text-right">
                <p className="fs-label text-slate-400">
                  Arrival
                </p>

                <p
                  className="
                    font-american-sans
                    fs-nums
                    mt-2
                    text-[2rem]
                    font-light
                    tracking-[-0.025em]
                    text-slate-950
                    sm:text-[2.15rem]
                  "
                >
                  {formatArrivalTime(flight)}
                </p>

                <div className="mt-2.5">
                  <p
                    className="
                      font-american-sans
                      text-sm
                      font-light
                      tracking-[-0.015em]
                      text-slate-900
                    "
                  >
                    {flight.destination}
                  </p>

                  <p className="fs-label mt-1 text-primary">
                    {flight.destinationCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom metadata */}
            <div
              className="
                mt-8
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
                </span>

                <span>
                  <span className="fs-nums font-semibold text-slate-700">
                    {flight.availableSeats}
                  </span>{" "}
                  seats remaining
                </span>
              </div>

              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

              <span className="fs-label text-slate-400">
                Economy
              </span>
            </div>
          </div>

          {/* Ticket stub */}
          <div
            className="
              relative
              border-t
              border-dashed
              border-slate-300
              bg-slate-50/70
              p-5
              sm:p-6
              lg:border-l
              lg:border-t-0
              lg:p-7
            "
          >
            {/* Perforation top notch */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -top-8
                left-1/2
                z-30
                h-6
                w-6
                -translate-x-1/2
                rounded-full
                border
                border-slate-200
                bg-slate-100
                lg:-left-3
                lg:top-[-10px]
                lg:translate-x-0
              "
            />

            {/* Perforation bottom notch */}
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
                border
                border-slate-200
                bg-slate-200
                lg:-bottom-3
                lg:-left-3
                lg:translate-x-0
              "
            />

            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="fs-label text-slate-400">
                  Fare from
                </p>

                <div className="mt-2 flex items-end gap-1">
                  <p
                    className="
                      font-american-sans
                      fs-nums
                      text-[2rem]
                      font-light
                      tracking-[-0.025em]
                      text-slate-950
                    "
                  >
                    ${(flight.price / 100).toFixed(2)}
                  </p>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  per passenger
                </p>

                <div className="mt-5 border-t border-slate-200/70 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Cabin
                    </span>

                    <span
                      className="
                        font-american-sans
                        text-xs
                        font-light
                        tracking-[-0.01em]
                        text-slate-700
                      "
                    >
                      Economy
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Route
                    </span>

                    <span
                      className="
                        font-american-sans
                        fs-nums
                        text-xs
                        font-light
                        tracking-[-0.01em]
                        text-slate-700
                      "
                    >
                      {flight.originCode} → {flight.destinationCode}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSelect}
                className="
                  group/button
                  relative
                  mt-6
                  inline-flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  overflow-hidden
                  rounded-[14px]
                  bg-primary
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  shadow-[0_8px_22px_rgba(2,132,199,0.22)]
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-primary-hover
                  hover:shadow-[0_12px_28px_rgba(2,132,199,0.28)]
                  focus-visible:outline-none
                  focus-visible:ring-4
                  focus-visible:ring-primary/20
                  active:translate-y-0
                "
              >
                <span className="relative z-10">
                  {selectLabel}
                </span>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="
                    relative
                    z-10
                    h-4
                    w-4
                    transition-transform
                    duration-200
                    group-hover/button:translate-x-0.5
                  "
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>

                <span
                  aria-hidden="true"
                  className="
                    absolute
                    inset-0
                    -translate-x-[120%]
                    bg-gradient-to-r
                    from-transparent
                    via-white/15
                    to-transparent
                    transition-transform
                    duration-700
                    group-hover/button:translate-x-[120%]
                  "
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}