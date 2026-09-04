import Link from "next/link";

import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

type SearchParams = Promise<{
  booking?: string;
}>;

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const bookingReference = params.booking?.trim() ?? "";
  const tripHref = bookingReference
    ? `/my-trips/${encodeURIComponent(bookingReference)}`
    : "/my-trips";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Payment
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Payment was not completed.
            </h1>

            <p className="mt-4 text-slate-600">
              No charge was finalized from this page. If a Checkout Session is
              still open, seats may remain held until the session expires.
              Inventory is released by Stripe expiration webhooks — not by
              visiting this cancel page.
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
                Back to trip
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
