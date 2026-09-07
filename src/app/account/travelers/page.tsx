import Link from "next/link";

import TravelersManager from "../../../components/account/travelers/TravelersManager";

import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

import { requireUser } from "../../../lib/authorization";
import { listTravelersForUser } from "../../../lib/travelers";

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export default async function AccountTravelersPage() {
  const currentUser = await requireUser();

  const travelers = await listTravelersForUser(currentUser.id);

  const travelerCountLabel =
    travelers.length === 1
      ? "1 traveler on file"
      : `${travelers.length} travelers on file`;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        {/* Page header */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14 xl:px-10">
            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              {/* Main heading */}
              <div className="min-w-0">
                <Link
                  href="/account"
                  className="
                    group
                    inline-flex
                    items-center
                    gap-2
                    text-sm
                    font-semibold
                    text-slate-500
                    transition
                    hover:text-[#0078D2]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                    focus-visible:ring-offset-4
                  "
                >
                  <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                    <ArrowLeftIcon />
                  </span>

                  Back to account
                </Link>

                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
                  Account
                </p>

                <h1
                  className="
                    font-american-sans
                    mt-3
                    max-w-4xl
                    text-4xl
                    font-light
                    leading-[1.05]
                    tracking-[-0.03em]
                    text-slate-950
                    sm:text-5xl
                  "
                >
                  Saved travelers
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Keep traveler details on file so you don&apos;t have to
                  retype them for every booking.
                </p>
              </div>

              {/* Summary ticket */}
              <aside
                className="
                  relative
                  overflow-hidden
                  bg-slate-50
                  px-5
                  py-5
                  ring-1
                  ring-slate-200
                  sm:px-6
                "
              >
                {/* Ticket-style cutouts */}
                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -left-3
                    top-1/2
                    h-6
                    w-6
                    -translate-y-1/2
                    rounded-full
                    bg-white
                    ring-1
                    ring-slate-200
                  "
                />

                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -right-3
                    top-1/2
                    h-6
                    w-6
                    -translate-y-1/2
                    rounded-full
                    bg-white
                    ring-1
                    ring-slate-200
                  "
                />

                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0078D2]">
                  Traveler profiles
                </p>

                <p
                  className="
                    font-american-sans
                    mt-2
                    text-2xl
                    font-light
                    tracking-[-0.025em]
                    text-slate-950
                  "
                >
                  {travelerCountLabel}
                </p>

                <div className="mt-4 border-t border-dashed border-slate-300 pt-4">
                  <p className="text-xs leading-5 text-slate-500">
                    Your primary traveler is used for the &quot;Myself&quot;
                    option during booking.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Traveler manager */}
        <section className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-10">
          <div className="min-w-0">
            <TravelersManager travelers={travelers} />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}