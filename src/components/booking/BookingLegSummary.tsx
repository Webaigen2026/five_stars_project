import type { BookingLeg } from "../../lib/booking-legs";
import {
  formatArrivalDate,
  formatArrivalTime,
  formatDepartureDate,
  formatDepartureTime,
  formatDuration,
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
};

export default function BookingLegSummary({
  leg,
  compact = false,
}: BookingLegSummaryProps) {
  const flight = leg.flight;
  const label = leg.segmentType === "RETURN" ? "Return" : "Outbound";
  const arrivalNextDay = isOvernightFlight(flight);

  return (
    <div className={compact ? "" : "rounded-2xl border border-slate-200 bg-slate-50 p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {label}
          </p>
          <h3
            className={
              compact
                ? "mt-2 text-xl font-semibold text-slate-950"
                : "mt-2 text-2xl font-semibold text-slate-950"
            }
          >
            {formatRoute(flight.originCode, flight.destinationCode)}
          </h3>
          <p className="mt-1 break-words text-sm text-slate-600">
            {flight.origin} → {flight.destination}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {flight.airline}
            {flight.aircraft ? ` · ${flight.aircraft}` : ""}
          </p>
        </div>
        <div className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-primary">
          {flight.code}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="text-2xl font-semibold text-slate-950">
            {formatDepartureTime(flight)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {flight.origin} ({flight.originCode})
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatDepartureDate(flight)}
          </p>
        </div>

        <div className="min-w-0 text-left sm:min-w-28 sm:text-center">
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
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {flight.destination} ({flight.destinationCode})
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatArrivalDate(flight)}
            {arrivalNextDay ? (
              <span className="ml-2 font-medium text-amber-700">
                Arrives next day
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
