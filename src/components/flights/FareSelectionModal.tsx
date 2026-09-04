"use client";

import { useEffect, useId, useRef, useState } from "react";

import FareFamilyOptionsGrid from "./FareFamilyOptionsGrid";
import type { FareFamily } from "../../lib/fare-families";
import {
  formatArrivalTime,
  formatDepartureDateShort,
  formatDepartureTime,
  formatRoute,
} from "../../lib/trip-formatting";

export type FareModalFlight = {
  id: number;
  code: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
};

type FareSelectionModalProps = {
  isOpen: boolean;
  flight: FareModalFlight | null;
  passengerCount: number;
  legLabel?: string;
  onClose: () => void;
  onSelectFare: (family: FareFamily) => void;
};

export default function FareSelectionModal({
  isOpen,
  flight,
  passengerCount,
  legLabel = "Choose your fare",
  onClose,
  onSelectFare,
}: FareSelectionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && flight) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setIsNavigating(false);
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, flight]);

  useEffect(() => {
    if (!isOpen) {
      setIsNavigating(false);
    }
  }, [isOpen]);

  function handleSelect(family: FareFamily) {
    if (isNavigating) {
      return;
    }
    setIsNavigating(true);
    onSelectFare(family);
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 max-h-none w-full max-w-none border-0 bg-transparent p-0 open:flex open:items-end open:justify-center open:sm:items-center [&::backdrop]:bg-slate-950/50"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        if (!isNavigating) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isNavigating) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[min(92dvh,56rem)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p
              id={titleId}
              className="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
            >
              Choose your fare
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">
              {legLabel}
            </p>
            {flight ? (
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">
                  {flight.code} ·{" "}
                  {formatRoute(flight.originCode, flight.destinationCode)}
                </p>
                <p>
                  {flight.origin} ({flight.originCode}) → {flight.destination} (
                  {flight.destinationCode})
                </p>
                <p>
                  {formatDepartureDateShort(flight)} ·{" "}
                  {formatDepartureTime(flight)} → {formatArrivalTime(flight)}
                </p>
                <p>
                  {passengerCount}{" "}
                  {passengerCount === 1 ? "passenger" : "passengers"}
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isNavigating}
            className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
            aria-label="Close fare selection"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          {flight ? (
            <FareFamilyOptionsGrid
              basePriceCents={flight.price}
              disabled={isNavigating}
              onSelect={handleSelect}
            />
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
