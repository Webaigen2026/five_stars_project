"use client";

import { useEffect, useId, useRef, useState } from "react";

import FareFamilyOptionsGrid from "./FareFamilyOptionsGrid";
import type { FareFamily } from "../../lib/fare-families";
import {
  formatArrivalTime,
  formatDepartureDateShort,
  formatDepartureTime,
  formatDuration,
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
  durationMinutes: number;
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

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function FlightSummaryStrip({
  flight,
  passengerCount,
}: {
  flight: FareModalFlight;
  passengerCount: number;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {flight.code}
        </span>
        <span className="text-xs font-medium text-slate-500">
          {formatDepartureDateShort(flight)}
        </span>
        <span className="text-xs text-slate-500">
          {passengerCount}{" "}
          {passengerCount === 1 ? "passenger" : "passengers"}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-950 sm:text-xl">
            {formatDepartureTime(flight)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {flight.originCode}
          </p>
          <p className="truncate text-xs text-slate-500">{flight.origin}</p>
        </div>

        <div className="min-w-0 text-left sm:min-w-28 sm:px-2 sm:text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {formatDuration(flight.durationMinutes)} · Nonstop
          </p>
          <div className="my-1.5 h-px bg-slate-300" />
          <p className="text-[10px] text-slate-400" aria-hidden="true">
            →
          </p>
        </div>

        <div className="min-w-0 sm:text-right">
          <p className="text-lg font-semibold text-slate-950 sm:text-xl">
            {formatArrivalTime(flight)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {flight.destinationCode}
          </p>
          <p className="truncate text-xs text-slate-500">
            {flight.destination}
          </p>
        </div>
      </div>
    </div>
  );
}

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
      className="fixed inset-0 m-0 max-h-none w-full max-w-none border-0 bg-transparent p-0 open:flex open:items-end open:justify-center open:sm:items-center [&::backdrop]:bg-slate-950/40"
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
        className="mx-auto flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:max-h-[min(90dvh,52rem)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-slate-200 px-5 pb-4 pt-4 sm:px-7 sm:pb-5 sm:pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isNavigating}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 sm:right-4 sm:top-4"
            aria-label="Close fare selection"
          >
            <CloseIcon />
          </button>

          <div className="min-w-0 pr-12">
            <p
              id={titleId}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-primary sm:text-sm"
            >
              Choose your fare
            </p>
            <p className="mt-1.5 text-base font-semibold text-slate-950 sm:text-lg">
              {legLabel}
            </p>
            {flight ? (
              <FlightSummaryStrip
                flight={flight}
                passengerCount={passengerCount}
              />
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
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
