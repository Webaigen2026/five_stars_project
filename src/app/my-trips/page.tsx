import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../prisma/db";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export default async function MyTripsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const bookings = await db.orm.public.Booking.where({
    userId: user.id,
  }).all();

  const trips = await Promise.all(
    bookings.map(async (booking) => {
      const flight = await db.orm.public.Flight.where({
        id: booking.flightId,
      }).first();

      return {
        booking,
        flight,
      };
    })
  );

  trips.sort(
    (left, right) =>
      new Date(right.booking.createdAt).getTime() -
      new Date(left.booking.createdAt).getTime()
  );

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              My Trips
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Your bookings
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Review saved flight bookings and continue to checkout.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          {trips.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">
                No trips yet
              </h2>

              <p className="mt-3 text-slate-600">
                When you book a flight while signed in, it will appear here.
              </p>

              <Link
                href="/flights"
                className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
              >
                Search Flights
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {trips.map(({ booking, flight }) => (
                <article
                  key={booking.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                        {booking.bookingReference}
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                        {flight
                          ? `${flight.origin} → ${flight.destination}`
                          : "Flight details unavailable"}
                      </h2>

                      {flight && (
                        <p className="mt-2 text-sm text-slate-600">
                          {flight.code} · Departs{" "}
                          {formatTime(flight.departureTime)}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-primary">
                      {booking.status}
                    </span>
                  </div>

                  <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-slate-500">Passengers</dt>
                      <dd className="mt-1 font-medium text-slate-950">
                        {booking.passengerCount}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Subtotal</dt>
                      <dd className="mt-1 font-medium text-slate-950">
                        {formatMoney(booking.subtotal)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Taxes & fees</dt>
                      <dd className="mt-1 font-medium text-slate-950">
                        {formatMoney(booking.taxesAndFees)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Total</dt>
                      <dd className="mt-1 font-medium text-slate-950">
                        {formatMoney(booking.total)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500">
                      Created {formatDateTime(booking.createdAt)}
                    </p>

                    <Link
                      href={`/checkout?booking=${encodeURIComponent(booking.bookingReference)}`}
                      className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      View booking
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
