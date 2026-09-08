import Link from "next/link";

import BookingLegSummary from "../../../../components/booking/BookingLegSummary";
import BookingStatusBadge from "../../../../components/booking/BookingStatusBadge";
import CopyBookingReferenceButton from "../../../../components/booking/CopyBookingReferenceButton";

import Footer from "../../../../components/layout/Footer";
import Header from "../../../../components/layout/Header";

import { getCurrentUser } from "../../../../lib/auth";
import { resolveBookingAccess } from "../../../../lib/booking-access-server";

import {
  BOOKING_CONFIRMATION_NOT_FOUND,
  buildBookingConfirmationViewModel,
  formatBookingReferenceDisplay,
} from "../../../../lib/booking-confirmation";

import { getBookingAmountDueCents } from "../../../../lib/booking-amount";
import { loadBookingLegsWithFlights } from "../../../../lib/booking-segments";
import { isPayableBookingStatus } from "../../../../lib/payments";
import { formatMoney } from "../../../../lib/trip-formatting";

import { db } from "../../../../prisma/db";

type Props = {
  params: Promise<{ reference: string }>;
};

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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m4 10 4 4 8-9" />
    </svg>
  );
}

function TicketCorners() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 -top-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />
    </>
  );
}

function PerforationCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 -top-3 z-20 h-6 w-6 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 z-20 h-6 w-6 rounded-full bg-slate-50"
      />
    </>
  );
}

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
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="relative isolate">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 -bottom-4 -z-10 h-9 rounded-[50%] bg-slate-950/[0.07] blur-2xl"
            />

            <div className="relative overflow-hidden bg-white shadow-[0_10px_34px_rgba(15,23,42,0.07)]">
              <TicketCorners />

              <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
                  Booking confirmation
                </p>

                <h1 className="font-american-sans mt-3 text-3xl font-light tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  {title}
                </h1>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                  {message}
                </p>
              </div>

              <div className="relative border-t border-dashed border-slate-300 bg-slate-50/60 px-5 py-5 sm:px-8">
                <PerforationCutouts />

                <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                  {showMyTrips ? (
                    <Link
                      href="/my-trips"
                      className="
                        inline-flex
                        min-h-12
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        bg-[#0078D2]
                        px-6
                        text-sm
                        font-semibold
                        text-white
                        transition
                        hover:bg-[#006bbd]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                        focus-visible:ring-offset-2
                      "
                    >
                      <ArrowLeftIcon />
                      Back to My Trips
                    </Link>
                  ) : null}

                  <Link
                    href="/flights"
                    className="
                      inline-flex
                      min-h-12
                      items-center
                      justify-center
                      gap-2
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
                    Book another flight
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default async function BookingConfirmationPage({
  params,
}: Props) {
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

  if (!(await resolveBookingAccess(booking)).authorized) {
    return (
      <ConfirmationError
        title="Booking not available."
        message="This booking is not available for review. If you booked as a guest, open confirmation from the same browser session used to create the booking."
        showMyTrips={Boolean(currentUser)}
      />
    );
  }

  const [legs, passengers, seatAssignments, segments] =
    await Promise.all([
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
        "seatNumber"
      )
        .where({ bookingId: booking.id })
        .all(),

      db.orm.public.BookingSegment.select(
        "id",
        "segmentType",
        "flightId"
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

  const amountDueCents = getBookingAmountDueCents(booking);

  const seatFeesTotal = booking.seatFeesTotal ?? 0;

  const canPay = isPayableBookingStatus(booking.status);

  return (
    <>
      <Header />

      <main className="min-h-screen overflow-x-hidden bg-slate-50">
        {/* =====================================================
            CONFIRMATION HERO
        ===================================================== */}
        <section className="border-b border-slate-200 bg-white">
          <div className="fs-container fs-section-y">
            <div className="flex max-w-4xl flex-col gap-6">
              <div>
                <div className="flex items-center gap-3">
                

                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
                    {model.heroEyebrow}
                  </p>
                </div>

                <h1 className="font-american-sans mt-4 text-4xl font-light tracking-[-0.035em] text-slate-950 sm:text-5xl">
                  {model.heroTitle}
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  {model.supportingCopy}
                </p>
              </div>

              <div className="flex flex-col gap-4 border-t border-dashed border-slate-200 pt-5 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Booking reference
                  </p>

                  <p className="fs-nums mt-1 break-all text-2xl font-semibold tracking-[0.025em] text-slate-950 sm:text-3xl">
                    {displayReference}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <CopyBookingReferenceButton
                    bookingReference={model.bookingReference}
                  />

                  <BookingStatusBadge status={booking.status} />
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                <span className="font-semibold text-slate-900">
                  {model.statusLabel}
                </span>
                {" — "}
                {model.statusDescription}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}
        <section className="fs-container fs-section-y">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* =================================================
                LEFT COLUMN
            ================================================= */}
            <div className="min-w-0 space-y-6">
              {/* ===============================================
                  ITINERARY TICKET
              =============================================== */}
              <section className="relative isolate min-w-0">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/[0.06] blur-2xl"
                />

                <div className="relative overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                  <TicketCorners />

                  <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      {model.isRoundTrip
                        ? "Round-trip itinerary"
                        : "Flight itinerary"}
                    </p>

                    <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                      Your journey
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Review the flight details associated with this
                      reservation.
                    </p>
                  </div>

                  <div className="px-5 py-5 sm:px-6 sm:py-6">
                    {legs.length > 0 ? (
                      <div className="space-y-4">
                        {legs.map((leg) => (
                          <BookingLegSummary
                            key={`${leg.segmentType}-${leg.flightId}`}
                            leg={leg}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Flight details are unavailable for this booking.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center sm:px-6">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Five Stars • Flight itinerary
                    </p>
                  </div>
                </div>
              </section>

              {/* ===============================================
                  TRAVELERS TICKET
              =============================================== */}
              <section className="relative isolate min-w-0">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/[0.05] blur-2xl"
                />

                <div className="relative overflow-hidden bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
                  <TicketCorners />

                  <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                          Travelers
                        </p>

                        <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                          Passenger manifest
                        </h2>
                      </div>

                      <p className="text-sm text-slate-500">
                        <span className="fs-nums font-semibold text-slate-950">
                          {model.travelers.length}
                        </span>{" "}
                        {model.travelers.length === 1
                          ? "traveler"
                          : "travelers"}
                      </p>
                    </div>
                  </div>

                  {model.travelers.length > 0 ? (
                    <ol className="divide-y divide-dashed divide-slate-200">
                      {model.travelers.map((traveler, index) => (
                        <li
                          key={traveler.id}
                          className="flex min-w-0 items-start gap-4 px-5 py-4 sm:px-6"
                        >
                          <span
                            className="
                              fs-nums
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-[#0078D2]/[0.07]
                              text-xs
                              font-semibold
                              text-[#0078D2]
                            "
                          >
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="break-words font-semibold text-slate-950">
                              {traveler.displayName}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                              <span className="font-medium text-slate-600">
                                {traveler.passengerTypeLabel}
                              </span>

                              {traveler.nationality ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="h-1 w-1 rounded-full bg-slate-300"
                                  />

                                  <span className="text-slate-500">
                                    {traveler.nationality}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="px-5 py-6 sm:px-6">
                      <p className="text-sm text-slate-600">
                        Traveler details are not available for this booking.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Five Stars • Traveler information
                    </p>
                  </div>
                </div>
              </section>

              {/* ===============================================
                  SELECTED SEATS
              =============================================== */}
              {seatAssignments.length > 0 ? (
                <section className="relative isolate min-w-0">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-10 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/[0.05] blur-2xl"
                  />

                  <div className="relative overflow-hidden bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
                    <TicketCorners />

                    <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                      />

                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                      />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Seating
                      </p>

                      <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                        Selected seats
                      </h2>
                    </div>

                    <div className="space-y-6 px-5 py-6 sm:px-6">
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
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                                {leg.segmentType === "RETURN"
                                  ? "Return"
                                  : "Outbound"}
                              </p>

                              <span
                                aria-hidden="true"
                                className="h-1 w-1 rounded-full bg-slate-300"
                              />

                              <p className="fs-nums text-xs font-semibold text-slate-600">
                                {leg.flight.code}
                              </p>
                            </div>

                            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                              {rows.map((assignment) => {
                                const traveler = model.travelers.find(
                                  (row) =>
                                    row.id === assignment.passengerId
                                );

                                return (
                                  <li
                                    key={`${assignment.bookingSegmentId}-${assignment.passengerId}`}
                                    className="flex items-center justify-between gap-4 bg-slate-50/80 px-4 py-3"
                                  >
                                    <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                                      {traveler?.displayName ?? "Traveler"}
                                    </span>

                                    <span
                                      className="
                                        fs-nums
                                        flex
                                        h-9
                                        min-w-9
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-md
                                        bg-[#0078D2]
                                        px-2
                                        text-sm
                                        font-semibold
                                        text-white
                                      "
                                    >
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

                    <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Five Stars • Seat assignments
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {/* ===============================================
                  ACTIONS
              =============================================== */}
              <nav
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                aria-label="Confirmation actions"
              >
                <Link
                  href={model.tripHref}
                  className="
                    group
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-[#0078D2]
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_4px_14px_rgba(0,120,210,0.16)]
                    transition
                    hover:bg-[#006bbd]
                    hover:shadow-[0_7px_18px_rgba(0,120,210,0.22)]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                    focus-visible:ring-offset-2
                  "
                >
                  View trip

                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRightIcon />
                  </span>
                </Link>

                <Link
                  href={model.itineraryHref}
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-5
                    text-sm
                    font-semibold
                    text-slate-700
                    transition
                    hover:border-[#0078D2]/30
                    hover:bg-[#f5faff]
                    hover:text-white
                    hover:bg-[#0078D2]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                  "
                >
                  View itinerary
                </Link>

                <Link
                  href={model.myTripsHref}
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-5
                    text-sm
                    font-semibold
                    text-slate-700
                    transition
                    hover:border-[#0078D2]/30
                    hover:bg-[#f5faff]
                    hover:text-white
                    hover:bg-[#0078D2]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                  "
                >
                  My Trips
                </Link>

                <Link
                  href={model.flightsHref}
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-5
                    text-sm
                    font-semibold
                    text-slate-700
                    transition
                    hover:border-[#0078D2]/30
                    hover:bg-[#f5faff]
                    hover:text-white
                    hover:bg-[#0078D2]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                  "
                >
                  Book another flight
                </Link>
              </nav>
         
            </div>

            {/* =================================================
                PRICE / PAYMENT RAIL
            ================================================= */}
            <aside className="min-w-0">
              <div className="space-y-5 lg:sticky lg:top-24">
                {/* =============================================
                    PRICE TICKET
                ============================================= */}
                <section className="relative isolate min-w-0">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-8 -bottom-3 -z-10 h-7 rounded-[50%] bg-slate-950/[0.06] blur-xl"
                  />

                  <div className="relative overflow-hidden bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
                    <TicketCorners />

                    <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                      />

                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                      />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Price summary
                      </p>

                      <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                        Your total
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {model.price.passengerCount}{" "}
                        {model.price.passengerCount === 1
                          ? "traveler"
                          : "travelers"}
                      </p>
                    </div>

                    <div className="px-5 py-5 sm:px-6">
                      <div className="space-y-4 text-sm">
                        {model.segments.map((segment) => (
                          <div
                            key={`${segment.segmentType}-${segment.flightCode}`}
                            className="flex items-start justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-700">
                                {segment.flightCode}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {segment.fareLabel}
                              </p>

                              <p className="fs-nums mt-1 text-[11px] text-slate-400">
                                {model.price.passengerCount} ×{" "}
                                {formatMoney(segment.farePriceCents)}
                              </p>
                            </div>

                            <span className="fs-nums shrink-0 font-semibold text-slate-950">
                              {formatMoney(
                                segment.farePriceCents *
                                  model.price.passengerCount
                              )}
                            </span>
                          </div>
                        ))}

                        <div className="border-t border-dashed border-slate-200 pt-4">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-600">
                              Flight subtotal
                            </span>

                            <span className="fs-nums font-medium text-slate-950">
                              {formatMoney(model.price.subtotal)}
                            </span>
                          </div>

                          <div className="mt-3 flex justify-between gap-4">
                            <span className="text-slate-600">
                              Taxes &amp; fees
                            </span>

                            <span className="fs-nums font-medium text-slate-950">
                              {formatMoney(model.price.taxesAndFees)}
                            </span>
                          </div>

                          {seatFeesTotal > 0 ? (
                            <div className="mt-3 flex justify-between gap-4">
                              <span className="text-slate-600">
                                Seat selection
                              </span>

                              <span className="fs-nums font-medium text-slate-950">
                                {formatMoney(seatFeesTotal)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Total stub */}
                    <div className="relative border-t border-dashed border-slate-300 bg-slate-50/60 px-5 py-5 sm:px-6">
                      <PerforationCutouts />

                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Amount due
                          </p>

                          <p className="fs-nums mt-1 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                            {formatMoney(amountDueCents)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Currency
                          </p>

                          <p className="fs-nums mt-1 text-xs font-semibold text-slate-700">
                            USD
                          </p>
                        </div>
                      </div>

                      <div
                        aria-hidden="true"
                        className="mt-5 flex h-7 items-end gap-[2px] opacity-30"
                      >
                        {[
                          14, 22, 11, 25, 17, 8, 24, 13, 20, 10,
                          26, 16, 22, 11, 19, 25, 9, 18,
                        ].map((height, index) => (
                          <span
                            key={index}
                            className="w-px bg-slate-700"
                            style={{ height }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* =============================================
                    PAYMENT
                ============================================= */}
                {canPay ? (
                  <section className="relative isolate min-w-0">
                    <div className="relative overflow-hidden bg-white shadow-[0_7px_24px_rgba(15,23,42,0.05)]">
                      <TicketCorners />

                      <div className="px-5 py-5 sm:px-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                          Next step
                        </p>

                        <h2 className="font-american-sans mt-2 text-xl font-light tracking-[-0.02em] text-slate-950">
                          Ready when you are
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Complete payment to confirm this booking
                          {seatFeesTotal > 0
                            ? ", including selected seat fees"
                            : ""}
                          .
                        </p>

                        <Link
                          href={`/checkout?booking=${encodeURIComponent(
                            booking.bookingReference
                          )}`}
                          className="
                            group
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
                            shadow-[0_4px_14px_rgba(0,120,210,0.18)]
                            transition
                            hover:bg-[#006bbd]
                            hover:shadow-[0_7px_18px_rgba(0,120,210,0.22)]
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#0078D2]/30
                            focus-visible:ring-offset-2
                          "
                          style={{ color: "white" }}
                        >
                          Continue to payment

                          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                            <ArrowRightIcon />
                          </span>
                        </Link>

                   
                      </div>

                      <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-2.5 text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Five Stars • Secure checkout
                        </p>
                      </div>
                    </div>
                  </section>
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