import Link from "next/link";

import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import CheckoutPaymentPanel from "../../components/booking/CheckoutPaymentPanel";
import CopyBookingReferenceButton from "../../components/booking/CopyBookingReferenceButton";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";
import { getBookingStatusPresentation } from "../../lib/booking-status";
import {
  canReviewCheckoutBooking,
  getCheckoutPaymentAction,
} from "../../lib/checkout";
import {
  isRoundTripLegs,
  loadBookingLegsWithFlights,
} from "../../lib/booking-segments";
import { formatPassengerTypeLabel } from "../../lib/passenger-composition";
import { isStripeConfigured } from "../../lib/payments";
import { formatMoney } from "../../lib/trip-formatting";
import { db } from "../../prisma/db";
import BookingLegSummary from "../../components/booking/BookingLegSummary";

type SearchParams = Promise<{
  booking?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

function CheckoutError({
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
              Checkout
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>

            <p className="mt-4 text-slate-600">{message}</p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/flights"
                className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
              >
                Back to Flights
              </Link>
              {showMyTrips ? (
                <Link
                  href="/my-trips"
                  className="inline-flex rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to My Trips
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default async function CheckoutPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const bookingReference = params.booking?.trim() ?? "";
  const currentUser = await getCurrentUser();

  if (!bookingReference) {
    return (
      <CheckoutError
        title="Booking reference missing."
        message="We could not find a booking reference for this checkout. Search for a flight to start a new booking."
        showMyTrips={Boolean(currentUser)}
      />
    );
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking) {
    return (
      <CheckoutError
        title="Booking not found."
        message="We could not find a booking with that reference."
        showMyTrips={Boolean(currentUser)}
      />
    );
  }

  if (!canReviewCheckoutBooking(booking.userId, currentUser?.id ?? null)) {
    return (
      <CheckoutError
        title="Booking not available."
        message="This booking is not available for review."
        showMyTrips
      />
    );
  }

  const [legs, passengers] = await Promise.all([
    loadBookingLegsWithFlights(booking),
    db.orm.public.Passenger.select("id", "firstName", "lastName", "nationality", "passengerType")
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const sortedPassengers = [...passengers].sort((left, right) => left.id - right.id);
  const passengerCount = booking.passengerCount;
  const fareEach =
    passengerCount > 0 ? Math.round(booking.subtotal / passengerCount) : 0;
  const bookingStatus = getBookingStatusPresentation(booking.status);
  const isOwner =
    currentUser != null && currentUser.id === booking.userId;
  const paymentAction = getCheckoutPaymentAction({
    bookingUserId: booking.userId,
    bookingStatus: booking.status,
    currentUserId: currentUser?.id ?? null,
    currentUserRole: currentUser?.role ?? null,
    stripeConfigured: isStripeConfigured(),
  });
  const tripHref = `/my-trips/${encodeURIComponent(booking.bookingReference)}`;
  const itineraryHref = `${tripHref}/itinerary`;
  const isRoundTrip = isRoundTripLegs(legs);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Checkout
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Review your trip
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Booking reference
                </p>
                <p className="mt-1 break-all text-lg font-semibold text-slate-950">
                  {booking.bookingReference}
                </p>
              </div>
              <CopyBookingReferenceButton
                bookingReference={booking.bookingReference}
              />
              <BookingStatusBadge status={booking.status} />
            </div>

            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
              {bookingStatus.description}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  {isRoundTrip ? "Round-trip itinerary" : "Flight itinerary"}
                </p>

                {legs.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {legs.map((leg) => (
                      <BookingLegSummary key={`${leg.segmentType}-${leg.flightId}`} leg={leg} />
                    ))}
                  </div>
                ) : (
                  <>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      Flight details unavailable.
                    </h2>
                    <p className="mt-3 text-slate-600">
                      We could not load the flight for this booking. Your
                      booking reference and price are still shown from the
                      saved booking.
                    </p>
                  </>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">
                  Travelers
                </h2>

                <p className="mt-2 text-slate-600">
                  You are booking for{" "}
                  <span className="font-semibold text-slate-950">
                    {passengerCount}
                  </span>{" "}
                  {passengerCount === 1 ? "passenger" : "passengers"}.
                </p>

                {sortedPassengers.length > 0 ? (
                  <ol className="mt-5 space-y-4">
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
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatPassengerTypeLabel(passenger.passengerType)}
                        </p>
                        {passenger.nationality ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {passenger.nationality}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    Traveler names will appear here once passenger details are
                    on file.
                  </p>
                )}

                {sortedPassengers.length > 0 &&
                sortedPassengers.length !== passengerCount ? (
                  <p className="mt-4 text-sm text-slate-600">
                    This booking lists {passengerCount}{" "}
                    {passengerCount === 1 ? "traveler" : "travelers"}, and{" "}
                    {sortedPassengers.length} traveler{" "}
                    {sortedPassengers.length === 1 ? "record is" : "records are"}{" "}
                    on file.
                  </p>
                ) : null}

                <p className="mt-5 text-sm font-semibold text-slate-700">
                  Passenger details saved
                </p>
                {isOwner ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Review this trip anytime in{" "}
                    <Link
                      href={tripHref}
                      className="font-semibold text-primary transition hover:text-primary-hover"
                    >
                      My Trips
                    </Link>
                    .
                  </p>
                ) : null}
              </section>

              <nav className="flex flex-wrap gap-3" aria-label="Checkout actions">
                {currentUser ? (
                  <Link
                    href="/my-trips"
                    className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to My Trips
                  </Link>
                ) : null}
                {isOwner ? (
                  <>
                    <Link
                      href={tripHref}
                      className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View trip
                    </Link>
                    <Link
                      href={itineraryHref}
                      className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View itinerary
                    </Link>
                  </>
                ) : null}
                <Link
                  href="/flights"
                  className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Book another flight
                </Link>
              </nav>
            </div>

            <aside>
              <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Price Summary
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Your total
                </h2>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      {passengerCount} × {formatMoney(fareEach)}
                    </span>
                    <span className="font-medium text-slate-950">
                      {formatMoney(booking.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">Taxes & fees</span>
                    <span className="font-medium text-slate-950">
                      {formatMoney(booking.taxesAndFees)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-end justify-between gap-4">
                      <span className="font-semibold text-slate-950">
                        Total
                      </span>
                      <span className="text-3xl font-semibold tracking-tight text-slate-950">
                        {formatMoney(booking.total)}
                      </span>
                    </div>
                    <p className="mt-2 text-right text-xs text-slate-500">
                      USD
                    </p>
                  </div>
                </div>

                {paymentAction !== "hidden" ? (
                  <CheckoutPaymentPanel
                    bookingReference={booking.bookingReference}
                    paymentAction={paymentAction}
                  />
                ) : null}
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
