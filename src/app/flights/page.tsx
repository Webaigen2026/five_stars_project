import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import FlightSearchForm from "../../components/flights/FlightSearchForm";

type SearchParams = Promise<{
  tripType?: string;
  from?: string;
  to?: string;
  departure?: string;
  returnDate?: string;
  passengers?: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
}>;

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-white">
        {/* Page introduction */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-10 sm:px-8 lg:px-10 lg:py-11">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0078D2]">
              Flights
            </p>

            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.025em] text-slate-950 sm:text-[30px]">
              Search available flights
            </h1>

            <p className="mt-2 max-w-[620px] text-[13px] leading-[21px] text-slate-600">
              Find available routes between Haiti and the United States.
            </p>
          </div>
        </section>

        {/* Flight search */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-8 sm:px-8 lg:px-10 lg:py-9">
            <FlightSearchForm
              initialTripType={params.tripType}
              initialFrom={params.from}
              initialTo={params.to}
              initialDeparture={params.departure}
              initialReturnDate={params.returnDate}
              initialPassengers={params.passengers}
              initialAdults={params.adults}
              initialSeniors={params.seniors}
              initialChildren={params.children}
              initialInfants={params.infants}
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}