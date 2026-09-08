import Link from "next/link";

import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import CheckoutPaymentPanel from "../../components/booking/CheckoutPaymentPanel";
import CopyBookingReferenceButton from "../../components/booking/CopyBookingReferenceButton";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";
import { getBookingAmountDueCents } from "../../lib/booking-amount";
import { resolveBookingAccess } from "../../lib/booking-access-server";
import { getBookingStatusPresentation } from "../../lib/booking-status";
import { getCheckoutPaymentAction } from "../../lib/checkout";
import {
  isRoundTripLegs,
  loadBookingLegsWithFlights,
} from "../../lib/booking-segments";
import {
  getFareFamilyLabel,
  parseFareFamily,
  resolveSegmentFarePriceCents,
} from "../../lib/fare-families";
import { formatPassengerTypeLabel } from "../../lib/passenger-composition";
import { isStripeTestModeReady } from "../../lib/payments";
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
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0078D2]">
              Checkout
            </p>

            <h1 className="font-american-sans mt-3 text-3xl font-light tracking-[-0.03em] text-slate-950">
              {title}
            </h1>

            <p className="mt-4 text-slate-600">{message}</p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/flights"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0078D2] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#006bbd]"
              >
                Back to Flights
              </Link>
              {showMyTrips ? (
                <Link
                  href="/my-trips"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

  const access = await resolveBookingAccess(booking);

  if (!access.authorized) {
    return (
      <CheckoutError
        title="Booking not available."
        message="This booking is not available for review. If you just created it as a guest, continue from the same browser session."
        showMyTrips={Boolean(currentUser)}
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
  const bookingStatus = getBookingStatusPresentation(booking.status);
  const isOwner =
    currentUser != null && currentUser.id === booking.userId;
  const paymentAction = getCheckoutPaymentAction({
    bookingUserId: booking.userId,
    bookingStatus: booking.status,
    currentUserId: currentUser?.id ?? null,
    currentUserRole: currentUser?.role ?? null,
    stripeConfigured: isStripeTestModeReady(),
    guestAuthorized: access.mode === "guest",
  });
  const tripHref =
    access.mode === "account"
      ? `/my-trips/${encodeURIComponent(booking.bookingReference)}`
      : `/booking/confirmation/${encodeURIComponent(booking.bookingReference)}`;
  const itineraryHref =
    access.mode === "account" ? `${tripHref}/itinerary` : tripHref;
  const isRoundTrip = isRoundTripLegs(legs);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="fs-container py-7 sm:py-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0078D2]">
              Checkout
            </p>

            <h1 className="font-american-sans mt-2.5 text-[2.15rem] leading-[1.05] font-light tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Review your trip
            </h1>

            <div className="mt-5 flex min-w-0 flex-wrap items-end gap-x-4 gap-y-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Booking reference
                </p>
                <p className="fs-nums mt-1 break-all text-lg font-semibold tracking-[0.04em] text-slate-950">
                  {booking.bookingReference}
                </p>
              </div>
              <CopyBookingReferenceButton
                bookingReference={booking.bookingReference}
              />
              <BookingStatusBadge status={booking.status} />
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              {bookingStatus.description}
            </p>
          </div>
        </section>

        <section className="fs-container py-6 sm:py-8">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start lg:gap-7">
            <div className="min-w-0 space-y-5">
              {/* Flight itinerary document */}
              <section className="min-w-0 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
                <div className="flex items-end justify-between gap-3 border-b border-dashed border-slate-200 pb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      Travel document
                    </p>
                    <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
                      {isRoundTrip ? "Round-trip itinerary" : "Flight itinerary"}
                    </h2>
                  </div>
                  <p
                    aria-hidden="true"
                    className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block"
                  >
                    Five Stars
                  </p>
                </div>

                {legs.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {legs.map((leg) => (
                      <BookingLegSummary
                        key={`${leg.segmentType}-${leg.flightId}`}
                        leg={leg}
                        variant="boardingPass"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <h3 className="font-american-sans mt-5 text-2xl font-light tracking-[-0.02em] text-slate-950">
                      Flight details unavailable.
                    </h3>
                    <p className="mt-3 text-sm text-slate-600">
                      We could not load the flight for this booking. Your
                      booking reference and price are still shown from the
                      saved booking.
                    </p>
                  </>
                )}
              </section>

              {/* Travelers manifest */}
              <section className="min-w-0 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      Manifest
                    </p>
                    <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
                      Travelers
                    </h2>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    {passengerCount}{" "}
                    {passengerCount === 1 ? "passenger" : "passengers"}
                  </p>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  You are booking for{" "}
                  <span className="font-semibold text-slate-950">
                    {passengerCount}
                  </span>{" "}
                  {passengerCount === 1 ? "passenger" : "passengers"}.
                </p>

                {sortedPassengers.length > 0 ? (
                  <ol className="mt-4 divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-300">
                    {sortedPassengers.map((passenger, index) => (
                      <li key={passenger.id} className="px-1 py-3.5 sm:px-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                          Passenger {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {`${passenger.firstName} ${passenger.lastName}`}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatPassengerTypeLabel(passenger.passengerType)}
                          {passenger.nationality
                            ? ` · ${passenger.nationality}`
                            : ""}
                        </p>
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
                      className="font-semibold text-[#0078D2] transition hover:text-[#006bbd]"
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
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to My Trips
                  </Link>
                ) : null}
                {isOwner ? (
                  <>
                    <Link
                      href={tripHref}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View trip
                    </Link>
                    <Link
                      href={itineraryHref}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View itinerary
                    </Link>
                  </>
                ) : null}
                <Link
                  href="/flights"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Book another flight
                </Link>
              </nav>
            </div>

            {/* Fare receipt */}
            <aside className="min-w-0">
              <div className="sticky top-6 min-w-0 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                  Price summary
                </p>

                <h2 className="font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
                  Your total
                </h2>

                <p
                  aria-hidden="true"
                  className="mt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                >
                  Five Stars • Fare summary
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  {legs.map((leg) => {
                    const fareCents = resolveSegmentFarePriceCents({
                      farePriceCents: leg.farePriceCents,
                      flightPriceCents: leg.flight.price,
                    });
                    const family =
                      parseFareFamily(leg.fareFamily) ?? "BASIC";
                    const lineTotal = fareCents * passengerCount;
                    return (
                      <div
                        key={`${leg.segmentType}-${leg.flightId}`}
                        className="flex justify-between gap-4 border-b border-dashed border-slate-200 pb-3"
                      >
                        <span className="min-w-0 text-slate-600">
                          <span className="fs-nums block font-semibold text-slate-950">
                            {leg.flight.code}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {getFareFamilyLabel(family)}
                          </span>
                          <span className="fs-nums mt-0.5 block text-xs text-slate-500">
                            {passengerCount} × {formatMoney(fareCents)}
                          </span>
                        </span>
                        <span className="fs-nums shrink-0 font-medium text-slate-950">
                          {formatMoney(lineTotal)}
                        </span>
                      </div>
                    );
                  })}

                  {legs.length === 0 ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">Flight subtotal</span>
                      <span className="fs-nums font-medium text-slate-950">
                        {formatMoney(booking.subtotal)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-4 pt-1">
                      <span className="text-slate-600">Flight subtotal</span>
                      <span className="fs-nums font-medium text-slate-950">
                        {formatMoney(booking.subtotal)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">Taxes & fees</span>
                    <span className="fs-nums font-medium text-slate-950">
                      {formatMoney(booking.taxesAndFees)}
                    </span>
                  </div>

                  {(booking.seatFeesTotal ?? 0) > 0 ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">Seat selection</span>
                      <span className="fs-nums font-medium text-slate-950">
                        {formatMoney(booking.seatFeesTotal ?? 0)}
                      </span>
                    </div>
                  ) : null}

                  <div className="border-t border-dashed border-slate-300 pt-3">
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-950">
                        Total
                      </span>
                      <span className="fs-nums text-3xl font-semibold tracking-tight text-slate-950">
                        {formatMoney(getBookingAmountDueCents(booking))}
                      </span>
                    </div>
                    <p className="mt-1 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      USD
                    </p>
                  </div>
                </div>

                {/* Decorative receipt stub — no fake data */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none mt-4 border-t border-dashed border-slate-200 pt-3"
                >
                  <div className="flex justify-center gap-[2px]">
                    {Array.from({ length: 28 }).map((_, index) => (
                      <span
                        key={index}
                        className="h-5 w-[2px] bg-slate-300"
                        style={{
                          height: `${8 + ((index * 5) % 14)}px`,
                        }}
                      />
                    ))}
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
