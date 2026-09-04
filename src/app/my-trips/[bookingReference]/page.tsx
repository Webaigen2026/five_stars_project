import Link from "next/link";
import { notFound } from "next/navigation";

import BookingLegSummary from "../../../components/booking/BookingLegSummary";
import BookingProgress from "../../../components/booking/BookingProgress";
import BookingStatusBadge from "../../../components/booking/BookingStatusBadge";
import CopyBookingReferenceButton from "../../../components/booking/CopyBookingReferenceButton";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { requireUser } from "../../../lib/authorization";
import { loadBookingLegsWithFlights } from "../../../lib/booking-segments";
import { getBookingAmountDueCents } from "../../../lib/booking-amount";
import {
  buildTripDetailViewModel,
  canAccessTripDetail,
  formatMoney,
} from "../../../lib/trip-detail";
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

  if (
    !booking ||
    !canAccessTripDetail(booking.userId ?? null, currentUser.id)
  ) {
    notFound();
  }

  const [legs, passengers, seatAssignments, segments] = await Promise.all([
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
    db.orm.public.SeatAssignment.select(
      "bookingSegmentId",
      "passengerId",
      "seatNumber",
      "seatFeeCents"
    )
      .where({ bookingId: booking.id })
      .all(),
    db.orm.public.BookingSegment.select("id", "segmentType", "flightId")
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const model = buildTripDetailViewModel({
    bookingReference: booking.bookingReference,
    status: booking.status,
    subtotal: booking.subtotal,
    taxesAndFees: booking.taxesAndFees,
    total: booking.total,
    passengerCount: booking.passengerCount,
    legs,
    passengers,
  });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              My Trip
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {model.routeHeading}
            </h1>

            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              {model.tripTypeLabel}
              <span className="mx-2 text-slate-300" aria-hidden="true">
                ·
              </span>
              {model.datesLabel}
              {model.timingLabel ? (
                <>
                  <span className="mx-2 text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  {model.timingLabel}
                </>
              ) : null}
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Booking reference
                </p>
                <p className="mt-1 break-all text-2xl font-semibold text-slate-950">
                  {model.bookingReference}
                </p>
              </div>
              <CopyBookingReferenceButton
                bookingReference={model.bookingReference}
              />
              <BookingStatusBadge status={model.status} />
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
          <p className="mb-6">
            <Link
              href={model.myTripsHref}
              className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ← Back to My Trips
            </Link>
          </p>

          {legs.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">
                Trip details unavailable
              </h2>
              <p className="mt-3 text-slate-600">
                We could not load the flight for this booking.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={model.itineraryHref}
                  className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  View itinerary
                </Link>
                <Link
                  href={model.myTripsHref}
                  className="inline-flex rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Back to My Trips
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-6">
                <section
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  aria-labelledby="trip-itinerary-heading"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Itinerary
                  </p>
                  <h2
                    id="trip-itinerary-heading"
                    className="mt-2 text-2xl font-semibold text-slate-950"
                  >
                    {model.isRoundTrip
                      ? "Round-trip flights"
                      : "Flight itinerary"}
                  </h2>

                  <div className="mt-6 space-y-5">
                    {legs.map((leg) => (
                      <BookingLegSummary
                        key={`${leg.segmentType}-${leg.flightId}`}
                        leg={leg}
                      />
                    ))}
                  </div>
                </section>

                <section
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  aria-labelledby="trip-travelers-heading"
                >
                  <h2
                    id="trip-travelers-heading"
                    className="text-xl font-semibold text-slate-950"
                  >
                    Travelers
                  </h2>
                  <p className="mt-2 text-slate-600">{model.travelerLabel}</p>

                  {model.travelers.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-600">
                      No passenger names are available for this booking.
                    </p>
                  ) : (
                    <ol className="mt-5 space-y-3">
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
                  )}
                </section>

                <section
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  aria-labelledby="trip-seats-heading"
                >
                  <h2
                    id="trip-seats-heading"
                    className="text-xl font-semibold text-slate-950"
                  >
                    Seats
                  </h2>
                  {seatAssignments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Seat not selected.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-5">
                      {legs.map((leg) => {
                        const segment = segments.find(
                          (row) =>
                            row.flightId === leg.flightId &&
                            row.segmentType === leg.segmentType
                        );
                        const rows = seatAssignments.filter(
                          (assignment) =>
                            assignment.bookingSegmentId === segment?.id
                        );
                        if (rows.length === 0) {
                          return null;
                        }
                        return (
                          <div key={`${leg.segmentType}-${leg.flightId}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                              {leg.segmentType === "RETURN"
                                ? "Return"
                                : "Outbound"}{" "}
                              · {leg.flight.code}
                            </p>
                            <ul className="mt-3 space-y-2">
                              {rows.map((assignment) => {
                                const traveler = model.travelers.find(
                                  (row) => row.id === assignment.passengerId
                                );
                                return (
                                  <li
                                    key={`${assignment.bookingSegmentId}-${assignment.passengerId}`}
                                    className="text-sm text-slate-700"
                                  >
                                    <span className="font-medium text-slate-950">
                                      {traveler?.displayName ?? "Traveler"}
                                    </span>
                                    {" · Seat "}
                                    {assignment.seatNumber}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  aria-labelledby="trip-status-heading"
                >
                  <h2
                    id="trip-status-heading"
                    className="text-xl font-semibold text-slate-950"
                  >
                    Booking status
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {model.statusDescription}
                  </p>
                  <div className="mt-6">
                    <BookingProgress status={model.status} />
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Price summary
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Your total
                  </h2>

                  <div className="mt-6 space-y-4 text-sm">
                    {model.priceLines.map((line) => (
                      <div
                        key={line.key}
                        className="flex justify-between gap-4"
                      >
                        <span className="text-slate-600">{line.label}</span>
                        <span className="font-medium text-slate-950">
                          {formatMoney(line.amountCents)}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
                      <span className="text-slate-600">Flight subtotal</span>
                      <span className="font-medium text-slate-950">
                        {formatMoney(model.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">Taxes & fees</span>
                      <span className="font-medium text-slate-950">
                        {formatMoney(model.taxesAndFees)}
                      </span>
                    </div>
                    {(booking.seatFeesTotal ?? 0) > 0 ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600">Seat selection</span>
                        <span className="font-medium text-slate-950">
                          {formatMoney(booking.seatFeesTotal ?? 0)}
                        </span>
                      </div>
                    ) : null}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-end justify-between gap-4">
                        <span className="font-semibold text-slate-950">
                          Total
                        </span>
                        <span className="text-3xl font-semibold tracking-tight text-slate-950">
                          {formatMoney(getBookingAmountDueCents(booking))}
                        </span>
                      </div>
                      <p className="mt-2 text-right text-xs text-slate-500">
                        USD
                      </p>
                    </div>
                  </div>
                </section>

                {model.hasPayNowAction ? (
                  <div className="rounded-3xl border border-sky-200 bg-sky-50/80 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Ready to pay
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Complete payment securely with Stripe Checkout. Seats are
                      held when you start checkout.
                    </p>
                    <Link
                      href={model.checkoutHref}
                      className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      Pay securely
                    </Link>
                  </div>
                ) : null}

                {model.showPaymentDisabledNotice ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Online payment is not available yet.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Payment has not been completed. Your booking record is
                      saved for later.
                    </p>
                  </div>
                ) : null}

                <section
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  aria-labelledby="trip-actions-heading"
                >
                  <h2
                    id="trip-actions-heading"
                    className="text-lg font-semibold text-slate-950"
                  >
                    Actions
                  </h2>
                  <nav
                    className="mt-4 flex flex-col gap-3"
                    aria-label="Trip actions"
                  >
                    <Link
                      href={`/my-trips/${encodeURIComponent(booking.bookingReference)}/seats`}
                      className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Select seats
                    </Link>
                    <Link
                      href={model.itineraryHref}
                      className="inline-flex justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      View itinerary
                    </Link>
                    <Link
                      href={model.myTripsHref}
                      className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Back to My Trips
                    </Link>
                    <Link
                      href={model.flightsHref}
                      className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Book another flight
                    </Link>
                  </nav>
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
