import Link from "next/link";

import BookingLegSummary from "../../../../components/booking/BookingLegSummary";
import BookingStatusBadge from "../../../../components/booking/BookingStatusBadge";
import CopyBookingReferenceButton from "../../../../components/booking/CopyBookingReferenceButton";
import Footer from "../../../../components/layout/Footer";
import Header from "../../../../components/layout/Header";
import { getCurrentUser } from "../../../../lib/auth";
import {
  BOOKING_CONFIRMATION_NOT_FOUND,
  buildBookingConfirmationViewModel,
  canAccessBookingConfirmation,
  formatBookingReferenceDisplay,
} from "../../../../lib/booking-confirmation";
import { loadBookingLegsWithFlights } from "../../../../lib/booking-segments";
import { formatMoney } from "../../../../lib/trip-formatting";
import { db } from "../../../../prisma/db";

type Props = {
  params: Promise<{ reference: string }>;
};

function ConfirmationError({
  title,
  message,
  showMyTrips,
}: {
  title: string;
  message: string;
  showMyTrips?: boolean;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Booking confirmation
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="mt-4 text-slate-600">{message}</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {showMyTrips ? (
                <Link
                  href="/my-trips"
                  className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Back to My Trips
                </Link>
              ) : null}
              <Link
                href="/flights"
                className="inline-flex rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Book another flight
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { reference: rawReference } = await params;
  const bookingReference = decodeURIComponent(rawReference).trim();
  const currentUser = await getCurrentUser();

  if (!bookingReference) {
    return (
      <ConfirmationError
        title="Booking not found."
        message="We could not find a booking reference for this confirmation."
        showMyTrips
      />
    );
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking) {
    return (
      <ConfirmationError
        title={BOOKING_CONFIRMATION_NOT_FOUND.title}
        message={BOOKING_CONFIRMATION_NOT_FOUND.message}
        showMyTrips
      />
    );
  }

  if (
    !canAccessBookingConfirmation(
      booking.userId ?? null,
      currentUser?.id ?? null
    )
  ) {
    return (
      <ConfirmationError
        title="Booking not available."
        message="This booking is not available for review."
        showMyTrips
      />
    );
  }

  const [legs, passengers] = await Promise.all([
    loadBookingLegsWithFlights(booking),
    db.orm.public.Passenger.select(
      "id",
      "firstName",
      "lastName",
      "nationality",
      "passengerType"
    )
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const model = buildBookingConfirmationViewModel({
    bookingReference: booking.bookingReference,
    status: booking.status,
    subtotal: booking.subtotal,
    taxesAndFees: booking.taxesAndFees,
    total: booking.total,
    passengerCount: booking.passengerCount,
    legs,
    passengers,
  });

  const displayReference = formatBookingReferenceDisplay(
    model.bookingReference
  );

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {model.heroEyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {model.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              {model.supportingCopy}
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Booking reference
                </p>
                <p className="mt-1 break-all text-2xl font-semibold text-slate-950 sm:text-3xl">
                  {displayReference}
                </p>
              </div>
              <CopyBookingReferenceButton
                bookingReference={model.bookingReference}
              />
              <BookingStatusBadge status={booking.status} />
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">
                {model.statusLabel}
              </span>
              {" — "}
              {model.statusDescription}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  {model.isRoundTrip
                    ? "Round-trip itinerary"
                    : "Flight itinerary"}
                </h2>

                {legs.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {legs.map((leg) => (
                      <BookingLegSummary
                        key={`${leg.segmentType}-${leg.flightId}`}
                        leg={leg}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    Flight details are unavailable for this booking.
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">
                  Travelers
                </h2>
                <p className="mt-2 text-slate-600">
                  {model.travelers.length}{" "}
                  {model.travelers.length === 1 ? "traveler" : "travelers"} on
                  this booking.
                </p>

                {model.travelers.length > 0 ? (
                  <ol className="mt-5 space-y-4">
                    {model.travelers.map((traveler, index) => (
                      <li
                        key={traveler.id}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          Passenger {index + 1}
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {traveler.displayName}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {traveler.passengerTypeLabel}
                        </p>
                        {traveler.nationality ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {traveler.nationality}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    Traveler details are not available for this booking.
                  </p>
                )}
              </section>

              <nav
                className="flex flex-wrap gap-3"
                aria-label="Confirmation actions"
              >
                <Link
                  href={model.tripHref}
                  className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  View trip
                </Link>
                <Link
                  href={model.itineraryHref}
                  className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  View itinerary
                </Link>
                <Link
                  href={model.myTripsHref}
                  className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Back to My Trips
                </Link>
                <Link
                  href={model.flightsHref}
                  className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Book another flight
                </Link>
              </nav>
            </div>

            <aside>
              <div className="sticky top-6 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Price summary
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Your total
                  </h2>

                  <div className="mt-6 space-y-4 text-sm">
                    {model.segments.map((segment) => (
                      <div
                        key={`${segment.segmentType}-${segment.flightCode}`}
                        className="flex justify-between gap-4"
                      >
                        <span className="text-slate-600">
                          {segment.flightCode} · {segment.fareLabel}
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {model.price.passengerCount} ×{" "}
                            {formatMoney(segment.farePriceCents)}
                          </span>
                        </span>
                        <span className="font-medium text-slate-950">
                          {formatMoney(
                            segment.farePriceCents *
                              model.price.passengerCount
                          )}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium text-slate-950">
                        {formatMoney(model.price.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">Taxes & fees</span>
                      <span className="font-medium text-slate-950">
                        {formatMoney(model.price.taxesAndFees)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-end justify-between gap-4">
                        <span className="font-semibold text-slate-950">
                          Total
                        </span>
                        <span className="text-3xl font-semibold tracking-tight text-slate-950">
                          {formatMoney(model.price.total)}
                        </span>
                      </div>
                      <p className="mt-2 text-right text-xs text-slate-500">
                        USD
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Online payment is not available yet.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Your booking record is saved. Payment completion will be
                    available in a later release.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
