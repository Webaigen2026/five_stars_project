"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import SeatMap from "./SeatMap";

import { buildSeatMapRows } from "../../lib/seat-selection";
import type { FareFamily } from "../../lib/fare-families";
import type { SeatLayout } from "../../lib/seat-layouts";
import { formatMoney } from "../../lib/trip-formatting";

type PassengerView = {
  id: number;
  displayName: string;
  passengerType: string;
  passengerTypeLabel: string;
  seatNumber: string | null;
  seatFeeCents: number | null;
};

type SegmentView = {
  bookingSegmentId: number | null;
  segmentType: "OUTBOUND" | "RETURN";
  segmentLabel: string;
  flightCode: string;
  originCode: string;
  destinationCode: string;
  departureLabel: string;
  aircraft: string | null;
  fareFamily: FareFamily;
  layoutAvailable: boolean;
  layout: SeatLayout | null;
  passengers: PassengerView[];
  occupiedSeatNumbers: string[];
};

type SeatSelectionContentProps = {
  bookingReference: string;
  editable: boolean;
  isGuestBooking: boolean;
  initialSegments: SegmentView[];
  initialSeatFeesTotal: number;
  confirmationHref: string;
  tripHref: string;
  findTripHref: string;
};

function cn(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function seatFeeDisplay(feeCents: number | null) {
  if (feeCents == null) {
    return null;
  }

  if (feeCents === 0) {
    return "Included";
  }

  return `+${formatMoney(feeCents)}`;
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="m4 10 4 4 8-9" />
    </svg>
  );
}

function TicketCutouts({
  backgroundClassName = "bg-slate-50",
}: {
  backgroundClassName?: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -left-3 -top-3 z-20 h-6 w-6 rounded-full",
          backgroundClassName
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-3 -top-3 z-20 h-6 w-6 rounded-full",
          backgroundClassName
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-3 -left-3 z-20 h-6 w-6 rounded-full",
          backgroundClassName
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-3 -right-3 z-20 h-6 w-6 rounded-full",
          backgroundClassName
        )}
      />
    </>
  );
}

function PerforationCutouts({
  backgroundClassName = "bg-slate-50",
}: {
  backgroundClassName?: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -left-3 -top-3 h-6 w-6 rounded-full",
          backgroundClassName
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-3 -top-3 h-6 w-6 rounded-full",
          backgroundClassName
        )}
      />
    </>
  );
}

