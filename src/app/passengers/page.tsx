import { Suspense } from "react";

import PassengersContent from "../../components/booking/PassengersContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

function PassengersFallback() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Passenger Details
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Who is traveling?
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Loading passenger details...
          </p>
        </div>
      </section>
    </>
  );
}

export default function PassengersPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <Suspense fallback={<PassengersFallback />}>
          <PassengersContent />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
