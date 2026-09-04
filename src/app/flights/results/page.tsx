import Link from "next/link";

import FlightResultCard from "../../../components/flights/FlightResultCard";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { formatAirportRoute } from "../../../data/airports";
import {
  buildModifySearchHref,
  buildOneWayPassengersHref,
  buildRoundTripPassengersHref,
  buildRoundTripResultsHref,
  filterFlightsForLeg,
  formatEmptyFlightSearchMessage,
  formatSearchDate,
  isValidOutboundSelection,
  parsePositiveIntParam,
  parseTripType,
} from "../../../lib/flight-search";
import {
  formatCompositionSummary,
  parsePassengerComposition,
  totalPassengers,
} from "../../../lib/passenger-composition";
import {
  formatDepartureDateShort,
  formatDepartureTime,
  formatRoute,
} from "../../../lib/trip-formatting";
import { db } from "../../../prisma/db";

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
  outboundFlightId?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

function PassengerSummary({
  passengers,
  summary,
}: {
  passengers: number;
  summary: string;
}) {
  return (
    <span className="block sm:inline">
      Passengers:{" "}
      <strong className="font-medium text-slate-900">{passengers}</strong>
      {summary ? (
        <span className="mt-1 block text-slate-600 sm:mt-0 sm:ml-2 sm:inline">
          {summary}
        </span>
      ) : null}
    </span>
  );
}

