import { getCustomerAirlineName } from "../../lib/brand";

import {
  getFareFamilyLabel,
  parseFareFamily,
  resolveSegmentFarePriceCents,
} from "../../lib/fare-families";

import type { BookingLeg } from "../../lib/booking-legs";

import {
  formatArrivalDate,
  formatArrivalTime,
  formatDepartureDate,
  formatDepartureTime,
  formatDuration,
  formatMoney,
  formatRoute,
  isOvernightFlight,
} from "../../lib/trip-formatting";

type BookingLegSummaryProps = {
  leg: BookingLeg & {
    flight: {
      id: number;
      code: string;
      airline: string;
      aircraft: string | null;
      origin: string;
      originCode: string;
      destination: string;
      destinationCode: string;
      departureTime: string;
      arrivalTime: string;
      durationMinutes: number;
      price: number;
      availableSeats: number;
      status: string;
    };
  };

  compact?: boolean;
  showFare?: boolean;
  /** Checkout boarding-pass layout; default preserves trip/confirmation presentation. */
  variant?: "default" | "boardingPass";
};

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
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
        className="pointer-events-none absolute -left-3 -top-3 z-20 h-6 w-6 rounded-full bg-white"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 z-20 h-6 w-6 rounded-full bg-white"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -left-3 z-20 h-6 w-6 rounded-full bg-white"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -right-3 z-20 h-6 w-6 rounded-full bg-white"
      />
    </>
  );
}

function RouteConnector({ durationLabel }: { durationLabel: string }) {
  return (
    <div className="min-w-0 py-1 text-center">
      <p className="fs-nums text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {durationLabel}
      </p>

      <div className="mt-2 flex items-center">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D2]"
        />
        <div className="relative mx-1.5 h-px min-w-0 flex-1 border-t border-dashed border-[#0078D2]/50">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5 text-[#0078D2]"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D2]"
        />
      </div>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Nonstop
      </p>
    </div>
  );
}

