import Link from "next/link";

import BookingStatusBadge from "./BookingStatusBadge";

import type { MyTripCardViewModel } from "../../lib/my-trips";

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

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-4
          -top-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-4
          -top-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-4
          -left-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-4
          -right-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />
    </>
  );
}

function DesktopPerforationCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-[11px]
          -top-[11px]
          z-30
          hidden
          h-[22px]
          w-[22px]
          rounded-full
          bg-slate-50
          lg:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-[11px]
          -left-[11px]
          z-30
          hidden
          h-[22px]
          w-[22px]
          rounded-full
          bg-slate-50
          lg:block
        "
      />
    </>
  );
}

function MobilePerforationCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-[11px]
          -top-[11px]
          z-30
          h-[22px]
          w-[22px]
          rounded-full
          bg-slate-50
          lg:hidden
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-[11px]
          -top-[11px]
          z-30
          h-[22px]
          w-[22px]
          rounded-full
          bg-slate-50
          lg:hidden
        "
      />
    </>
  );
}

export default function MyTripCard({
  trip,
}: {
  trip: MyTripCardViewModel;
}) {
  return (
    <article
      className="
        group
        relative
        isolate
        min-w-0
        transition-transform
        duration-200
        hover:-translate-y-0.5
      "
      aria-labelledby={`trip-${trip.bookingId}-heading`}
    >
      {/* Soft floating shadow only — no outer border */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-8
          -bottom-3
          -z-10
          h-8
          rounded-[50%]
          bg-slate-950/[0.08]
          blur-2xl
          transition
          duration-200
          group-hover:bg-slate-950/10
        "
      />

      {/* Ticket */}
      <div
        className="
          relative
          overflow-hidden
          bg-white
          shadow-[0_8px_30px_rgba(15,23,42,0.07)]
        "
      >
        <TicketCutouts />

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* =========================================================
              MAIN TICKET
          ========================================================= */}
          <div className="min-w-0 px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            {/* Status */}
            <div className="flex flex-wrap items-center gap-3">
              <BookingStatusBadge status={trip.status} />

              {trip.isActionNeeded ? (
                <p className="text-sm font-medium text-[#0078D2]">
                  Payment not completed
                </p>
              ) : null}
            </div>

            {/* Trip type */}
            <p
              className="
                mt-5
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#0078D2]
              "
            >
              {trip.tripTypeLabel}
            </p>

            {/* Route */}
            <h3
              id={`trip-${trip.bookingId}-heading`}
              className="
                font-american-sans
                mt-2
                max-w-4xl
                break-words
                text-[1.75rem]
                font-light
                leading-[1.08]
                tracking-[-0.03em]
                text-slate-950
                sm:text-[2rem]
                lg:text-[2.2rem]
              "
            >
              {trip.routeHeading}
            </h3>

            {/* Route detail */}
            {trip.routeDetail ? (
              <p className="mt-2 text-sm font-medium text-slate-500">
                {trip.routeDetail}
              </p>
            ) : null}

            {/* Date */}
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {trip.datesLabel}
            </p>

            {/* Booking metadata */}
            <div
              className="
                mt-7
                hidden
                grid-cols-2
                gap-x-8
                gap-y-5
                border-t
                border-dashed
                border-slate-200
                pt-5
                sm:grid
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                  "
                >
                  Booking
                </p>

                <p
                  className="
                    fs-nums
                    mt-1.5
                    break-all
                    text-sm
                    font-semibold
                    tracking-[0.02em]
                    text-slate-950
                  "
                >
                  {trip.bookingReference}
                </p>
              </div>

              <div>
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                  "
                >
                  Travelers
                </p>

                <p className="mt-1.5 text-sm font-semibold text-slate-950">
                  {trip.travelerLabel}
                </p>
              </div>
            </div>

            {/* Action-needed message */}
            {trip.isActionNeeded ? (
              <div
                className="
                  mt-6
                  border-l-2
                  border-[#0078D2]
                  bg-[#0078D2]/[0.04]
                  px-4
                  py-3
                "
              >
                <p className="text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-950">
                    {trip.statusLabel}
                  </span>

                  {" — "}

                  {trip.statusDescription}
                </p>
              </div>
            ) : null}

            {/* Ticket footer */}
            <div
              className="
                mt-7
                flex
                flex-col
                gap-2
                border-t
                border-dashed
                border-slate-200
                pt-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-slate-400
                "
              >
                Five Stars • Travel
              </p>

              <p className="text-xs text-slate-400">
                Reservation summary
              </p>
            </div>
          </div>

          {/* =========================================================
              TICKET STUB
          ========================================================= */}
          <aside
            className="
              relative
              min-w-0
              border-t
              border-dashed
              border-slate-300
              bg-slate-50/45
              px-5
              py-6
              sm:px-7
              lg:border-l
              lg:border-t-0
              lg:px-6
              lg:py-8
            "
            aria-label="Booking summary"
          >
            <DesktopPerforationCutouts />
            <MobilePerforationCutouts />

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:block">
              {/* Total */}
              <div>
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-500
                  "
                >
                  Total
                </p>

                <p
                  className="
                    fs-nums
                    mt-1
                    text-2xl
                    font-bold
                    tracking-[-0.025em]
                    text-slate-950
                    sm:text-[1.7rem]
                  "
                >
                  {trip.totalLabel}
                </p>
              </div>

              {/* Booking reference */}
              <div className="lg:mt-8">
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-500
                  "
                >
                  Booking
                </p>

                <p
                  className="
                    fs-nums
                    mt-1.5
                    break-all
                    text-sm
                    font-semibold
                    tracking-[0.025em]
                    text-slate-950
                  "
                >
                  {trip.bookingReference}
                </p>
              </div>

              {/* Travelers */}
              <div className="col-span-2 sm:col-span-1 lg:mt-7">
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-500
                  "
                >
                  Travelers
                </p>

                <p className="mt-1.5 text-sm font-semibold text-slate-950">
                  {trip.travelerLabel}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div
              className="
                mt-6
                flex
                flex-col
                gap-3
                border-t
                border-dashed
                border-slate-300
                pt-5
                sm:flex-row
                lg:mt-8
                lg:flex-col
              "
            >
              <Link
                href={trip.tripHref}
                className="
                  inline-flex
                  min-h-11
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
                  shadow-[0_4px_12px_rgba(0,120,210,0.18)]
                  transition
                  hover:bg-[#006bbd]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/30
                  focus-visible:ring-offset-2
                "
              >
                View trip
                <ArrowRightIcon />
              </Link>

              <Link
                href={trip.itineraryHref}
                className="
                  inline-flex
                  min-h-11
                  w-full
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-slate-700
                  transition
                  hover:border-[#0078D2]/30
                  hover:bg-[#f5faff]
                  hover:text-[#0078D2]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/30
                  focus-visible:ring-offset-2
                "
              >
                View itinerary
              </Link>
            </div>

            {/* Stub footer */}
            <div
              className="
                mt-6
                hidden
                border-t
                border-dashed
                border-slate-300
                pt-4
                lg:block
              "
            >
              <p
                className="
                  text-center
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-slate-400
                "
              >
                Five Stars
              </p>

              {/* Decorative barcode */}
              <div
                aria-hidden="true"
                className="
                  mx-auto
                  mt-3
                  flex
                  h-7
                  max-w-[150px]
                  items-stretch
                  justify-center
                  gap-[2px]
                  overflow-hidden
                  opacity-30
                "
              >
                <span className="w-px bg-slate-950" />
                <span className="w-[2px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[3px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[2px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[4px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[2px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[3px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[2px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[4px] bg-slate-950" />
                <span className="w-[2px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[3px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
                <span className="w-[2px] bg-slate-950" />
                <span className="w-px bg-slate-950" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}