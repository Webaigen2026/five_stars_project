import Link from "next/link";
import { redirect } from "next/navigation";

import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";
import {
  formatMoney,
  formatRoute,
  formatDepartureDateShort,
  isUpcomingTrip,
} from "../../lib/trip-formatting";
import { db } from "../../prisma/db";

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
      const flight = await db.orm.public.Flight.select(
        "id",
        "code",
        "origin",
        "originCode",
        "destination",
        "destinationCode",
        "departureTime"
      )
        .where({
          id: booking.flightId,
        })
        .first();

      return {
        booking,
        flight,
      };
    })
  );

  trips.sort((left, right) => {
    const leftDeparture = left.flight?.departureTime ?? left.booking.createdAt;
    const rightDeparture =
      right.flight?.departureTime ?? right.booking.createdAt;

    return new Date(rightDeparture).getTime() - new Date(leftDeparture).getTime();
  });

  const upcoming = trips.filter(({ booking, flight }) =>
    isUpcomingTrip({
      status: booking.status,
      departureTime: flight?.departureTime,
    })
  );
  const past = trips.filter(
    ({ booking, flight }) =>
      !isUpcomingTrip({
        status: booking.status,
        departureTime: flight?.departureTime,
      })
  );

  function TripList({
    title,
    items,
  }: {
    title: string;
    items: typeof trips;
  }) {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        {items.map(({ booking, flight }) => (
          <article
            key={booking.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {flight ? (
                  <>
                    <h3 className="text-3xl font-semibold tracking-tight text-slate-950">
                      {formatRoute(flight.originCode, flight.destinationCode)}
                    </h3>
                    <p className="mt-2 break-words text-sm text-slate-600">
                      {flight.origin} → {flight.destination}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDepartureDateShort(flight)} ·{" "}
                      {flight.code}
                    </p>
                  </>
                ) : (
                  <h3 className="text-2xl font-semibold text-slate-950">
                    Flight details unavailable
                  </h3>
                )}
              </div>

              <BookingStatusBadge status={booking.status} />
            </div>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-slate-500">Booking reference</dt>
                <dd className="mt-1 break-all font-semibold text-slate-950">
                  {booking.bookingReference}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Passengers</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {booking.passengerCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Total</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {formatMoney(booking.total)}
                </dd>
              </div>
              <div className="flex items-end">
                <Link
                  href={`/my-trips/${encodeURIComponent(booking.bookingReference)}`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-auto"
                >
                  View trip
                </Link>
              </div>
            </dl>
          </article>
        ))}
      </section>
    );
  }

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
              Review saved flight bookings and open a trip for itinerary
              details.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-10 px-6 py-12">
          {trips.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">
                No trips yet.
              </h2>

              <p className="mt-3 text-slate-600">
                Search for a flight and create your first StarJet booking.
              </p>

              <Link
                href="/flights"
                className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Find a flight
              </Link>
            </div>
          ) : (
            <>
              <TripList title="Upcoming trips" items={upcoming} />
              <TripList title="Past trips" items={past} />
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
