import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PrintableItineraryDocument from "../../../../components/booking/PrintableItineraryDocument";
import PrintItineraryButton from "../../../../components/booking/PrintItineraryButton";
import Footer from "../../../../components/layout/Footer";
import Header from "../../../../components/layout/Header";
import { resolveBookingAccess } from "../../../../lib/booking-access-server";
import { loadBookingLegsWithFlights } from "../../../../lib/booking-segments";
import { buildPrintItineraryViewModel } from "../../../../lib/print-itinerary";
import { db } from "../../../../prisma/db";

type ItineraryPageProps = {
  params: Promise<{ bookingReference: string }>;
};

export async function generateMetadata({
  params,
}: ItineraryPageProps): Promise<Metadata> {
  const { bookingReference: rawReference } = await params;
  const bookingReference = decodeURIComponent(rawReference).trim();

  if (!bookingReference) {
    return { title: "Five Stars - Itinerary" };
  }

  return {
    title: `Five Stars - Itinerary - ${bookingReference}`,
  };
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
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
      "seatNumber"
    )
      .where({ bookingId: booking.id })
      .all(),
    db.orm.public.BookingSegment.select("id", "segmentType", "flightId")
      .where({ bookingId: booking.id })
      .all(),
  ]);

  const tripHref = `/my-trips/${encodeURIComponent(booking.bookingReference)}`;
  const model = buildPrintItineraryViewModel({
    bookingReference: booking.bookingReference,
    status: booking.status,
    createdAt: booking.createdAt,
    subtotal: booking.subtotal,
    taxesAndFees: booking.taxesAndFees,
    total: booking.total,
    seatFeesTotal: booking.seatFeesTotal ?? 0,
    passengerCount: booking.passengerCount,
    legs,
    passengers,
    segments,
    seatAssignments,
  });

  return (
    <>
      <div className="print-hide">
        <Header />
      </div>

      <main className="min-h-screen bg-slate-50 print:min-h-0 print:bg-white">
        <section className="print-itinerary mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:px-0 print:py-0">
          <div className="print-hide mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={tripHref}
                className="text-sm font-medium text-slate-600 transition hover:text-[#0078D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
              >
                ← Back to trip
              </Link>
              <Link
                href="/my-trips"
                className="text-sm font-medium text-slate-600 transition hover:text-[#0078D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
              >
                Back to My Trips
              </Link>
            </div>
            <PrintItineraryButton />
          </div>

          <PrintableItineraryDocument model={model} />
        </section>
      </main>

      <div className="print-hide">
        <Footer />
      </div>
    </>
  );
}
