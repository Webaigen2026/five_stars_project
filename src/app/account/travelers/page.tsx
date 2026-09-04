import Link from "next/link";

import TravelersManager from "../../../components/account/travelers/TravelersManager";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { requireUser } from "../../../lib/authorization";
import { listTravelersForUser } from "../../../lib/travelers";

export default async function AccountTravelersPage() {
  const currentUser = await requireUser();
  const travelers = await listTravelersForUser(currentUser.id);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Account
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Saved travelers
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Keep traveler details on file so you don&apos;t have to retype
              them for every booking.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Your primary traveler is used for the &quot;Myself&quot; option
              during booking.
            </p>
            <p className="mt-6">
              <Link
                href="/account"
                className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                ← Back to account
              </Link>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <TravelersManager travelers={travelers} />
        </section>
      </main>

      <Footer />
    </>
  );
}
