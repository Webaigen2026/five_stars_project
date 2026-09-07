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

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 -top-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />
    </>
  );
}

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
    <section
      className="space-y-5"
      aria-labelledby={`${id}-heading`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
            Five Stars
          </p>

          <h2
            id={`${id}-heading`}
            className="
              font-american-sans
              mt-1.5
              text-2xl
              font-light
              tracking-[-0.025em]
              text-slate-950
              sm:text-[1.8rem]
            "
          >
            {title}
          </h2>

          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        <span className="text-xs font-medium text-slate-400">
          {items.length === 1
            ? "1 booking"
            : `${items.length} bookings`}
        </span>
      </div>

      <div className="space-y-5">
        {items.map((trip) => (
          <MyTripCard
            key={trip.bookingId}
            trip={trip}
          />
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
        {/* Page header */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14 xl:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
              My Trips
            </p>

            <h1
              className="
                font-american-sans
                mt-3
                text-4xl
                font-light
                leading-[1.05]
                tracking-[-0.03em]
                text-slate-950
                sm:text-5xl
              "
            >
              Your journeys
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Review upcoming trips, complete bookings that still need action,
              and access your past Five Stars journeys.
            </p>
          </div>
        </section>

        {/* Trips */}
        <section className="mx-auto w-full max-w-[1540px] space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-10">
          {loadFailed ? (
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
                  We couldn&apos;t load your trips
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                  Please try again in a moment, or search for a new Five Stars
                  flight.
                </p>

                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/my-trips"
                    className="
                      inline-flex
                      min-h-11
                      items-center
                      justify-center
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
                    Retry
                  </Link>

                  <Link
                    href="/flights"
                    className="
                      inline-flex
                      min-h-11
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
                    Book a flight
                    <ArrowRightIcon />
                  </Link>
                </div>

                <div className="mt-8 border-t border-dashed border-slate-300 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Five Stars • My Trips
                  </p>
                </div>
              </div>
            </section>
          ) : cards.length === 0 ? (
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
                  Journey ticket
                </p>

                <h2 className="font-american-sans mt-3 text-3xl font-light tracking-[-0.03em] text-slate-950">
                  No trips yet
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                  When you book a Five Stars flight, your itinerary will appear
                  here.
                </p>

                <Link
                  href="/flights"
                  className="
                    mt-6
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
                  Book a flight
                  <ArrowRightIcon />
                </Link>

                <div className="mt-8 border-t border-dashed border-slate-300 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Five Stars • My Trips
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              <TripSection
                id="action-needed"
                title="Draft / Action needed"
                description="Bookings that still need payment or another step to complete."
                items={grouped.actionNeeded}
              />

              <TripSection
                id="upcoming"
                title="Upcoming"
                description="Your confirmed and upcoming Five Stars journeys."
                items={grouped.upcoming}
              />

              <TripSection
                id="past"
                title="Past"
                description="Previous Five Stars journeys and completed bookings."
                items={grouped.past}
              />
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}