import { Suspense } from "react";

import FindTripVerifyContent from "../../../components/auth/FindTripVerifyContent";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

function VerifyFallback() {
  return (
    <div className="mx-auto w-full max-w-[620px]">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-slate-950">
          Verify your email
        </h2>

        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Loading verification...
        </p>
      </div>
    </div>
  );
}

export default function FindTripVerifyPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-white">
        {/* Page introduction */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-10 sm:px-8 lg:px-10 lg:py-11">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0078D2]">
              Manage booking
            </p>

            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.025em] text-slate-950 sm:text-[30px]">
              Verify your trip
            </h1>

            <p className="mt-2 max-w-[620px] text-[13px] leading-[21px] text-slate-600">
              Confirm your email address to securely access your reservation.
            </p>
          </div>
        </section>

        {/* Verification */}
        <section className="bg-white">
          <div className="mx-auto max-w-[720px] px-6 py-8 sm:px-8 lg:py-9">
            <Suspense fallback={<VerifyFallback />}>
              <FindTripVerifyContent />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}