export default async function FlightResultsPage({ searchParams }: Props) {
  const params = await searchParams;

  const tripType = parseTripType(params.tripType);
  const from = params.from ?? "";
  const to = params.to ?? "";
  const departure = params.departure ?? "";
  const returnDate = params.returnDate ?? "";
  const composition = parsePassengerComposition({
    passengers: params.passengers,
    adults: params.adults,
    seniors: params.seniors,
    children: params.children,
    infants: params.infants,
  });
  const passengers = String(totalPassengers(composition));
  const compositionSummary = formatCompositionSummary(composition);
  const compositionFields = {
    passengers,
    adults: String(composition.adults),
    seniors: String(composition.seniors),
    children: String(composition.children),
    infants: String(composition.infantsInSeat),
    composition,
  };
  const requestedOutboundId = parsePositiveIntParam(params.outboundFlightId);

  const allFlights = await db.orm.public.Flight.all();

  const modifySearchHref = buildModifySearchHref({
    tripType,
    from,
    to,
    departure,
    returnDate,
    ...compositionFields,
  });

  if (tripType === "one-way") {
    const matchingFlights = filterFlightsForLeg(allFlights, {
      from,
      to,
      departure,
      passengers,
      requireSeats: false,
    });

    return (
      <>
        <Header />

        <main className="min-h-screen bg-slate-50">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Flight Results
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {formatAirportRoute(from, to)}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                {departure ? (
                  <span>
                    Departure:{" "}
                    <strong className="font-medium text-slate-900">
                      {formatSearchDate(departure)}
                    </strong>
                  </span>
                ) : null}

                <PassengerSummary
                  passengers={totalPassengers(composition)}
                  summary={compositionSummary}
                />
              </div>

              <Link
                href={modifySearchHref}
                className="mt-6 inline-flex text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                ← Modify search
              </Link>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-950">
                Available flights
              </h2>

              <p className="text-sm text-slate-500">
                {matchingFlights.length}{" "}
                {matchingFlights.length === 1 ? "flight" : "flights"} found
              </p>
            </div>

            {matchingFlights.length > 0 ? (
              <div className="space-y-5">
                {matchingFlights.map((flight) => (
                  <FlightResultCard
                    key={flight.id}
                    flight={flight}
                    selectHref={buildOneWayPassengersHref({
                      flightCode: flight.code,
                      ...compositionFields,
                    })}
                  />
                ))}
              </div>
            ) : (
              <EmptyResults
                from={from}
                to={to}
                departure={departure}
                modifySearchHref={modifySearchHref}
              />
            )}
          </section>
        </main>

        <Footer />
      </>
    );
  }

  const outboundFilter = {
    from,
    to,
    departure,
    passengers,
    requireSeats: true as const,
  };

  const outboundFlights = filterFlightsForLeg(allFlights, outboundFilter);

  const selectedOutboundCandidate =
    requestedOutboundId == null
      ? null
      : (allFlights.find((flight) => flight.id === requestedOutboundId) ?? null);

  const selectedOutbound = isValidOutboundSelection(
    selectedOutboundCandidate,
    outboundFilter
  )
    ? selectedOutboundCandidate
    : null;

  const returnFlights = selectedOutbound
    ? filterFlightsForLeg(allFlights, {
        from: to,
        to: from,
        departure: returnDate,
        passengers,
        requireSeats: true,
      })
    : [];

  const changeOutboundHref = buildRoundTripResultsHref({
    from,
    to,
    departure,
    returnDate,
    ...compositionFields,
  });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Round Trip
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {formatAirportRoute(from, to)}
            </h1>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {departure ? (
                <span>
                  Outbound:{" "}
                  <strong className="font-medium text-slate-900">
                    {formatSearchDate(departure)}
                  </strong>
                </span>
              ) : null}
              {returnDate ? (
                <span>
                  Return:{" "}
                  <strong className="font-medium text-slate-900">
                    {formatSearchDate(returnDate)}
                  </strong>
                </span>
              ) : null}
              <PassengerSummary
                passengers={totalPassengers(composition)}
                summary={compositionSummary}
              />
            </div>

            <Link
              href={modifySearchHref}
              className="mt-6 inline-flex text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ← Modify search
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 space-y-10">
          {!selectedOutbound ? (
            <div>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Step 1
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Choose your outbound flight
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {formatRoute(from || "—", to || "—")}
                  {departure ? ` · ${formatSearchDate(departure)}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {outboundFlights.length}{" "}
                  {outboundFlights.length === 1 ? "flight" : "flights"} found
                </p>
              </div>

              {outboundFlights.length > 0 ? (
                <div className="space-y-5">
                  {outboundFlights.map((flight) => (
                    <FlightResultCard
                      key={flight.id}
                      flight={flight}
                      selectLabel="Select outbound"
                      selectHref={buildRoundTripResultsHref({
                        from,
                        to,
                        departure,
                        returnDate,
                        outboundFlightId: flight.id,
                        ...compositionFields,
                      })}
                    />
                  ))}
                </div>
              ) : (
                <EmptyResults
                  from={from}
                  to={to}
                  departure={departure}
                  modifySearchHref={modifySearchHref}
                />
              )}
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                      Selected outbound
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {formatRoute(
                        selectedOutbound.originCode,
                        selectedOutbound.destinationCode
                      )}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedOutbound.code} ·{" "}
                      {formatDepartureDateShort(selectedOutbound)} ·{" "}
                      {formatDepartureTime(selectedOutbound)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedOutbound.origin} → {selectedOutbound.destination}
                    </p>
                  </div>

                  <Link
                    href={changeOutboundHref}
                    className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    Change outbound
                  </Link>
                </div>
              </div>

              <div>
                <div className="mb-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    Step 2
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Choose your return flight
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatRoute(to || "—", from || "—")}
                    {returnDate ? ` · ${formatSearchDate(returnDate)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {returnFlights.length}{" "}
                    {returnFlights.length === 1 ? "flight" : "flights"} found
                  </p>
                </div>

                {returnFlights.length > 0 ? (
                  <div className="space-y-5">
                    {returnFlights.map((flight) => (
                      <FlightResultCard
                        key={flight.id}
                        flight={flight}
                        selectLabel="Select return"
                        selectHref={buildRoundTripPassengersHref({
                          outboundFlightId: selectedOutbound.id,
                          returnFlightId: flight.id,
                          ...compositionFields,
                        })}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyResults
                    from={to}
                    to={from}
                    departure={returnDate}
                    modifySearchHref={modifySearchHref}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

function EmptyResults({
  from,
  to,
  departure,
  modifySearchHref,
}: {
  from: string;
  to: string;
  departure: string;
  modifySearchHref: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
      <h2 className="text-2xl font-semibold text-slate-950">No flights found</h2>

      <p className="mt-3 text-slate-600">
        {formatEmptyFlightSearchMessage({ from, to, departure })}
      </p>

      <p className="mt-2 text-slate-600">Try another date or route.</p>

      <Link
        href={modifySearchHref}
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        Modify search
      </Link>
    </div>
  );
}
