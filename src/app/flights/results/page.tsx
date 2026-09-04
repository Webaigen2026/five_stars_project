import Link from "next/link";

import FlightResultsBoard, {
  type BoardAlternateGroup,
  type BoardFlight,
} from "../../../components/flights/FlightResultsBoard";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { formatAirportRoute } from "../../../data/airports";
import {
  buildModifySearchHref,
  buildRoundTripResultsHref,
  formatAroundDateEmptyMessage,
  formatEmptyFlightSearchMessage,
  formatSearchDate,
  isReturnSearchDateValidForOutbound,
  isValidOutboundSelection,
  partitionFlightsForDiscovery,
  partitionReturnFlightsForDiscovery,
  parsePositiveIntParam,
  parseTripType,
  type AlternateFlightDateGroup,
  type SearchableFlight,
} from "../../../lib/flight-search";
import { parseFareFamily } from "../../../lib/fare-families";
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
  outboundFareFamily?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

type DbFlight = SearchableFlight & {
  airline: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
};

function toBoardFlight(flight: DbFlight): BoardFlight {
  return {
    id: flight.id,
    code: flight.code,
    airline: flight.airline,
    origin: flight.origin,
    originCode: flight.originCode,
    destination: flight.destination,
    destinationCode: flight.destinationCode,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    durationMinutes: flight.durationMinutes,
    price: flight.price,
    availableSeats: flight.availableSeats,
    stops: 0,
  };
}

function toBoardGroups(
  groups: AlternateFlightDateGroup<DbFlight>[]
): BoardAlternateGroup[] {
  return groups.map((group) => ({
    date: group.date,
    flights: group.flights.map(toBoardFlight),
  }));
}

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
  const outboundFareFamily =
    parseFareFamily(params.outboundFareFamily) ?? "BASIC";

  const allFlights = (await db.orm.public.Flight.all()) as DbFlight[];

  const modifySearchHref = buildModifySearchHref({
    tripType,
    from,
    to,
    departure,
    returnDate,
    ...compositionFields,
  });

  if (tripType === "one-way") {
    const discovery = partitionFlightsForDiscovery(allFlights, {
      from,
      to,
      departure,
      passengers,
      requireSeats: true,
    });
    const hasExact = discovery.exactDateFlights.length > 0;
    const hasAlternates = discovery.alternateGroups.length > 0;

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
            {!hasExact && !hasAlternates ? (
              <EmptyResults
                from={from}
                to={to}
                departure={departure}
                modifySearchHref={modifySearchHref}
                aroundDate
              />
            ) : (
              <FlightResultsBoard
                filterScopeKey="one-way"
                requestedDate={departure}
                headingMode="available"
                fareContinue={{
                  mode: "one-way",
                  passengers: compositionFields.passengers,
                  adults: compositionFields.adults,
                  seniors: compositionFields.seniors,
                  children: compositionFields.children,
                  infants: compositionFields.infants,
                  passengerCount: totalPassengers(composition),
                }}
                exactFlights={discovery.exactDateFlights.map(toBoardFlight)}
                alternateGroups={toBoardGroups(discovery.alternateGroups)}
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

  const outboundDiscovery = partitionFlightsForDiscovery(
    allFlights,
    outboundFilter
  );

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

  const returnDateValidForOutbound =
    selectedOutbound != null &&
    Boolean(returnDate) &&
    isReturnSearchDateValidForOutbound(selectedOutbound, returnDate);

  const returnDiscovery =
    selectedOutbound && returnDateValidForOutbound
      ? partitionReturnFlightsForDiscovery(allFlights, selectedOutbound, {
          from: to,
          to: from,
          departure: returnDate,
          passengers,
          requireSeats: true,
        })
      : {
          exactDateFlights: [] as DbFlight[],
          alternateFlights: [] as DbFlight[],
          alternateGroups: [] as AlternateFlightDateGroup<DbFlight>[],
        };

  const changeOutboundHref = buildRoundTripResultsHref({
    from,
    to,
    departure,
    returnDate,
    ...compositionFields,
  });

  const hasOutboundExact = outboundDiscovery.exactDateFlights.length > 0;
  const hasOutboundAlternates =
    outboundDiscovery.alternateGroups.length > 0;
  const hasReturnExact = returnDiscovery.exactDateFlights.length > 0;
  const hasReturnAlternates = returnDiscovery.alternateGroups.length > 0;

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
              </div>

              {!hasOutboundExact && !hasOutboundAlternates ? (
                <EmptyResults
                  from={from}
                  to={to}
                  departure={departure}
                  modifySearchHref={modifySearchHref}
                  aroundDate
                />
              ) : (
                <FlightResultsBoard
                  filterScopeKey="round-trip-outbound"
                  requestedDate={departure}
                  headingMode="step"
                  selectLabel="Select outbound"
                  fareContinue={{
                    mode: "round-trip-outbound",
                    passengers: compositionFields.passengers,
                    adults: compositionFields.adults,
                    seniors: compositionFields.seniors,
                    children: compositionFields.children,
                    infants: compositionFields.infants,
                    from,
                    to,
                    departure,
                    returnDate,
                    passengerCount: totalPassengers(composition),
                  }}
                  exactFlights={outboundDiscovery.exactDateFlights.map(
                    toBoardFlight
                  )}
                  alternateGroups={toBoardGroups(
                    outboundDiscovery.alternateGroups
                  )}
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
                </div>

                {!returnDateValidForOutbound ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-8">
                    <h3 className="text-xl font-semibold text-slate-950">
                      Return date is no longer valid
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      Your selected outbound departs on{" "}
                      <strong className="font-medium text-slate-900">
                        {formatDepartureDateShort(selectedOutbound)}
                      </strong>
                      , which is after the requested return of{" "}
                      <strong className="font-medium text-slate-900">
                        {formatSearchDate(returnDate)}
                      </strong>
                      . Choose a different outbound, or modify your search with
                      a later return date.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={changeOutboundHref}
                        className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        Change outbound
                      </Link>
                      <Link
                        href={modifySearchHref}
                        className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        Modify search
                      </Link>
                    </div>
                  </div>
                ) : !hasReturnExact && !hasReturnAlternates ? (
                  <EmptyResults
                    from={to}
                    to={from}
                    departure={returnDate}
                    modifySearchHref={modifySearchHref}
                    aroundDate
                  />
                ) : (
                  <FlightResultsBoard
                    filterScopeKey={`round-trip-return-${selectedOutbound.id}`}
                    requestedDate={returnDate}
                    headingMode="step"
                    selectLabel="Select return"
                    fareContinue={{
                      mode: "round-trip-return",
                      passengers: compositionFields.passengers,
                      adults: compositionFields.adults,
                      seniors: compositionFields.seniors,
                      children: compositionFields.children,
                      infants: compositionFields.infants,
                      from,
                      to,
                      departure,
                      returnDate,
                      outboundFlightId: selectedOutbound.id,
                      outboundFareFamily,
                      passengerCount: totalPassengers(composition),
                    }}
                    exactFlights={returnDiscovery.exactDateFlights.map(
                      toBoardFlight
                    )}
                    alternateGroups={toBoardGroups(
                      returnDiscovery.alternateGroups
                    )}
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
  aroundDate = false,
}: {
  from: string;
  to: string;
  departure: string;
  modifySearchHref: string;
  aroundDate?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
      <h2 className="text-2xl font-semibold text-slate-950">No flights found</h2>

      <p className="mt-3 text-slate-600">
        {aroundDate
          ? formatAroundDateEmptyMessage({ from, to })
          : formatEmptyFlightSearchMessage({ from, to, departure })}
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
