import FindTripContent from "../../components/auth/FindTripContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

export default function FindTripPage() {
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
              Find your trip
            </h1>

            <p className="mt-2 max-w-[620px] text-[13px] leading-[21px] text-slate-600">
              Retrieve your reservation using your booking reference and the
              email address used when the trip was booked.
            </p>
          </div>
        </section>

        {/* Reservation lookup */}
        <section className="bg-white">
          <div className="mx-auto max-w-[720px] px-6 py-8 sm:px-8 lg:py-9">
            <FindTripContent />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}