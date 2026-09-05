import Link from "next/link";

import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import PaymentProcessingPoller from "../../../components/booking/PaymentProcessingPoller";
import { getCurrentUser } from "../../../lib/auth";
import { db } from "../../../prisma/db";

type SearchParams = Promise<{
  session_id?: string;
}>;

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionId = params.session_id?.trim() ?? "";
  const currentUser = await getCurrentUser();

  let paid = false;
  let processing = Boolean(sessionId);
  let tripHref = "/my-trips";
  let bookingReference: string | null = null;

  if (sessionId) {
    const payment = await db.orm.public.Payment.where({
      stripeCheckoutId: sessionId,
    }).first();

    if (payment) {
      const booking = await db.orm.public.Booking.where({
        id: payment.bookingId,
      }).first();

      if (
        booking &&
        (booking.userId == null ||
          currentUser == null ||
          booking.userId === currentUser.id)
      ) {
        bookingReference = booking.bookingReference;
        tripHref =
          booking.userId == null
            ? `/booking/confirmation/${encodeURIComponent(booking.bookingReference)}`
            : `/my-trips/${encodeURIComponent(booking.bookingReference)}`;
        paid =
          booking.status === "PAID" || payment.status === "SUCCEEDED";
        processing = !paid;
      }
    }
  }

  return (
    <>
      <Header />
      <PaymentProcessingPoller active={processing} />

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Payment
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {paid ? "Payment received" : "Payment processing"}
            </h1>

            <p className="mt-4 text-slate-600">
              {paid
                ? "Stripe confirmed your payment. Your trip is updated."
                : processing
                  ? "We're waiting for Stripe to confirm payment. This page is not payment authority — status updates automatically for a short time, or refresh if it is still pending."
                  : "We could not match this checkout session yet. Check My Trips for the latest status."}
            </p>

            {bookingReference ? (
              <p className="mt-4 text-sm text-slate-500">
                Booking {bookingReference}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={tripHref}
                className="inline-flex justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
              >
                View trip
              </Link>
              <Link
                href="/my-trips"
                className="inline-flex justify-center rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                My Trips
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
