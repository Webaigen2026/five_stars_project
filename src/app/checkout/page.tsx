import Link from "next/link";

import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import CheckoutPaymentButton from "../../components/booking/CheckoutPaymentButton";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";
import { getBookingStatusPresentation } from "../../lib/booking-status";
import { isPayableBookingStatus } from "../../lib/payments";
import { db } from "../../prisma/db";

type SearchParams = Promise<{
  booking?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

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

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function CheckoutError({
  title,
  message,
}: {
  title: string;
  message: string;
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

            <Link
              href="/flights"
              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
            >
              Search Flights
            </Link>
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

  if (!bookingReference) {
    return (
      <CheckoutError
        title="Booking reference missing"
        message="We could not find a booking reference for this checkout. Search for a flight to start a new booking."
      />
    );
  }

  const booking = await db.orm.public.Booking.where({
    bookingReference,
  }).first();

  if (!booking) {
    return (
      <CheckoutError
        title="Booking not found"
        message="We could not find a booking with that reference."
      />
    );
  }

  const flight = await db.orm.public.Flight.where({
    id: booking.flightId,
  }).first();

  if (!flight) {
    return (
      <CheckoutError
        title="Flight not found"
        message="We could not find the flight for this booking."
      />
    );
  }

  const passengerCount = booking.passengerCount;
  const subtotal = booking.subtotal;
  const taxesAndFees = booking.taxesAndFees;
  const total = booking.total;
  const fareEach =
    passengerCount > 0 ? Math.round(subtotal / passengerCount) : 0;
  const bookingStatus = getBookingStatusPresentation(booking.status);
  const currentUser = await getCurrentUser();
  const isOwnerCustomer =
    currentUser?.role === "CUSTOMER" && currentUser.id === booking.userId;

  let paymentAction: "signin" | "hidden" | "ineligible" | "ready";

  if (!currentUser || booking.userId == null) {
    paymentAction = "signin";
  } else if (!isOwnerCustomer) {
    paymentAction = "hidden";
  } else if (!isPayableBookingStatus(booking.status)) {
    paymentAction = "ineligible";
  } else {
    paymentAction = "ready";
  }

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

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Review your flight and pricing details before
              continuing to payment. Seats are subject to
              availability until payment is confirmed.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600">
                Booking{" "}
                <span className="font-semibold text-slate-950">
                  {booking.bookingReference}
                </span>
              </p>
              <BookingStatusBadge status={booking.status} />
              <p className="text-sm text-slate-600">
                {bookingStatus.description}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                      Selected Flight
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {flight.origin} → {flight.destination}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      {flight.airline}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Booking{" "}
                      <span className="font-semibold text-slate-950">
                        {booking.bookingReference}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-primary">
                    {flight.code}
                  </div>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <p className="text-3xl font-semibold text-slate-950">
                      {formatTime(
                        flight.departureTime
                      )}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {flight.originCode}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {flight.origin}
                    </p>
                  </div>

                  <div className="hidden min-w-40 text-center sm:block">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      {formatDuration(
                        flight.durationMinutes
                      )}
                    </p>

                    <div className="my-2 h-px bg-slate-300" />

                    <p className="text-xs text-slate-500">
                      Nonstop
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-3xl font-semibold text-slate-950">
                      {formatTime(
                        flight.arrivalTime
                      )}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {flight.destinationCode}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {flight.destination}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">
                  Passenger information
                </h2>

                <p className="mt-2 text-slate-600">
                  You are booking for{" "}
                  <span className="font-semibold text-slate-950">
                    {passengerCount}
                  </span>{" "}
                  {passengerCount === 1
                    ? "passenger"
                    : "passengers"}.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-700">
                  Passenger details saved
                </p>
              </div>
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
                      {formatMoney(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      Taxes & fees
                    </span>

                    <span className="font-medium text-slate-950">
                      {formatMoney(taxesAndFees)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-end justify-between gap-4">
                      <span className="font-semibold text-slate-950">
                        Total
                      </span>

                      <span className="text-3xl font-semibold tracking-tight text-slate-950">
                        {formatMoney(total)}
                      </span>
                    </div>

                    <p className="mt-2 text-right text-xs text-slate-500">
                      USD
                    </p>
                  </div>
                </div>

                {paymentAction === "ready" ? (
                  <CheckoutPaymentButton
                    bookingReference={booking.bookingReference}
                  />
                ) : paymentAction === "signin" ? (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-600">
                      Sign in is required before payment.
                    </p>
                    <Link
                      href="/login"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
                    >
                      Sign in to pay
                    </Link>
                  </div>
                ) : paymentAction === "ineligible" ? (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-600">
                      This booking is not eligible for payment.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-3 w-full cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 font-semibold text-slate-500"
                    >
                      Continue to Payment
                    </button>
                  </div>
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
