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
      strokeWidth="1.8"
    >
      <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

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

function TicketCorners() {
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
          bg-slate-100
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
          bg-slate-100
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
          bg-slate-100
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
          bg-slate-100
          sm:block
        "
      />
    </>
  );
}

function FlightSummaryTicket({
  flight,
  passengerCount,
}: {
  flight: FareModalFlight;
  passengerCount: number;
}) {
  return (
    <div
      className="
        relative
        mt-4
        overflow-hidden
        bg-slate-50/75
      "
    >
      {/* Top perforation */}
      <div
        className="
          relative
          border-b
          border-dashed
          border-slate-300
          px-4
          py-3.5
          sm:px-5
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
            bg-white
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
            bg-white
          "
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="
              inline-flex
              rounded-full
              bg-[#0078D2]/[0.07]
              px-3
              py-1.5
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.1em]
              text-[#0078D2]
            "
          >
            {flight.code}
          </span>

          <span className="text-xs font-medium text-slate-500">
            {formatDepartureDateShort(flight)}
          </span>

          <span
            aria-hidden="true"
            className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block"
          />

          <span className="text-xs text-slate-500">
            {passengerCount}{" "}
            {passengerCount === 1 ? "passenger" : "passengers"}
          </span>
        </div>
      </div>

      {/* Route */}
      <div
        className="
          grid
          gap-5
          px-4
          py-5
          sm:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_minmax(0,1fr)]
          sm:items-center
          sm:px-5
        "
      >
        {/* Departure */}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Departure
          </p>

          <p
            className="
              font-american-sans
              mt-1.5
              text-2xl
              font-light
              tracking-[-0.025em]
              text-slate-950
            "
          >
            {formatDepartureTime(flight)}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#0078D2]">
            {flight.originCode}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {flight.origin}
          </p>
        </div>

        {/* Flight path */}
        <div className="min-w-0">
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-4 bg-slate-200" />

            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {formatDuration(flight.durationMinutes)}
            </p>

            <span className="h-px w-4 bg-slate-200" />
          </div>

          <div className="mt-3 flex items-center">
            <span
              className="
                h-2
                w-2
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
                  h-7
                  w-7
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
                h-2
                w-2
                shrink-0
                rounded-full
                border-2
                border-[#0078D2]
                bg-white
              "
            />
          </div>

          <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Nonstop
          </p>
        </div>

        {/* Arrival */}
        <div className="min-w-0 sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Arrival
          </p>

          <p
            className="
              font-american-sans
              mt-1.5
              text-2xl
              font-light
              tracking-[-0.025em]
              text-slate-950
            "
          >
            {formatArrivalTime(flight)}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#0078D2]">
            {flight.destinationCode}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
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
      className="
        fixed
        inset-0
        m-0
        max-h-none
        w-full
        max-w-none
        border-0
        bg-transparent
        p-0
        open:flex
        open:items-end
        open:justify-center
        open:sm:items-center
        [&::backdrop]:bg-slate-950/45
        [&::backdrop]:backdrop-blur-[2px]
      "
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();

        if (!isNavigating) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (
          event.target === dialogRef.current &&
          !isNavigating
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          relative
          mx-auto
          flex
          max-h-[100dvh]
          w-full
          max-w-6xl
          flex-col
          overflow-hidden
          bg-white
          shadow-[0_24px_80px_rgba(15,23,42,0.22)]
          sm:max-h-[min(92dvh,56rem)]
        "
        onClick={(event) => event.stopPropagation()}
      >
        <TicketCorners />

        {/* =====================================================
            MODAL HEADER
        ===================================================== */}
        <header
          className="
            relative
            shrink-0
            border-b
            border-dashed
            border-slate-300
            px-4
            pb-5
            pt-5
            sm:px-6
            sm:pb-6
            sm:pt-6
            lg:px-8
          "
        >
          {/* Perforation cutouts */}
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-3
              -left-3
              z-20
              h-6
              w-6
              rounded-full
              bg-slate-100
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-3
              -right-3
              z-20
              h-6
              w-6
              rounded-full
              bg-slate-100
            "
          />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            disabled={isNavigating}
            className="
              absolute
              right-4
              top-4
              z-30
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              bg-white
              text-slate-500
              shadow-sm
              transition
              hover:border-slate-300
              hover:bg-slate-50
              hover:text-slate-950
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:right-6
              sm:top-6
            "
            aria-label="Close fare selection"
          >
            <CloseIcon />
          </button>

          <div className="min-w-0 pr-14">
        

            <h2
              className="
                font-american-sans
                mt-2
                text-2xl
                font-light
                tracking-[-0.025em]
                text-slate-950
                sm:text-3xl
              "
            >
              {legLabel}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Compare the available fare families and select the option that
              works best for your trip.
            </p>

            
          </div>
        </header>

        {/* =====================================================
            FARE OPTIONS
        ===================================================== */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-4
            py-5
            sm:px-6
            sm:py-6
            lg:px-8
          "
        >
          

          {flight ? (
            <FareFamilyOptionsGrid
              basePriceCents={flight.price}
              disabled={isNavigating}
              onSelect={handleSelect}
            />
          ) : null}
        </div>

        {/* =====================================================
            MODAL FOOTER
        ===================================================== */}
        <footer
          className="
            shrink-0
            border-t
            border-dashed
            border-slate-300
            bg-slate-50/60
            px-4
            py-3
            text-center
            sm:px-6
          "
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Five Stars • Fare selection
          </p>
        </footer>
      </div>
    </dialog>
  );
}