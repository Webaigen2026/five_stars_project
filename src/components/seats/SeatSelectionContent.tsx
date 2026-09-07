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

function cn(...classes: Array<string | false | null | undefined>) {
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
  const [seatFeesTotal, setSeatFeesTotal] = useState(initialSeatFeesTotal);
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
            (row) => row.id === passenger.id && row.seatNumber === seat
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
      `/api/bookings/${encodeURIComponent(bookingReference)}/seats`,
      { credentials: "same-origin" }
    );
    const payload = (await response.json()) as {
      segments?: SegmentView[];
      seatFeesTotal?: number;
      error?: string;
    };
    if (response.status === 401 || response.status === 403) {
      setAccessDenied(true);
      setError(
        isGuestBooking
          ? "Your booking access has expired. Verify your trip to continue."
          : "You do not have access to manage seats for this booking."
      );
      throw new Error("access_denied");
    }
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to refresh seats.");
    }
    if (payload.segments) {
      setSegments(payload.segments);
    }
    if (typeof payload.seatFeesTotal === "number") {
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
        `/api/bookings/${encodeURIComponent(bookingReference)}/seats/assign`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingSegmentId: segment.bookingSegmentId,
            passengerId: passenger.id,
            seatNumber,
          }),
        }
      );
      const payload = (await response.json()) as {
        error?: string;
        seatFeesTotal?: number;
      };

      if (response.status === 401 || response.status === 403) {
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
        setError(payload.error ?? "That seat is no longer available.");
        try {
          await refreshFromServer();
        } catch {
          // refresh may also surface access denial
        }
        return;
      }

      await refreshFromServer();
      if (typeof payload.seatFeesTotal === "number") {
        setSeatFeesTotal(payload.seatFeesTotal);
      }

      if (passengerIndex < segment.passengers.length - 1) {
        setPassengerIndex((value) => value + 1);
      }
    } catch {
      setError("Unable to assign that seat.");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (segmentIndex < segments.length - 1) {
      setSegmentIndex((value) => value + 1);
      setPassengerIndex(0);
      return;
    }
    router.push(confirmationHref);
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
          Access
        </p>
        <h1 className="font-american-sans mt-2 text-3xl font-light tracking-[-0.02em] text-slate-950">
          Booking access required
        </h1>
        <p className="mt-3 text-slate-700" role="alert">
          {error ??
            (isGuestBooking
              ? "Your booking access has expired. Verify your trip to continue."
              : "You do not have access to manage seats for this booking.")}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isGuestBooking ? (
            <Link
              href={findTripHref}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0078D2] px-5 text-sm font-semibold text-white transition hover:bg-[#006BBD]"
            >
              Find My Trip
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0078D2] px-5 text-sm font-semibold text-white transition hover:bg-[#006BBD]"
            >
              Sign in
            </Link>
          )}
          <Link
            href={tripHref}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Back to trip
          </Link>
        </div>
      </div>
    );
  }

  if (!segment || !passenger) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6">
        <p className="text-sm font-medium text-slate-700">
          Seat selection is unavailable for this booking.
        </p>
      </div>
    );
  }

  const activeFeeLabel = seatFeeDisplay(passenger.seatFeeCents);
  const locked = !editable;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
          Seat selection
        </p>
        <h1 className="font-american-sans mt-2 text-3xl font-light tracking-[-0.02em] text-slate-950 sm:text-4xl">
          Select your seats
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
          Choose a seat for each traveler before continuing.
        </p>
        {locked ? (
          <p
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            role="status"
          >
            Seat selection is locked for this booking. You can still review
            assigned seats below.
          </p>
        ) : null}
      </header>

      {segments.length > 1 ? (
        <nav aria-label="Flight segments" className="flex flex-wrap gap-2">
          {segments.map((row, index) => {
            const complete = row.passengers.every((p) => p.seatNumber);
            const active = index === segmentIndex;

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
                  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/35",
                  active
                    ? "border-[#0078D2] bg-[#EAF5FC] text-[#0078D2]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="fs-nums text-xs text-slate-400">
                  {index + 1}
                </span>
                <span>{row.segmentLabel}</span>
                {complete ? (
                  <span className="text-xs font-semibold text-emerald-600">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
          {segment.segmentLabel}
        </p>
        <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.015em] text-slate-950 sm:text-3xl">
          {segment.originCode} → {segment.destinationCode}
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Five Stars · {segment.flightCode}
          {segment.aircraft ? ` · ${segment.aircraft}` : ""}
        </p>
        <p className="mt-1 text-sm text-slate-500">{segment.departureLabel}</p>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="min-w-0 space-y-5">
          {!segment.layoutAvailable || !segment.layout ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="font-semibold text-slate-950">
                Seat selection is not available for this aircraft.
              </p>
              <p className="mt-2 text-sm text-slate-700">
                You can continue without choosing seats.
              </p>
            </div>
          ) : (
            <SeatMap
              rows={mapRows}
              onSelectSeat={(seat) => void selectSeat(seat)}
              busy={busy || locked}
              exitRows={segment.layout.exitRows}
            />
          )}

          {error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
              Travelers
            </p>
            <ul className="mt-3 space-y-2.5">
              {segment.passengers.map((row, index) => {
                const active = index === passengerIndex;
                const feeLabel = seatFeeDisplay(row.seatFeeCents);

                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setPassengerIndex(index)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/35",
                        active
                          ? "border-[#0078D2] bg-[#EAF5FC]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Passenger {index + 1}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {row.displayName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {row.passengerTypeLabel}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {row.seatNumber ? (
                          <>
                            Seat{" "}
                            <span className="font-semibold text-slate-950">
                              {row.seatNumber}
                            </span>
                            {feeLabel ? (
                              <span className="text-slate-500">
                                {" "}
                                · {feeLabel}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-slate-500">Not selected</span>
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
              Your selection
            </p>

            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {passenger.displayName}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {passenger.seatNumber ? (
                  <>
                    Seat{" "}
                    <span className="font-semibold text-slate-950">
                      {passenger.seatNumber}
                    </span>
                  </>
                ) : (
                  "No seat selected"
                )}
              </p>
              {passenger.seatNumber && activeFeeLabel ? (
                <p
                  className={cn(
                    "mt-1 text-sm font-semibold",
                    passenger.seatFeeCents && passenger.seatFeeCents > 0
                      ? "text-amber-700"
                      : "text-[#0078D2]"
                  )}
                >
                  {activeFeeLabel}
                </p>
              ) : null}
            </div>

            <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
              {segment.passengers.map((row) => (
                <li
                  key={`summary-${row.id}`}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {row.displayName}
                    </p>
                    <p className="text-slate-500">
                      {row.seatNumber
                        ? `Seat ${row.seatNumber}`
                        : "Not selected"}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-800">
                    {row.seatNumber
                      ? seatFeeDisplay(row.seatFeeCents) ?? "—"
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-600">
                Seat selection total
              </p>
              <p className="text-base font-semibold text-slate-950">
                {formatMoney(seatFeesTotal)}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0078D2] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(0,120,210,0.22)] transition hover:bg-[#006BBD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/40 focus-visible:ring-offset-2"
              >
                {segmentIndex < segments.length - 1
                  ? "Next flight"
                  : "Continue"}
              </button>
              <Link
                href={confirmationHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Choose seats later
              </Link>
              <Link
                href={tripHref}
                className="inline-flex min-h-10 w-full items-center justify-center text-sm font-semibold text-[#0078D2] transition hover:text-[#006BBD]"
              >
                Back to trip
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
