import Link from "next/link";
import { notFound } from "next/navigation";

import BookingLegSummary from "../../../../components/booking/BookingLegSummary";
import BookingStatusBadge from "../../../../components/booking/BookingStatusBadge";
import CopyBookingReferenceButton from "../../../../components/booking/CopyBookingReferenceButton";
import PrintItineraryButton from "../../../../components/booking/PrintItineraryButton";
import Footer from "../../../../components/layout/Footer";
import Header from "../../../../components/layout/Header";
import { FALLBACK_AIRPORT_TIME_ZONE } from "../../../../lib/airport-timezones";
import { requireUser } from "../../../../lib/authorization";
import {
  isRoundTripLegs,
  loadBookingLegsWithFlights,
} from "../../../../lib/booking-segments";
import { getBookingStatusPresentation } from "../../../../lib/booking-status";
import {
  formatMoney,
  formatRoute,
  formatTripDateTime,
} from "../../../../lib/trip-formatting";
import { db } from "../../../../prisma/db";

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

  const [legs, passengers] = await Promise.all([
    loadBookingLegsWithFlights(booking),
    db.orm.public.Passenger.select("id", "firstName", "lastName", "nationality")
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const status = getBookingStatusPresentation(booking.status);
  const viewedAt = formatTripDateTime(
    new Date().toISOString(),
    FALLBACK_AIRPORT_TIME_ZONE
  );
  const tripHref = `/my-trips/${encodeURIComponent(booking.bookingReference)}`;
  const sortedPassengers = [...passengers].sort((left, right) => left.id - right.id);
  const isRoundTrip = isRoundTripLegs(legs);
  const outbound = legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0];

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
                className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                ← Back to trip
              </Link>
              <Link
                href="/my-trips"
                className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
                  <dd className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-slate-950">
                    <span className="break-all">{booking.bookingReference}</span>
                    <span className="print-hide">
                      <CopyBookingReferenceButton
                        bookingReference={booking.bookingReference}
                      />
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Booking created</dt>
                  <dd className="mt-1 text-slate-950">
                    {formatTripDateTime(
                      booking.createdAt,
                      FALLBACK_AIRPORT_TIME_ZONE
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Viewed</dt>
                  <dd className="mt-1 text-slate-950">{viewedAt}</dd>
                </div>
              </dl>
            </section>

            {legs.length === 0 ? (
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
                  {isRoundTrip ? "Flight details" : "Flight details"}
                </h2>
                {outbound ? (
                  <>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {isRoundTrip
                        ? `${outbound.flight.originCode} ⇄ ${outbound.flight.destinationCode}`
                        : formatRoute(
                            outbound.flight.originCode,
                            outbound.flight.destinationCode
                          )}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {outbound.flight.origin} → {outbound.flight.destination}
                    </p>
                  </>
                ) : null}

                <div className="mt-6 space-y-5">
                  {legs.map((leg) => (
                    <BookingLegSummary
                      key={`${leg.segmentType}-${leg.flightId}`}
                      leg={leg}
                    />
                  ))}
                </div>

                <p className="mt-5 text-sm text-slate-600">
                  Passengers{" "}
                  <span className="font-semibold text-slate-950">
                    {booking.passengerCount}
                  </span>
                </p>
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
                <ol className="mt-4 space-y-2">
                  {sortedPassengers.map((passenger, index) => (
                    <li
                      key={passenger.id}
                      className="rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        Passenger {index + 1}
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {passenger.firstName} {passenger.lastName}
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
