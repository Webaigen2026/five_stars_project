import Link from "next/link";
import { notFound } from "next/navigation";

import BookingLegSummary from "../../../components/booking/BookingLegSummary";
import BookingProgress from "../../../components/booking/BookingProgress";
import BookingStatusBadge from "../../../components/booking/BookingStatusBadge";
import CopyBookingReferenceButton from "../../../components/booking/CopyBookingReferenceButton";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { requireUser } from "../../../lib/authorization";
import {
  isRoundTripLegs,
  loadBookingLegsWithFlights,
} from "../../../lib/booking-segments";
import { getBookingStatusPresentation } from "../../../lib/booking-status";
import {
  formatDepartureDateShort,
  formatMoney,
  formatRoute,
} from "../../../lib/trip-formatting";
import { db } from "../../../prisma/db";

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

  const [legs, passengers] = await Promise.all([
    loadBookingLegsWithFlights(booking),
    db.orm.public.Passenger.select("id", "firstName", "lastName", "nationality")
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const status = getBookingStatusPresentation(booking.status);
  const sortedPassengers = [...passengers].sort((left, right) => left.id - right.id);
  const tripHref = `/my-trips/${encodeURIComponent(booking.bookingReference)}`;
  const itineraryHref = `${tripHref}/itinerary`;
  const checkoutHref = `/checkout?booking=${encodeURIComponent(booking.bookingReference)}`;
  const outbound = legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0];
  const returnLeg = legs.find((leg) => leg.segmentType === "RETURN");
  const isRoundTrip = isRoundTripLegs(legs);
  const heroFlight = outbound?.flight;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              My Trips
            </p>

            {heroFlight ? (
              <>
                {isRoundTrip ? (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    Round trip
                  </p>
                ) : null}
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                      {heroFlight.originCode}
                    </p>
                    <p className="mt-2 break-words text-base text-slate-600">
                      {heroFlight.origin}
                    </p>
                  </div>
                  <div className="hidden pb-2 text-center sm:block">
                    <p className="text-2xl font-semibold text-slate-300">
                      {isRoundTrip ? "⇄" : "→"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatRoute(
                        heroFlight.originCode,
                        heroFlight.destinationCode
                      )}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                      {heroFlight.destinationCode}
                    </p>
                    <p className="mt-2 break-words text-base text-slate-600">
                      {heroFlight.destination}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <p>
                    Outbound {formatDepartureDateShort(heroFlight)}
                    {returnLeg
                      ? ` · Return ${formatDepartureDateShort(returnLeg.flight)}`
                      : ""}
                  </p>
                  <span aria-hidden="true">·</span>
                  <p className="font-semibold text-slate-950">
                    {heroFlight.code}
                    {returnLeg ? ` / ${returnLeg.flight.code}` : ""}
                  </p>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </>
            ) : (
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Trip details
              </h1>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Booking reference
                </p>
                <p className="mt-1 break-all text-xl font-semibold text-slate-950">
                  {booking.bookingReference}
                </p>
              </div>
              <CopyBookingReferenceButton
                bookingReference={booking.bookingReference}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <p className="mb-6">
            <Link
              href="/my-trips"
              className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ← Back to My Trips
            </Link>
          </p>

          {legs.length === 0 ? (
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
                  href={itineraryHref}
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
                        {isRoundTrip ? "Round-trip flights" : "Flight"}
                      </h2>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <div className="mt-6 space-y-5">
                    {legs.map((leg) => (
                      <BookingLegSummary
                        key={`${leg.segmentType}-${leg.flightId}`}
                        leg={leg}
                      />
                    ))}
                  </div>
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
                    <ol className="mt-5 space-y-3">
                      {sortedPassengers.map((passenger, index) => (
                        <li
                          key={passenger.id}
                          className="rounded-2xl border border-slate-200 px-4 py-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                            Passenger {index + 1}
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {`${passenger.firstName} ${passenger.lastName}`}
                          </p>
                          {passenger.nationality ? (
                            <p className="mt-1 text-sm text-slate-600">
                              {passenger.nationality}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-950">
                    Booking status
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">{status.description}</p>
                  <div className="mt-6">
                    <BookingProgress status={booking.status} />
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Price summary
                  </p>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Subtotal</dt>
                      <dd className="font-medium text-slate-950">
                        {formatMoney(booking.subtotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Taxes & fees</dt>
                      <dd className="font-medium text-slate-950">
                        {formatMoney(booking.taxesAndFees)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                      <dt className="font-semibold text-slate-950">Total</dt>
                      <dd className="text-2xl font-semibold text-slate-950">
                        {formatMoney(booking.total)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Actions
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {status.paymentAvailable ? (
                      <Link
                        href={checkoutHref}
                        className="inline-flex justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                      >
                        Continue to checkout
                      </Link>
                    ) : null}
                    <Link
                      href={itineraryHref}
                      className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      View itinerary
                    </Link>
                    <Link
                      href="/flights"
                      className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Book another flight
                    </Link>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
