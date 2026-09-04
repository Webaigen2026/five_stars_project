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
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-primary">
              {flight.code}
            </span>

            <span className="text-sm font-medium text-slate-500">
              {getCustomerAirlineName(flight.airline)}
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {formatDepartureTime(flight)}
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {flight.origin} ({flight.originCode})
              </p>
            </div>

            <div className="min-w-0 text-left sm:min-w-40 sm:text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {formatDuration(flight.durationMinutes)}
              </p>

              <div className="my-2 h-px bg-slate-300" />

              <p className="text-xs text-slate-500">Nonstop</p>
            </div>

            <div className="sm:text-right">
              <p className="text-2xl font-semibold text-slate-950">
                {formatArrivalTime(flight)}
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {flight.destination} ({flight.destinationCode})
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            {flight.availableSeats} seats remaining
          </p>
        </div>

        <div className="border-t border-slate-200 pt-6 lg:min-w-48 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-sm text-slate-500">From</p>

          <p className="mt-1 text-3xl font-semibold text-slate-950">
            ${(flight.price / 100).toFixed(2)}
          </p>

          <p className="mt-1 text-xs text-slate-500">per passenger</p>

          <button
            type="button"
            onClick={onSelect}
            className="mt-5 inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {selectLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
