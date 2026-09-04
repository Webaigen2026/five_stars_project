import Link from "next/link";
import { redirect } from "next/navigation";

import MyTripCard from "../../components/booking/MyTripCard";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";
import { loadBookingLegsWithFlights } from "../../lib/booking-segments";
import {
  buildMyTripCardViewModel,
  groupMyTripCards,
  type MyTripCardViewModel,
} from "../../lib/my-trips";
import { db } from "../../prisma/db";

function TripSection({
  id,
  title,
  description,
  items,
}: {
  id: string;
  title: string;
  description?: string;
  items: MyTripCardViewModel[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5" aria-labelledby={`${id}-heading`}>
      <div>
        <h2
          id={`${id}-heading`}
          className="text-2xl font-semibold text-slate-950"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="space-y-5">
        {items.map((trip) => (
          <MyTripCard key={trip.bookingId} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default async function MyTripsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let cards: MyTripCardViewModel[] = [];
  let loadFailed = false;

  try {
    const bookings = await db.orm.public.Booking.where({
      userId: user.id,
    }).all();

    cards = await Promise.all(
      bookings.map(async (booking) => {
        const [legs, passengers] = await Promise.all([
          loadBookingLegsWithFlights(booking),
          db.orm.public.Passenger.select("id")
            .where({ bookingId: booking.id })
            .all(),
        ]);

        return buildMyTripCardViewModel({
          booking: {
            id: booking.id,
            bookingReference: booking.bookingReference,
            status: booking.status,
            passengerCount: booking.passengerCount,
            total: booking.total,
            createdAt: booking.createdAt,
          },
          legs,
          travelerCount: passengers.length,
        });
      })
    );
  } catch (error) {
    console.error("Failed to load My Trips:", error);
    loadFailed = true;
  }

  const grouped = groupMyTripCards(cards);

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
              Your journeys
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Manage upcoming and past Five Stars bookings.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-10 px-6 py-12">
          {loadFailed ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">
                We couldn&apos;t load your trips.
              </h2>
              <p className="mt-3 text-slate-600">
                Please try again in a moment, or book a new flight.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/my-trips"
                  className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Retry
                </Link>
                <Link
                  href="/flights"
                  className="inline-flex rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Book a flight
                </Link>
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">
                No trips yet
              </h2>
              <p className="mt-3 text-slate-600">
                When you book a Five Stars flight, it will appear here.
              </p>
              <Link
                href="/flights"
                className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Book a flight
              </Link>
            </div>
          ) : (
            <>
              <TripSection
                id="action-needed"
                title="Draft / Action needed"
                description="Bookings that still need payment to complete."
                items={grouped.actionNeeded}
              />
              <TripSection
                id="upcoming"
                title="Upcoming"
                items={grouped.upcoming}
              />
              <TripSection id="past" title="Past" items={grouped.past} />
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
