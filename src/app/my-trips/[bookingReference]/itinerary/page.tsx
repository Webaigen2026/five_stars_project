import Link from "next/link";
import { notFound } from "next/navigation";

import BookingStatusBadge from "../../../../components/booking/BookingStatusBadge";
import PrintItineraryButton from "../../../../components/booking/PrintItineraryButton";
import Footer from "../../../../components/layout/Footer";
import Header from "../../../../components/layout/Header";
import { requireUser } from "../../../../lib/authorization";
import { getBookingStatusPresentation } from "../../../../lib/booking-status";
import { db } from "../../../../prisma/db";

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export default async function ItineraryPage({
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
      "aircraft",
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
  const viewedAt = formatDateTime(new Date().toISOString());
  const tripHref = `/my-trips/${encodeURIComponent(booking.bookingReference)}`;
  const sortedPassengers = [...passengers].sort((left, right) => {
    const last = left.lastName.localeCompare(right.lastName);
    return last !== 0 ? last : left.firstName.localeCompare(right.firstName);
  });

  return (
    <>
      <div className="print-hide">
        <Header />
      </div>

      <main className="min-h-screen bg-slate-50 print:min-h-0 print:bg-white">
        <section className="print-itinerary mx-auto max-w-4xl px-6 py-12">
          <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <Link
                href={tripHref}
                className="text-sm font-semibold text-primary transition hover:text-primary-hover"
              >
                ← Back to trip
              </Link>
              <Link
                href="/my-trips"
                className="text-sm font-semibold text-primary transition hover:text-primary-hover"
              >
                Back to My Trips
              </Link>
            </div>
            <PrintItineraryButton />
          </div>

          <article className="print-itinerary-card rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-slate-300 print:p-0">
            <header className="border-b border-slate-200 pb-6">
              <p className="text-2xl font-bold tracking-tight text-slate-950">
                StarJet
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Flight Itinerary
              </h1>
              <p className="mt-2 text-slate-600">
                Booking confirmation and travel summary
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <BookingStatusBadge status={booking.status} />
                <p className="text-sm text-slate-600">
                  {status.confirmationSummary}
                </p>
              </div>
            </header>

            <section className="print-itinerary-card mt-6 border-b border-slate-200 pb-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Confirmation
              </h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Booking reference</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {booking.bookingReference}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Booking created</dt>
                  <dd className="mt-1 text-slate-950">
                    {formatDateTime(booking.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Viewed</dt>
                  <dd className="mt-1 text-slate-950">{viewedAt}</dd>
                </div>
              </dl>
            </section>

            {!flight ? (
              <section className="print-itinerary-card mt-6 border-b border-slate-200 pb-6">
                <h2 className="text-lg font-semibold text-slate-950">
                  Flight details unavailable
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  We could not load the flight for booking{" "}
                  <span className="font-semibold text-slate-950">
                    {booking.bookingReference}
                  </span>
                  .
                </p>
              </section>
            ) : (
              <section className="print-itinerary-card mt-6 border-b border-slate-200 pb-6">
                <h2 className="text-lg font-semibold text-slate-950">
                  Flight details
                </h2>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {flight.origin} → {flight.destination}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {flight.airline} · {flight.code}
                  {flight.aircraft ? ` · ${flight.aircraft}` : ""}
                </p>

                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Departure</dt>
                    <dd className="mt-1 font-medium text-slate-950">
                      {formatDate(flight.departureTime)} ·{" "}
                      {formatTime(flight.departureTime)}
                    </dd>
                    <dd className="mt-1 text-slate-700">
                      {flight.origin} ({flight.originCode})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Arrival</dt>
                    <dd className="mt-1 font-medium text-slate-950">
                      {formatDate(flight.arrivalTime)} ·{" "}
                      {formatTime(flight.arrivalTime)}
                    </dd>
                    <dd className="mt-1 text-slate-700">
                      {flight.destination} ({flight.destinationCode})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Duration</dt>
                    <dd className="mt-1 text-slate-950">
                      {formatDuration(flight.durationMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Passengers</dt>
                    <dd className="mt-1 text-slate-950">
                      {booking.passengerCount}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="print-itinerary-card mt-6 border-b border-slate-200 pb-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Travelers
              </h2>
              {sortedPassengers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  No passenger names are available for this booking.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {sortedPassengers.map((passenger) => (
                    <li
                      key={passenger.id}
                      className="rounded-xl border border-slate-200 px-4 py-3"
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

            <section className="print-itinerary-card mt-6 border-b border-slate-200 pb-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Price summary
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
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

            <section className="print-itinerary-card mt-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Important travel information
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>Arrive early so you have time for check-in and security.</li>
                <li>Bring valid travel documents for every passenger.</li>
                <li>
                  Verify entry, visa, and health requirements before departure.
                </li>
              </ul>
            </section>
          </article>
        </section>
      </main>

      <div className="print-hide">
        <Footer />
      </div>
    </>
  );
}