export default function SeatSelectionContent({
  bookingReference,
  editable,
  isGuestBooking,
  initialSegments,
  initialSeatFeesTotal,
  confirmationHref,
  tripHref,
  findTripHref,
}: SeatSelectionContentProps) {
  const router = useRouter();

  const [segments, setSegments] = useState(initialSegments);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [passengerIndex, setPassengerIndex] = useState(0);
  const [seatFeesTotal, setSeatFeesTotal] =
    useState(initialSeatFeesTotal);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const segment = segments[segmentIndex];
  const passenger = segment?.passengers[passengerIndex];

  const mapRows = useMemo(() => {
    if (!segment?.layout || !passenger) {
      return [];
    }

    const occupied = new Set(
      segment.occupiedSeatNumbers.filter(
        (seat) =>
          !segment.passengers.some(
            (row) =>
              row.id === passenger.id &&
              row.seatNumber === seat
          )
      )
    );

    return buildSeatMapRows({
      layout: segment.layout,
      fareFamily: segment.fareFamily,
      occupiedSeatNumbers: occupied,
      selectedSeatNumber: passenger.seatNumber,
      activePassengerType: passenger.passengerType,
    });
  }, [segment, passenger]);

  async function refreshFromServer() {
    const response = await fetch(
      `/api/bookings/${encodeURIComponent(
        bookingReference
      )}/seats`,
      {
        credentials: "same-origin",
      }
    );

    const payload = (await response.json()) as {
      segments?: SegmentView[];
      seatFeesTotal?: number;
      error?: string;
    };

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      setAccessDenied(true);

      setError(
        isGuestBooking
          ? "Your booking access has expired. Verify your trip to continue."
          : "You do not have access to manage seats for this booking."
      );

      throw new Error("access_denied");
    }

    if (!response.ok) {
      throw new Error(
        payload.error ?? "Unable to refresh seats."
      );
    }

    if (payload.segments) {
      setSegments(payload.segments);
    }

    if (
      typeof payload.seatFeesTotal === "number"
    ) {
      setSeatFeesTotal(payload.seatFeesTotal);
    }
  }

  async function selectSeat(seatNumber: string) {
    if (
      !editable ||
      !segment?.bookingSegmentId ||
      !passenger ||
      busy ||
      accessDenied
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(
          bookingReference
        )}/seats/assign`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingSegmentId:
              segment.bookingSegmentId,
            passengerId: passenger.id,
            seatNumber,
          }),
        }
      );

      const payload = (await response.json()) as {
        error?: string;
        seatFeesTotal?: number;
      };

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        setAccessDenied(true);

        setError(
          payload.error ??
            (isGuestBooking
              ? "Your booking access has expired. Verify your trip to continue."
              : "You do not have access to manage seats for this booking.")
        );

        return;
      }

      if (!response.ok) {
        setError(
          payload.error ??
            "That seat is no longer available."
        );

        try {
          await refreshFromServer();
        } catch {
          // refreshFromServer may also surface access denial.
        }

        return;
      }

      await refreshFromServer();

      if (
        typeof payload.seatFeesTotal === "number"
      ) {
        setSeatFeesTotal(payload.seatFeesTotal);
      }

      if (
        passengerIndex <
        segment.passengers.length - 1
      ) {
        setPassengerIndex(
          (value) => value + 1
        );
      }
    } catch {
      setError("Unable to assign that seat.");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (
      segmentIndex <
      segments.length - 1
    ) {
      setSegmentIndex(
        (value) => value + 1
      );

      setPassengerIndex(0);
      setError(null);

      return;
    }

    router.push(confirmationHref);
  }

  /* =========================================================
     ACCESS DENIED
  ========================================================= */

  if (accessDenied) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <section
          className="
            relative
            isolate
            min-w-0
            overflow-hidden
            bg-white
            shadow-[0_10px_34px_rgba(15,23,42,0.07)]
          "
        >
          <TicketCutouts />

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#0078D2]
              "
            >
              Booking access
            </p>

            <h1
              className="
                font-american-sans
                mt-2
                text-3xl
                font-light
                tracking-[-0.025em]
                text-slate-950
                sm:text-4xl
              "
            >
              Booking access required
            </h1>

            <p
              role="alert"
              className="
                mt-4
                max-w-xl
                text-sm
                leading-6
                text-slate-600
              "
            >
              {error ??
                (isGuestBooking
                  ? "Your booking access has expired. Verify your trip to continue."
                  : "You do not have access to manage seats for this booking.")}
            </p>
          </div>

          <div
            className="
              relative
              border-t
              border-dashed
              border-slate-300
              bg-slate-50/60
              px-5
              py-5
              sm:px-8
            "
          >
            <PerforationCutouts />

            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
              "
            >
              {isGuestBooking ? (
                <Link
                  href={findTripHref}
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#0078D2]
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#006bbd]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                    focus-visible:ring-offset-2
                  "
                >
                  Find My Trip
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#0078D2]
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#006bbd]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                    focus-visible:ring-offset-2
                  "
                >
                  Sign in
                </Link>
              )}

              <Link
                href={tripHref}
                className="
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-5
                  text-sm
                  font-semibold
                  text-slate-800
                  transition
                  hover:bg-slate-50
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/30
                "
              >
                Back to trip
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* =========================================================
     NO SEGMENT / PASSENGER
  ========================================================= */

  if (!segment || !passenger) {
    return (
      <section
        className="
          relative
          isolate
          min-w-0
          overflow-hidden
          bg-white
          px-5
          py-7
          shadow-[0_8px_28px_rgba(15,23,42,0.06)]
          sm:px-7
        "
      >
        <TicketCutouts />

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.16em]
            text-[#0078D2]
          "
        >
          Seat selection
        </p>

        <h2
          className="
            font-american-sans
            mt-2
            text-2xl
            font-light
            tracking-[-0.02em]
            text-slate-950
          "
        >
          Seats unavailable
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Seat selection is unavailable for this booking.
        </p>
      </section>
    );
  }

  const activeFeeLabel =
    seatFeeDisplay(passenger.seatFeeCents);

  const locked = !editable;

  const completedPassengerCount =
    segment.passengers.filter(
      (row) => Boolean(row.seatNumber)
    ).length;

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* =====================================================
          HEADING
      ===================================================== */}

      <header className="min-w-0">
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.18em]
            text-[#0078D2]
          "
        >
          Seat selection
        </p>

        <h1
          className="
            font-american-sans
            mt-2
            text-3xl
            font-light
            tracking-[-0.025em]
            text-slate-950
            sm:text-4xl
          "
        >
          Select your seats
        </h1>

        <p
          className="
            mt-2
            max-w-2xl
            text-base
            leading-7
            text-slate-600
          "
        >
          Choose a seat for each traveler before
          continuing.
        </p>

        {locked ? (
          <div
            role="status"
            className="
              mt-4
              max-w-2xl
              border-l-2
              border-[#0078D2]
              bg-[#0078D2]/[0.04]
              px-4
              py-3
              text-sm
              leading-6
              text-slate-600
            "
          >
            Seat selection is locked for this booking.
            You can still review assigned seats below.
          </div>
        ) : null}
      </header>

      {/* =====================================================
          SEGMENT NAVIGATION
      ===================================================== */}

      {segments.length > 1 ? (
        <nav
          aria-label="Flight segments"
          className="
            flex
            min-w-0
            flex-wrap
            gap-2
          "
        >
          {segments.map((row, index) => {
            const complete =
              row.passengers.length > 0 &&
              row.passengers.every(
                (traveler) =>
                  Boolean(traveler.seatNumber)
              );

            const active =
              index === segmentIndex;

            return (
              <button
                key={`${row.segmentType}-${row.flightCode}`}
                type="button"
                onClick={() => {
                  setSegmentIndex(index);
                  setPassengerIndex(0);
                  setError(null);
                }}
                className={cn(
                  `
                    inline-flex
                    min-h-11
                    min-w-0
                    items-center
                    gap-2
                    rounded-lg
                    border
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    transition
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/35
                  `,
                  active
                    ? `
                        border-[#0078D2]
                        bg-[#0078D2]
                        text-white
                        shadow-[0_4px_12px_rgba(0,120,210,0.16)]
                      `
                    : `
                        border-slate-200
                        bg-white
                        text-slate-700
                        hover:border-[#0078D2]/30
                        hover:bg-[#f7fbfe]
                      `
                )}
              >
                <span
                  className={cn(
                    "fs-nums text-xs",
                    active
                      ? "text-white/70"
                      : "text-slate-400"
                  )}
                >
                  {index + 1}
                </span>

                <span className="truncate">
                  {row.segmentLabel}
                </span>

                {complete ? (
                  <span
                    className={cn(
                      `
                        flex
                        h-5
                        w-5
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                      `,
                      active
                        ? "bg-white/15 text-white"
                        : "bg-emerald-50 text-emerald-700"
                    )}
                  >
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      ) : null}

      {/* =====================================================
          FLIGHT BOARDING PASS
      ===================================================== */}

      <section
        className="
          relative
          isolate
          min-w-0
          overflow-hidden
          bg-white
          shadow-[0_8px_30px_rgba(15,23,42,0.07)]
        "
      >
        <TicketCutouts />

        <div
          className="
            grid
            min-w-0
            md:grid-cols-[minmax(0,1fr)_190px]
          "
        >
          {/* Flight */}
          <div
            className="
              min-w-0
              px-5
              py-5
              sm:px-6
              sm:py-6
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#0078D2]
              "
            >
              {segment.segmentLabel}
            </p>

            <div
              className="
                mt-3
                grid
                min-w-0
                grid-cols-[auto_minmax(70px,1fr)_auto]
                items-center
                gap-3
                sm:gap-5
              "
            >
              <span
                className="
                  font-american-sans
                  fs-nums
                  text-3xl
                  font-light
                  tracking-[-0.025em]
                  text-slate-950
                  sm:text-4xl
                "
              >
                {segment.originCode}
              </span>

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    min-w-0
                    flex-1
                    border-t
                    border-dashed
                    border-slate-300
                  "
                />

                <span
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#0078D2]/[0.07]
                    text-[#0078D2]
                  "
                >
                  <ArrowRightIcon />
                </span>

                <span
                  className="
                    min-w-0
                    flex-1
                    border-t
                    border-dashed
                    border-slate-300
                  "
                />
              </div>

              <span
                className="
                  font-american-sans
                  fs-nums
                  text-3xl
                  font-light
                  tracking-[-0.025em]
                  text-slate-950
                  sm:text-4xl
                "
              >
                {segment.destinationCode}
              </span>
            </div>

            <div
              className="
                mt-5
                flex
                min-w-0
                flex-wrap
                items-center
                gap-x-3
                gap-y-2
                text-sm
              "
            >
              <span className="font-semibold text-slate-950">
                Five Stars
              </span>

              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-slate-300"
              />

              <span className="fs-nums font-semibold text-slate-900">
                {segment.flightCode}
              </span>

              {segment.aircraft ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-slate-300"
                  />

                  <span className="min-w-0 truncate text-slate-500">
                    {segment.aircraft}
                  </span>
                </>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {segment.departureLabel}
            </p>
          </div>

          {/* Boarding-pass stub */}
          <aside
            className="
              relative
              border-t
              border-dashed
              border-slate-300
              bg-slate-50/60
              px-5
              py-5
              md:border-l
              md:border-t-0
            "
          >
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -left-3
                -top-3
                h-6
                w-6
                rounded-full
                bg-slate-50
                md:top-auto
                md:-left-3
                md:-top-3
              "
            />

            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -right-3
                -top-3
                h-6
                w-6
                rounded-full
                bg-slate-50
                md:-left-3
                md:-right-auto
                md:top-auto
                md:-bottom-3
              "
            />

            <p
              className="
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-slate-400
              "
            >
              Booking
            </p>

            <p
              className="
                fs-nums
                mt-1
                truncate
                text-sm
                font-semibold
                text-slate-950
              "
            >
              {bookingReference}
            </p>

            <div
              className="
                mt-5
                grid
                grid-cols-2
                gap-4
                md:grid-cols-1
              "
            >
              <div>
                <p
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-400
                  "
                >
                  Travelers
                </p>

                <p
                  className="
                    fs-nums
                    mt-1
                    text-lg
                    font-semibold
                    text-slate-950
                  "
                >
                  {segment.passengers.length}
                </p>
              </div>

              <div>
                <p
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-400
                  "
                >
                  Assigned
                </p>

                <p
                  className="
                    fs-nums
                    mt-1
                    text-lg
                    font-semibold
                    text-slate-950
                  "
                >
                  {completedPassengerCount}/
                  {segment.passengers.length}
                </p>
              </div>
            </div>

            {/* Decorative barcode */}
            <div
              aria-hidden="true"
              className="
                mt-5
                flex
                h-7
                items-end
                gap-[2px]
                opacity-40
              "
            >
              {[
                14, 22, 11, 25, 17, 8, 24,
                13, 20, 10, 26, 16, 22,
              ].map((height, index) => (
                <span
                  key={index}
                  className="w-px bg-slate-700"
                  style={{ height }}
                />
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* =====================================================
          WORKSPACE
      ===================================================== */}

      <div
        className="
          grid
          min-w-0
          gap-6
          lg:grid-cols-[minmax(0,1fr)_22.5rem]
        "
      >
        {/* ===================================================
            SEAT MAP
        =================================================== */}

        <main className="min-w-0 space-y-5">
          {!segment.layoutAvailable ||
          !segment.layout ? (
            <section
              className="
                relative
                isolate
                min-w-0
                overflow-hidden
                bg-white
                px-5
                py-7
                shadow-[0_8px_28px_rgba(15,23,42,0.06)]
                sm:px-6
              "
            >
              <TicketCutouts />

              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#0078D2]
                "
              >
                Aircraft seating
              </p>

              <h2
                className="
                  font-american-sans
                  mt-2
                  text-2xl
                  font-light
                  tracking-[-0.02em]
                  text-slate-950
                "
              >
                Seat map unavailable
              </h2>

              <p
                className="
                  mt-2
                  max-w-xl
                  text-sm
                  leading-6
                  text-slate-600
                "
              >
                Seat selection is not available for this
                aircraft. You can continue without choosing
                seats.
              </p>
            </section>
          ) : (
            <SeatMap
              rows={mapRows}
              onSelectSeat={(seat) =>
                void selectSeat(seat)
              }
              busy={busy || locked}
              exitRows={segment.layout.exitRows}
            />
          )}

          {error ? (
            <div
              role="alert"
              className="
                border-l-2
                border-red-500
                bg-red-50
                px-4
                py-3
                text-sm
                font-medium
                leading-6
                text-red-700
              "
            >
              {error}
            </div>
          ) : null}
        </main>

        {/* ===================================================
            RIGHT RAIL
        =================================================== */}

        <aside
          className="
            min-w-0
            space-y-5
            lg:sticky
            lg:top-24
            lg:self-start
          "
        >
          {/* =================================================
              TRAVELERS
          ================================================= */}

          <section
            className="
              relative
              isolate
              min-w-0
              overflow-hidden
              bg-white
              shadow-[0_8px_28px_rgba(15,23,42,0.06)]
            "
          >
            <TicketCutouts />

            <div
              className="
                relative
                border-b
                border-dashed
                border-slate-300
                px-5
                py-5
              "
            >
              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -bottom-3
                  -left-3
                  h-6
                  w-6
                  rounded-full
                  bg-slate-50
                "
              />

              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -bottom-3
                  -right-3
                  h-6
                  w-6
                  rounded-full
                  bg-slate-50
                "
              />

              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#0078D2]
                "
              >
                Travelers
              </p>

              <h2
                className="
                  font-american-sans
                  mt-1.5
                  text-2xl
                  font-light
                  tracking-[-0.02em]
                  text-slate-950
                "
              >
                Who are you seating?
              </h2>
            </div>

            <ul
              className="
                divide-y
                divide-dashed
                divide-slate-200
              "
            >
              {segment.passengers.map(
                (row, index) => {
                  const active =
                    index === passengerIndex;

                  const feeLabel =
                    seatFeeDisplay(
                      row.seatFeeCents
                    );

                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPassengerIndex(index);
                          setError(null);
                        }}
                        className={cn(
                          `
                            relative
                            w-full
                            min-w-0
                            px-5
                            py-4
                            text-left
                            transition
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-inset
                            focus-visible:ring-[#0078D2]/35
                          `,
                          active
                            ? "bg-[#0078D2]/[0.055]"
                            : "bg-white hover:bg-slate-50/80"
                        )}
                      >
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="
                              absolute
                              inset-y-0
                              left-0
                              w-0.5
                              bg-[#0078D2]
                            "
                          />
                        ) : null}

                        <div
                          className="
                            flex
                            min-w-0
                            items-start
                            gap-3
                          "
                        >
                          <span
                            className={cn(
                              `
                                fs-nums
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                text-xs
                                font-semibold
                              `,
                              active
                                ? "bg-[#0078D2] text-white"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {index + 1}
                          </span>

                          <div
                            className="
                              min-w-0
                              flex-1
                            "
                          >
                            <p
                              className="
                                truncate
                                text-sm
                                font-semibold
                                text-slate-950
                              "
                            >
                              {row.displayName}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-xs
                                text-slate-500
                              "
                            >
                              {
                                row.passengerTypeLabel
                              }
                            </p>

                            <div
                              className="
                                mt-2
                                flex
                                flex-wrap
                                items-center
                                gap-2
                              "
                            >
                              {row.seatNumber ? (
                                <>
                                  <span
                                    className="
                                      text-xs
                                      font-medium
                                      text-slate-600
                                    "
                                  >
                                    Seat{" "}
                                    <span
                                      className="
                                        fs-nums
                                        font-semibold
                                        text-slate-950
                                      "
                                    >
                                      {
                                        row.seatNumber
                                      }
                                    </span>
                                  </span>

                                  {feeLabel ? (
                                    <span
                                      className="
                                        fs-nums
                                        text-xs
                                        font-medium
                                        text-[#0078D2]
                                      "
                                    >
                                      {feeLabel}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span
                                  className="
                                    text-xs
                                    text-slate-400
                                  "
                                >
                                  Seat not selected
                                </span>
                              )}
                            </div>
                          </div>

                          {row.seatNumber ? (
                            <span
                              className="
                                flex
                                h-6
                                w-6
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-emerald-50
                                text-emerald-700
                              "
                            >
                              <CheckIcon />
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                }
              )}
            </ul>

            <div
              className="
                bg-slate-50/50
                px-5
                py-2.5
                text-center
              "
            >
              <p
                className="
                  text-[8px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-slate-400
                "
              >
                Five Stars • Travelers
              </p>
            </div>
          </section>

          {/* =================================================
              SEAT SUMMARY
          ================================================= */}

          <section
            className="
              relative
              isolate
              min-w-0
              overflow-hidden
              bg-white
              shadow-[0_8px_28px_rgba(15,23,42,0.06)]
            "
          >
            <TicketCutouts />

            <div className="px-5 py-5">
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#0078D2]
                "
              >
                Your selection
              </p>

              <h2
                className="
                  font-american-sans
                  mt-1.5
                  text-2xl
                  font-light
                  tracking-[-0.02em]
                  text-slate-950
                "
              >
                Seat summary
              </h2>

              {/* Active passenger */}
              <div
                className="
                  mt-5
                  bg-slate-50/80
                  px-4
                  py-4
                "
              >
                <p
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  {passenger.displayName}
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-600
                  "
                >
                  {passenger.seatNumber ? (
                    <>
                      Seat{" "}
                      <span
                        className="
                          fs-nums
                          font-semibold
                          text-slate-950
                        "
                      >
                        {passenger.seatNumber}
                      </span>
                    </>
                  ) : (
                    "No seat selected"
                  )}
                </p>

                {passenger.seatNumber &&
                activeFeeLabel ? (
                  <p
                    className={cn(
                      `
                        fs-nums
                        mt-1
                        text-sm
                        font-semibold
                      `,
                      passenger.seatFeeCents &&
                        passenger.seatFeeCents > 0
                        ? "text-slate-700"
                        : "text-[#0078D2]"
                    )}
                  >
                    {activeFeeLabel}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Passenger receipt */}
            <div
              className="
                relative
                border-t
                border-dashed
                border-slate-300
                px-5
                py-5
              "
            >
              <PerforationCutouts />

              <ul className="space-y-3">
                {segment.passengers.map(
                  (row) => (
                    <li
                      key={`summary-${row.id}`}
                      className="
                        flex
                        min-w-0
                        items-start
                        justify-between
                        gap-4
                        text-sm
                      "
                    >
                      <div className="min-w-0">
                        <p
                          className="
                            truncate
                            font-medium
                            text-slate-900
                          "
                        >
                          {row.displayName}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            text-slate-500
                          "
                        >
                          {row.seatNumber
                            ? `Seat ${row.seatNumber}`
                            : "Not selected"}
                        </p>
                      </div>

                      <p
                        className="
                          fs-nums
                          shrink-0
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {row.seatNumber
                          ? seatFeeDisplay(
                              row.seatFeeCents
                            ) ?? "—"
                          : "—"}
                      </p>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Total / actions */}
            <div
              className="
                relative
                border-t
                border-dashed
                border-slate-300
                bg-slate-50/60
                px-5
                py-5
              "
            >
              <PerforationCutouts />

              <div
                className="
                  flex
                  items-end
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.15em]
                      text-slate-400
                    "
                  >
                    Seat selection total
                  </p>

                  <p
                    className="
                      fs-nums
                      mt-1
                      text-2xl
                      font-semibold
                      tracking-[-0.025em]
                      text-slate-950
                    "
                  >
                    {formatMoney(seatFeesTotal)}
                  </p>
                </div>

                <p
                  className="
                    text-right
                    text-[8px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-400
                  "
                >
                  Five Stars
                  <br />
                  Seating
                </p>
              </div>

              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-2.5
                "
              >
                <button
                  type="button"
                  onClick={goNext}
                  className="
                    group
                    inline-flex
                    min-h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-[#0078D2]
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_4px_14px_rgba(0,120,210,0.18)]
                    transition
                    hover:bg-[#006bbd]
                    hover:shadow-[0_7px_18px_rgba(0,120,210,0.22)]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/40
                    focus-visible:ring-offset-2
                  "
                >
                  <span>
                    {segmentIndex <
                    segments.length - 1
                      ? "Next flight"
                      : "Continue"}
                  </span>

                  <span
                    className="
                      transition-transform
                      duration-200
                      group-hover:translate-x-0.5
                    "
                  >
                    <ArrowRightIcon />
                  </span>
                </button>

                <Link
                  href={confirmationHref}
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
                    text-sm
                    font-semibold
                    text-slate-800
                    transition
                    hover:border-slate-400
                    hover:bg-slate-50
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                  "
                >
                  Choose seats later
                </Link>

                <Link
                  href={tripHref}
                  className="
                    inline-flex
                    min-h-10
                    w-full
                    items-center
                    justify-center
                    text-sm
                    font-semibold
                    text-[#0078D2]
                    transition
                    hover:text-[#006bbd]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                  "
                >
                  Back to trip
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}