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

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Flights
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Search available flights
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Find available routes between Haiti and the United States.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
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
        </section>
      </main>

      <Footer />
    </>
  );
}