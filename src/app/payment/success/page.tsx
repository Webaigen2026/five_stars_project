import Link from "next/link";

import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

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
              We're confirming your payment.
            </h1>

            <p className="mt-4 text-slate-600">
              Payment confirmation is finalized by Stripe securely. This page
              does not mean the booking has been paid yet.
            </p>

            {sessionId ? (
              <p className="mt-4 text-sm text-slate-500">
                Checkout reference: {sessionId}
              </p>
            ) : null}

            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
            >
              Go to dashboard
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