function BoardingPassLegSummary({
  leg,
  showFare,
}: {
  leg: BookingLegSummaryProps["leg"];
  showFare: boolean;
}) {
  const flight = leg.flight;
  const label = leg.segmentType === "RETURN" ? "Return" : "Outbound";
  const arrivalNextDay = isOvernightFlight(flight);
  const fareFamily = parseFareFamily(leg.fareFamily) ?? "BASIC";
  const farePriceCents = resolveSegmentFarePriceCents({
    farePriceCents: leg.farePriceCents,
    flightPriceCents: flight.price,
  });

  return (
    <article className="min-w-0 border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-300 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
            {label}
          </p>
          <p className="font-american-sans mt-1.5 text-lg font-light tracking-[-0.02em] text-slate-950 sm:text-xl">
            {formatRoute(flight.originCode, flight.destinationCode)}
          </p>
          <p className="mt-1 break-words text-sm text-slate-600">
            {flight.origin}
            <span className="mx-1.5 text-slate-300">→</span>
            {flight.destination}
          </p>
        </div>

        <p className="fs-nums shrink-0 text-sm font-semibold tracking-[0.04em] text-[#0078D2]">
          {flight.code}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-center gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(5.5rem,7.5rem)_minmax(0,1fr)] sm:gap-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-american-sans fs-nums text-[2.25rem] leading-none font-light tracking-[-0.04em] text-slate-950 sm:text-4xl">
            {flight.originCode}
          </p>
          <p className="mt-1.5 truncate text-sm text-slate-600">{flight.origin}</p>
          <p className="fs-nums mt-3 text-lg font-semibold text-slate-950">
            {formatDepartureTime(flight)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDepartureDate(flight)}
          </p>
        </div>

        <RouteConnector
          durationLabel={formatDuration(flight.durationMinutes)}
        />

        <div className="min-w-0 sm:text-right">
          <p className="font-american-sans fs-nums text-[2.25rem] leading-none font-light tracking-[-0.04em] text-slate-950 sm:text-4xl">
            {flight.destinationCode}
          </p>
          <p className="mt-1.5 truncate text-sm text-slate-600">
            {flight.destination}
          </p>
          <p className="fs-nums mt-3 text-lg font-semibold text-slate-950">
            {formatArrivalTime(flight)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatArrivalDate(flight)}
            {arrivalNextDay ? (
              <span className="ml-2 inline-flex border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                +1 day
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-300 px-4 py-2.5 text-xs sm:px-5">
        <p className="min-w-0 text-slate-600">
          <span className="font-medium text-slate-700">
            {getCustomerAirlineName(flight.airline)}
          </span>
          {flight.aircraft ? (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              <span>{flight.aircraft}</span>
            </>
          ) : null}
        </p>

        {showFare ? (
          <p className="fs-nums text-slate-950">
            <span className="font-medium text-slate-700">
              {getFareFamilyLabel(fareFamily)}
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold">{formatMoney(farePriceCents)}</span>
            <span className="ml-1 text-slate-500">per passenger</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function BookingLegSummary({
  leg,
  compact = false,
  showFare = true,
  variant = "default",
}: BookingLegSummaryProps) {
  if (variant === "boardingPass") {
    return <BoardingPassLegSummary leg={leg} showFare={showFare} />;
  }

  const flight = leg.flight;

  const label = leg.segmentType === "RETURN" ? "Return" : "Outbound";

  const arrivalNextDay = isOvernightFlight(flight);

  const fareFamily = parseFareFamily(leg.fareFamily) ?? "BASIC";

  const farePriceCents = resolveSegmentFarePriceCents({
    farePriceCents: leg.farePriceCents,
    flightPriceCents: flight.price,
  });

  return (
    <article
      className={
        compact
          ? "min-w-0"
          : `
              relative
              isolate
              min-w-0
              overflow-hidden
              bg-slate-50/70
            `
      }
    >
      {!compact ? <TicketCutouts /> : null}

      <div
        className={
          compact
            ? ""
            : `
                relative
                border-b
                border-dashed
                border-slate-300
                px-4
                py-4
                sm:px-5
              `
        }
      >
        {!compact ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-white"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-white"
            />
          </>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              {label}
            </p>

            <h3
              className={
                compact
                  ? `
                      font-american-sans
                      mt-2
                      text-xl
                      font-light
                      tracking-[-0.02em]
                      text-slate-950
                    `
                  : `
                      font-american-sans
                      mt-2
                      text-2xl
                      font-light
                      tracking-[-0.025em]
                      text-slate-950
                      sm:text-3xl
                    `
              }
            >
              {formatRoute(flight.originCode, flight.destinationCode)}
            </h3>

            <p className="mt-1.5 break-words text-sm leading-6 text-slate-600">
              {flight.origin}
              <span className="mx-2 text-slate-300">→</span>
              {flight.destination}
            </p>

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <span>{getCustomerAirlineName(flight.airline)}</span>

              {flight.aircraft ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-slate-300"
                  />
                  <span className="min-w-0 truncate">{flight.aircraft}</span>
                </>
              ) : null}
            </div>
          </div>

          <span className="fs-nums inline-flex shrink-0 items-center rounded-full bg-[rgba(0,120,210,0.07)] px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-[#0078D2]">
            {flight.code}
          </span>
        </div>

        {showFare ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Fare
            </span>
            <span className="font-medium text-slate-700">
              {getFareFamilyLabel(fareFamily)}
            </span>
            <span
              aria-hidden="true"
              className="h-1 w-1 rounded-full bg-slate-300"
            />
            <span className="fs-nums font-semibold text-slate-950">
              {formatMoney(farePriceCents)}
            </span>
            <span className="text-xs text-slate-500">per passenger</span>
          </div>
        ) : null}
      </div>

      <div className={compact ? "mt-5" : "px-4 py-5 sm:px-5 sm:py-6"}>
        <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(150px,210px)_minmax(0,1fr)] sm:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Departure
            </p>
            <p className="font-american-sans fs-nums mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
              {formatDepartureTime(flight)}
            </p>
            <div className="mt-2">
              <p className="font-medium text-slate-900">
                <span className="fs-nums font-semibold text-[#0078D2]">
                  {flight.originCode}
                </span>
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {flight.origin}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDepartureDate(flight)}
              </p>
            </div>
          </div>

          <div className="min-w-0 py-1">
            <div className="flex items-center justify-center gap-2">
              <span className="h-px w-4 bg-slate-200" />
              <p className="fs-nums text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {formatDuration(flight.durationMinutes)}
              </p>
              <span className="h-px w-4 bg-slate-200" />
            </div>

            <div className="mt-3 flex items-center">
              <span className="h-2 w-2 shrink-0 rounded-full border-2 border-[#0078D2] bg-white" />
              <div className="relative min-w-0 flex-1 px-1">
                <div className="border-t border-dashed border-slate-300" />
                <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0078D2] shadow-[0_3px_10px_rgba(15,23,42,0.08)]">
                  <ArrowRightIcon />
                </span>
              </div>
              <span className="h-2 w-2 shrink-0 rounded-full border-2 border-[#0078D2] bg-white" />
            </div>

            <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Nonstop
            </p>
          </div>

          <div className="min-w-0 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Arrival
            </p>
            <p className="font-american-sans fs-nums mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
              {formatArrivalTime(flight)}
            </p>
            <div className="mt-2">
              <p className="font-medium text-slate-900">
                <span className="fs-nums font-semibold text-[#0078D2]">
                  {flight.destinationCode}
                </span>
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {flight.destination}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatArrivalDate(flight)}
                {arrivalNextDay ? (
                  <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    +1 day
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="border-t border-dashed border-slate-300 bg-white/60 px-4 py-2.5 text-center sm:px-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Five Stars • {label} flight
          </p>
        </div>
      ) : null}
    </article>
  );
}
