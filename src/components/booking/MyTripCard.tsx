import Link from "next/link";

import BookingStatusBadge from "./BookingStatusBadge";
import type { MyTripCardViewModel } from "../../lib/my-trips";

export default function MyTripCard({ trip }: { trip: MyTripCardViewModel }) {
  return (
    <article
      className={`rounded-3xl border bg-white p-6 shadow-sm ${
        trip.isActionNeeded
          ? "border-amber-200 ring-1 ring-amber-100"
          : "border-slate-200"
      }`}
      aria-labelledby={`trip-${trip.bookingId}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <BookingStatusBadge status={trip.status} />
            {trip.isActionNeeded ? (
              <p className="text-sm font-medium text-amber-800">
                Payment not completed
              </p>
            ) : null}
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {trip.tripTypeLabel}
          </p>

          <h3
            id={`trip-${trip.bookingId}-heading`}
            className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          >
            {trip.routeHeading}
          </h3>

          {trip.routeDetail ? (
            <p className="text-sm text-slate-500">{trip.routeDetail}</p>
          ) : null}

          <p className="text-sm font-medium text-slate-700">{trip.datesLabel}</p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Total
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {trip.totalLabel}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Booking reference</dt>
          <dd className="mt-1 break-all font-semibold text-slate-950">
            {trip.bookingReference}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Travelers</dt>
          <dd className="mt-1 font-medium text-slate-950">{trip.travelerLabel}</dd>
        </div>
      </dl>

      {trip.isActionNeeded ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-900">{trip.statusLabel}</span>
          {" — "}
          {trip.statusDescription}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={trip.tripHref}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          View trip
        </Link>
        <Link
          href={trip.itineraryHref}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          View itinerary
        </Link>
      </div>
    </article>
  );
}
