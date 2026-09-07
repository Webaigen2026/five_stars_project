import Link from "next/link";
import { notFound } from "next/navigation";

import BookingLegSummary from "../../../components/booking/BookingLegSummary";
import BookingProgress from "../../../components/booking/BookingProgress";
import BookingStatusBadge from "../../../components/booking/BookingStatusBadge";
import CopyBookingReferenceButton from "../../../components/booking/CopyBookingReferenceButton";

import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

import { resolveBookingAccess } from "../../../lib/booking-access-server";
import { getBookingAmountDueCents } from "../../../lib/booking-amount";
import { loadBookingLegsWithFlights } from "../../../lib/booking-segments";

import {
  buildTripDetailViewModel,
  formatMoney,
} from "../../../lib/trip-detail";

import { db } from "../../../prisma/db";

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SeatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M7 12h10" />
      <path d="M5 9v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M8 9V6a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PassengerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-5 -top-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -top-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -left-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />
    </>
  );
}

function PerforationCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -left-3 z-20 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -right-3 z-20 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
      />
    </>
  );
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ bookingReference: string }>;
}) {
  const { bookingReference: rawReference } = await params;

  const bookingReference = decodeURIComponent(rawReference).trim();

  if (!bookingReference) {
    notFound();
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking) {
    notFound();
  }

  const access = await resolveBookingAccess(booking);

  if (!access.authorized) {
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

      <main className="min-h-screen ">
        {/* Trip header */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
            <Link
              href={model.myTripsHref}
              className="
                group
                inline-flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-slate-500
                transition
                hover:text-[#0078D2]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-4
              "
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                <ArrowLeftIcon />
              </span>

              Back to My Trips
            </Link>

            <div
              className="
                relative
                isolate
                mt-6
                min-w-0
              "
            >
              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-x-10
                  -bottom-3
                  -z-10
                  h-8
                  rounded-[50%]
                  bg-slate-950/10
                  blur-2xl
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  bg-white
                  shadow-[0_8px_30px_rgba(15,23,42,0.08)]
                  ring-1
                  ring-slate-200/90
                "
              >
                <TicketCutouts />

                <div
                  className="
                    relative
                    border-b
                    border-dashed
                    border-slate-300
                    px-5
                    py-6
                    sm:px-6
                    lg:px-8
                  "
                >
                  <PerforationCutouts />

                  <div
                    className="
                      grid
                      min-w-0
                      gap-6
                      lg:grid-cols-[minmax(0,1fr)_auto]
                      lg:items-end
                    "
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        My Trip
                      </p>

                      <h1
                        className="
                          font-american-sans
                          mt-2
                          break-words
                          text-4xl
                          font-light
                          leading-[1.05]
                          tracking-[-0.03em]
                          text-slate-950
                          sm:text-5xl
                        "
                      >
                        {model.routeHeading}
                      </h1>

                      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                        {model.tripTypeLabel}

                        <span
                          className="mx-2 text-slate-300"
                          aria-hidden="true"
                        >
                          •
                        </span>

                        {model.datesLabel}

                        {model.timingLabel ? (
                          <>
                            <span
                              className="mx-2 text-slate-300"
                              aria-hidden="true"
                            >
                              •
                            </span>

                            {model.timingLabel}
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="min-w-0 lg:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Booking reference
                      </p>

                      <p
                        className="
                          font-american-sans
                          mt-1
                          break-all
                          text-2xl
                          font-light
                          tracking-[-0.02em]
                          text-slate-950
                        "
                      >
                        {model.bookingReference}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                        <CopyBookingReferenceButton
                          bookingReference={model.bookingReference}
                        />

                        <BookingStatusBadge status={model.status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="max-w-2xl text-sm leading-6 text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {model.statusLabel}
                      </span>

                      {" — "}

                      {model.statusDescription}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/60 px-5 py-3 text-center sm:px-6 lg:px-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Five Stars • Booking ticket
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trip content */}
        <section className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-10">
          {legs.length === 0 ? (
            <section className="relative isolate min-w-0">
              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-x-10
                  -bottom-3
                  -z-10
                  h-8
                  rounded-[50%]
                  bg-slate-950/10
                  blur-2xl
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  bg-white
                  px-6
                  py-10
                  text-center
                  shadow-[0_8px_28px_rgba(15,23,42,0.07)]
                  ring-1
                  ring-slate-200/90
                  sm:px-8
                  sm:py-12
                "
              >
                <TicketCutouts />

                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                  Trip status
                </p>

                <h2 className="font-american-sans mt-3 text-3xl font-light tracking-[-0.03em] text-slate-950">
                  Trip details unavailable
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                  We could not load the flight information for this booking.
                </p>

                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={model.itineraryHref}
                    className="
                      inline-flex
                      min-h-11
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      bg-[#0078D2]
                      px-6
                      text-sm
                      font-semibold
                      text-white
                      shadow-[0_4px_12px_rgba(0,120,210,0.18)]
                      transition
                      hover:bg-[#006bbd]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-[#0078D2]/30
                      focus-visible:ring-offset-2
                    "
                  >
                    View itinerary
                    <ArrowRightIcon />
                  </Link>

                  <Link
                    href={model.myTripsHref}
                    className="
                      inline-flex
                      min-h-11
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-slate-300
                      bg-white
                      px-6
                      text-sm
                      font-semibold
                      text-slate-700
                      transition
                      hover:border-[#0078D2]/30
                      hover:bg-[#f5faff]
                      hover:text-[#0078D2]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-[#0078D2]/30
                    "
                  >
                    Back to My Trips
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
              {/* Main content */}
              <div className="min-w-0 space-y-6">
                {/* Itinerary ticket */}
                <section
                  aria-labelledby="trip-itinerary-heading"
                  className="relative isolate min-w-0"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-8 -bottom-3 -z-10 h-7 rounded-[50%] bg-slate-950/10 blur-xl"
                  />

                  <div
                    className="
                      relative
                      overflow-hidden
                      bg-white
                      shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                      ring-1
                      ring-slate-200/90
                    "
                  >
                    <TicketCutouts />

                    <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                      <PerforationCutouts />

                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Itinerary
                      </p>

                      <h2
                        id="trip-itinerary-heading"
                        className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950"
                      >
                        {model.isRoundTrip
                          ? "Round-trip flights"
                          : "Flight itinerary"}
                      </h2>
                    </div>

                    <div className="space-y-4 px-5 py-6 sm:px-6">
                      {legs.map((leg) => (
                        <BookingLegSummary
                          key={`${leg.segmentType}-${leg.flightId}`}
                          leg={leg}
                        />
                      ))}
                    </div>

                    <div className="border-t border-dashed border-slate-300 bg-slate-50/60 px-5 py-3 text-center sm:px-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Five Stars • Flight itinerary
                      </p>
                    </div>
                  </div>
                </section>

                {/* Travelers ticket */}
                <section
                  aria-labelledby="trip-travelers-heading"
                  className="relative isolate min-w-0"
                >
                  <div
                    className="
                      relative
                      overflow-hidden
                      bg-white
                      shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                      ring-1
                      ring-slate-200/90
                    "
                  >
                    <TicketCutouts />

                    <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                      <PerforationCutouts />

                      <div className="flex items-center gap-3">
                        <span
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#0078D2]/[0.07]
                            text-[#0078D2]
                          "
                        >
                          <PassengerIcon />
                        </span>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                            Travelers
                          </p>

                          <h2
                            id="trip-travelers-heading"
                            className="font-american-sans mt-1 text-2xl font-light tracking-[-0.025em] text-slate-950"
                          >
                            Passenger list
                          </h2>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        {model.travelerLabel}
                      </p>
                    </div>

                    <div className="px-5 py-5 sm:px-6">
                      {model.travelers.length === 0 ? (
                        <p className="text-sm text-slate-600">
                          No passenger names are available for this booking.
                        </p>
                      ) : (
                        <ol className="grid gap-3 sm:grid-cols-2">
                          {model.travelers.map((traveler, index) => (
                            <li
                              key={traveler.id}
                              className="
                                relative
                                overflow-hidden
                                border
                                border-slate-200
                                bg-slate-50/50
                                px-4
                                py-4
                              "
                            >
                              <span
                                aria-hidden="true"
                                className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-white"
                              />

                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                                Passenger {index + 1}
                              </p>

                              <p className="font-american-sans mt-1.5 text-xl font-light tracking-[-0.02em] text-slate-950">
                                {traveler.displayName}
                              </p>

                              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.09em] text-slate-500">
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
                    </div>
                  </div>
                </section>

                {/* Seats ticket */}
                <section
                  aria-labelledby="trip-seats-heading"
                  className="relative isolate min-w-0"
                >
                  <div
                    className="
                      relative
                      overflow-hidden
                      bg-white
                      shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                      ring-1
                      ring-slate-200/90
                    "
                  >
                    <TicketCutouts />

                    <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                      <PerforationCutouts />

                      <div className="flex items-center gap-3">
                        <span
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#0078D2]/[0.07]
                            text-[#0078D2]
                          "
                        >
                          <SeatIcon />
                        </span>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                            Seat assignment
                          </p>

                          <h2
                            id="trip-seats-heading"
                            className="font-american-sans mt-1 text-2xl font-light tracking-[-0.025em] text-slate-950"
                          >
                            Seats
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-5 sm:px-6">
                      {seatAssignments.length === 0 ? (
                        <p className="text-sm text-slate-600">
                          Seat not selected.
                        </p>
                      ) : (
                        <div className="space-y-5">
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
                              <div
                                key={`${leg.segmentType}-${leg.flightId}`}
                                className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0"
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                                  {leg.segmentType === "RETURN"
                                    ? "Return"
                                    : "Outbound"}{" "}
                                  • {leg.flight.code}
                                </p>

                                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {rows.map((assignment) => {
                                    const traveler = model.travelers.find(
                                      (row) =>
                                        row.id === assignment.passengerId
                                    );

                                    return (
                                      <li
                                        key={`${assignment.bookingSegmentId}-${assignment.passengerId}`}
                                        className="
                                          flex
                                          items-center
                                          justify-between
                                          gap-4
                                          border
                                          border-slate-200
                                          bg-slate-50/60
                                          px-3.5
                                          py-3
                                        "
                                      >
                                        <span className="min-w-0 truncate text-sm font-medium text-slate-950">
                                          {traveler?.displayName ?? "Traveler"}
                                        </span>

                                        <span className="shrink-0 font-american-sans text-lg font-light text-[#0078D2]">
                                          {assignment.seatNumber}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Booking status ticket */}
                <section
                  aria-labelledby="trip-status-heading"
                  className="relative isolate min-w-0"
                >
                  <div
                    className="
                      relative
                      overflow-hidden
                      bg-white
                      shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                      ring-1
                      ring-slate-200/90
                    "
                  >
                    <TicketCutouts />

                    <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                      <PerforationCutouts />

                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Booking status
                      </p>

                      <h2
                        id="trip-status-heading"
                        className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950"
                      >
                        Trip progress
                      </h2>

                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        {model.statusDescription}
                      </p>
                    </div>

                    <div className="px-5 py-6 sm:px-6">
                      <BookingProgress status={model.status} />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right rail */}
              <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
                {/* Fare summary ticket */}
                <section
                  className="
                    relative
                    overflow-hidden
                    bg-slate-50/80
                    shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                    ring-1
                    ring-slate-200/90
                  "
                >
                  <TicketCutouts />

                  <div className="relative border-b border-dashed border-slate-300 bg-white px-5 py-5 sm:px-6">
                    <PerforationCutouts />

                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      Fare summary
                    </p>

                    <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                      Your total
                    </h2>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <div className="space-y-3 text-sm">
                      {model.priceLines.map((line) => (
                        <div
                          key={line.key}
                          className="flex justify-between gap-4"
                        >
                          <span className="text-slate-600">
                            {line.label}
                          </span>

                          <span className="font-medium text-slate-950">
                            {formatMoney(line.amountCents)}
                          </span>
                        </div>
                      ))}

                      <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                        <span className="text-slate-600">
                          Flight subtotal
                        </span>

                        <span className="font-medium text-slate-950">
                          {formatMoney(model.subtotal)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600">
                          Taxes &amp; fees
                        </span>

                        <span className="font-medium text-slate-950">
                          {formatMoney(model.taxesAndFees)}
                        </span>
                      </div>

                      {(booking.seatFeesTotal ?? 0) > 0 ? (
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-600">
                            Seat selection
                          </span>

                          <span className="font-medium text-slate-950">
                            {formatMoney(booking.seatFeesTotal ?? 0)}
                          </span>
                        </div>
                      ) : null}

                      <div className="border-t border-dashed border-slate-300 pt-4">
                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm font-semibold text-slate-950">
                            Total
                          </span>

                          <span
                            className="
                              font-american-sans
                              text-3xl
                              font-light
                              tracking-[-0.03em]
                              text-slate-950
                            "
                          >
                            {formatMoney(
                              getBookingAmountDueCents(booking)
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          USD
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 bg-white px-5 py-3 text-center sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Five Stars • Fare summary
                    </p>
                  </div>
                </section>

                {/* Payment */}
                {model.hasPayNowAction ? (
                  <section
                    className="
                      relative
                      overflow-hidden
                      border
                      border-[#0078D2]/20
                      bg-[#f5faff]
                      px-5
                      py-5
                      shadow-[0_5px_18px_rgba(0,120,210,0.06)]
                    "
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                      Payment
                    </p>

                    <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                      Ready to pay
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Complete payment securely with Stripe Checkout. Seats
                      are held when you start checkout.
                    </p>

                    <Link
                      href={model.checkoutHref}
                      className="
                        mt-5
                        inline-flex
                        min-h-12
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        bg-[#0078D2]
                        px-5
                        text-sm
                        font-semibold
                        text-white
                        shadow-[0_5px_14px_rgba(0,120,210,0.18)]
                        transition
                        hover:bg-[#006bbd]
                        hover:shadow-[0_8px_20px_rgba(0,120,210,0.24)]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                        focus-visible:ring-offset-2
                      "
                    >
                      Pay securely
                      <ArrowRightIcon />
                    </Link>
                  </section>
                ) : null}

                {model.showPaymentDisabledNotice ? (
                  <section className="border border-amber-200 bg-amber-50/80 px-5 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Payment
                    </p>

                    <h2 className="font-american-sans mt-2 text-xl font-light tracking-[-0.02em] text-slate-950">
                      Online payment is not available yet
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Payment has not been completed. Your booking record is
                      saved for later.
                    </p>
                  </section>
                ) : null}

                {/* Actions ticket */}
                <section
                  aria-labelledby="trip-actions-heading"
                  className="
                    relative
                    overflow-hidden
                    bg-white
                    shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                    ring-1
                    ring-slate-200/90
                  "
                >
                  <TicketCutouts />

                  <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                    <PerforationCutouts />

                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      Trip actions
                    </p>

                    <h2
                      id="trip-actions-heading"
                      className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950"
                    >
                      Manage trip
                    </h2>
                  </div>

                  <nav
                    className="flex flex-col gap-2.5 px-5 py-5 sm:px-6"
                    aria-label="Trip actions"
                  >
                    <Link
                      href={`/my-trips/${encodeURIComponent(
                        booking.bookingReference
                      )}/seats`}
                      className="
                        inline-flex
                        min-h-11
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-slate-200
                        px-5
                        text-sm
                        font-semibold
                        text-slate-800
                        transition
                        hover:border-[#0078D2]/30
                        hover:bg-[#f5faff]
                        hover:text-[#0078D2]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                      "
                    >
                      Select seats
                    </Link>

                    <Link
                      href={model.itineraryHref}
                      className="
                        inline-flex
                        min-h-11
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#0078D2]
                        px-5
                        text-sm
                        font-semibold
                        text-white
                        shadow-[0_4px_12px_rgba(0,120,210,0.16)]
                        transition
                        hover:bg-[#006bbd]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                        focus-visible:ring-offset-2
                      "
                    >
                      View itinerary
                    </Link>

                    <Link
                      href={model.myTripsHref}
                      className="
                        inline-flex
                        min-h-11
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-slate-200
                        px-5
                        text-sm
                        font-semibold
                        text-slate-800
                        transition
                        hover:border-[#0078D2]/30
                        hover:bg-[#f5faff]
                        hover:text-[#0078D2]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                      "
                    >
                      Back to My Trips
                    </Link>

                    <Link
                      href={model.flightsHref}
                      className="
                        inline-flex
                        min-h-11
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-slate-200
                        px-5
                        text-sm
                        font-semibold
                        text-slate-800
                        transition
                        hover:border-[#0078D2]/30
                        hover:bg-[#f5faff]
                        hover:text-[#0078D2]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                      "
                    >
                      Book another flight
                    </Link>
                  </nav>

                  <div className="border-t border-dashed border-slate-300 bg-slate-50/60 px-5 py-3 text-center sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Five Stars • Trip actions
                    </p>
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