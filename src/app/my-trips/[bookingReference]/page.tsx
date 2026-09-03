import Link from "next/link";
import { notFound } from "next/navigation";

import BookingStatusBadge from "../../../components/booking/BookingStatusBadge";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { requireUser } from "../../../lib/authorization";
import { getBookingStatusPresentation } from "../../../lib/booking-status";
import { db } from "../../../prisma/db";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ bookingReference: string }>;
}) {
  const currentUser = await requireUser();
  const { bookingReference: rawReference } = await params;
  const bookingReference = decodeURIComponent(rawReference).trim();

  if (!bookingReference) {
    notFound();
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking || booking.userId !== currentUser.id) {
    notFound();
  }

  const [flight, passengers] = await Promise.all([
    db.orm.public.Flight.select(
      "id",
      "code",
      "airline",
      "origin",
      "originCode",
      "destination",
      "destinationCode",
      "departureTime",
      "arrivalTime",
      "durationMinutes"
    )
      .where({ id: booking.flightId })
      .first(),
    db.orm.public.Passenger.select("id", "firstName", "lastName", "nationality")
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const status = getBookingStatusPresentation(booking.status);
  const sortedPassengers = [...passengers].sort((left, right) => {
    const last = left.lastName.localeCompare(right.lastName);
    return last !== 0 ? last : left.firstName.localeCompare(right.firstName);
  });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              My Trips
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {booking.bookingReference}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <BookingStatusBadge status={booking.status} />
              <p className="text-slate-600">{status.description}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <p className="mb-6">
            <Link
              href="/my-trips"
              className="text-sm font-semibold text-primary transition hover:text-primary-hover"
            >
              ← Back to My Trips
            </Link>
          </p>

          {!flight ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                {booking.bookingReference}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Trip details unavailable
              </h2>
              <p className="mt-3 text-slate-600">
                We could not load the flight for this booking.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/my-trips/${encodeURIComponent(booking.bookingReference)}/itinerary`}
                  className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
                >
                  View itinerary
                </Link>
                <Link
                  href="/my-trips"
                  className="inline-flex rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to My Trips
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                        Itinerary
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                        {flight.origin} → {flight.destination}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {flight.airline} · {flight.code}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div>
                      <p className="text-sm text-slate-500">
                        {formatDate(flight.departureTime)}
                      </p>
                      <p className="mt-1 text-3xl font-semibold text-slate-950">
                        {formatTime(flight.departureTime)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {flight.origin} ({flight.originCode})
                      </p>
                    </div>

                    <div className="hidden min-w-40 text-center sm:block">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        {formatDuration(flight.durationMinutes)}
                      </p>
                      <div className="my-2 h-px bg-slate-300" />
                      <p className="text-xs text-slate-500">Nonstop</p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-sm text-slate-500">
                        {formatDate(flight.arrivalTime)}
                      </p>
                      <p className="mt-1 text-3xl font-semibold text-slate-950">
                        {formatTime(flight.arrivalTime)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {flight.destination} ({flight.destinationCode})
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">
                      {flight.origin} ({flight.originCode})
                    </p>
                    <p className="mt-1">{formatTime(flight.departureTime)}</p>
                    <p className="my-3 text-slate-400">↓</p>
                    <p>{formatDuration(flight.durationMinutes)}</p>
                    <p className="my-3 text-slate-400">↓</p>
                    <p className="font-semibold text-slate-950">
                      {flight.destination} ({flight.destinationCode})
                    </p>
                    <p className="mt-1">{formatTime(flight.arrivalTime)}</p>
                  </div>

                  <p className="mt-6 text-sm text-slate-600">
                    Passengers{" "}
                    <span className="font-semibold text-slate-950">
                      {booking.passengerCount}
                    </span>
                  </p>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-950">
                    Travelers
                  </h2>
                  {sortedPassengers.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">
                      No passenger names are available for this booking.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {sortedPassengers.map((passenger) => (
                        <li
                          key={passenger.id}
                          className="rounded-2xl border border-slate-200 px-4 py-3"
                        >
                          <p className="font-medium text-slate-950">
                            {passenger.firstName} {passenger.lastName}
                          </p>
                          {passenger.nationality ? (
                            <p className="mt-1 text-sm text-slate-600">
                              {passenger.nationality}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Status
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {status.label}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {status.description}
                  </p>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Price summary
                  </p>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Subtotal</dt>
                      <dd className="font-medium text-slate-950">
                        {formatMoney(booking.subtotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Taxes & fees</dt>
                      <dd className="font-medium text-slate-950">
                        {formatMoney(booking.taxesAndFees)}
                      </dd>
                    </div>
                    <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-3">
                      <dt className="font-semibold text-slate-950">Total</dt>
                      <dd className="text-2xl font-semibold text-slate-950">
                        {formatMoney(booking.total)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-right text-xs text-slate-500">USD</p>
                </section>

                <div className="flex flex-col gap-3">
                  <Link
                    href={`/my-trips/${encodeURIComponent(booking.bookingReference)}/itinerary`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View itinerary
                  </Link>
                  {status.paymentAvailable && (
                    <Link
                      href={`/checkout?booking=${encodeURIComponent(booking.bookingReference)}`}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      Continue to checkout
                    </Link>
                  )}
                  <Link
                    href="/flights"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Book another flight
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
