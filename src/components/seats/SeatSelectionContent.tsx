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
  initialSegments: SegmentView[];
  initialSeatFeesTotal: number;
  confirmationHref: string;
  tripHref: string;
};

export default function SeatSelectionContent({
  bookingReference,
  editable,
  initialSegments,
  initialSeatFeesTotal,
  confirmationHref,
  tripHref,
}: SeatSelectionContentProps) {
  const router = useRouter();
  const [segments, setSegments] = useState(initialSegments);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [passengerIndex, setPassengerIndex] = useState(0);
  const [seatFeesTotal, setSeatFeesTotal] = useState(initialSeatFeesTotal);
  const [error, setError] = useState<string | null>(null);
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
      `/api/bookings/${encodeURIComponent(bookingReference)}/seats`
    );
    const payload = (await response.json()) as {
      segments?: SegmentView[];
      seatFeesTotal?: number;
      error?: string;
    };
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
    if (!editable || !segment?.bookingSegmentId || !passenger || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(bookingReference)}/seats/assign`,
        {
          method: "POST",
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

      if (!response.ok) {
        setError(payload.error ?? "That seat is no longer available.");
        await refreshFromServer();
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

  if (!segment || !passenger) {
    return (
      <p className="text-sm text-slate-600">
        Seat selection is unavailable for this booking.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            {segment.segmentLabel}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Select seats · {segment.flightCode}
          </h1>
          <p className="mt-2 text-slate-600">
            {segment.originCode} → {segment.destinationCode} ·{" "}
            {segment.departureLabel}
          </p>
        </header>

        {!segment.layoutAvailable || !segment.layout ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="font-semibold text-slate-950">
              Seat selection is not available for this aircraft.
            </p>
            <p className="mt-2 text-sm text-slate-700">
              You can continue without choosing seats.
            </p>
          </div>
        ) : (
          <SeatMap rows={mapRows} onSelectSeat={(seat) => void selectSeat(seat)} busy={busy} />
        )}

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Travelers
          </p>
          <ul className="mt-4 space-y-3">
            {segment.passengers.map((row, index) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setPassengerIndex(index)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    index === passengerIndex
                      ? "border-primary bg-sky-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-950">
                    Passenger {index + 1} · {row.displayName}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {row.passengerTypeLabel}
                    {row.seatNumber
                      ? ` · Seat ${row.seatNumber}`
                      : " · Not selected"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Selecting for</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {passenger.displayName}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Seat{" "}
            <span className="font-semibold text-slate-950">
              {passenger.seatNumber ?? "Not selected"}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Seat fee{" "}
            <span className="font-semibold text-slate-950">
              {formatMoney(passenger.seatFeeCents ?? 0)}
            </span>
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Seat selection total{" "}
            <span className="font-semibold text-slate-950">
              {formatMoney(seatFeesTotal)}
            </span>
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {segmentIndex < segments.length - 1
                ? "Next flight"
                : "Continue"}
            </button>
            <Link
              href={confirmationHref}
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Choose seats later
            </Link>
            <Link
              href={tripHref}
              className="text-center text-sm font-semibold text-primary"
            >
              Back to trip
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
