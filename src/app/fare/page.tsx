import Link from "next/link";

import FareOptionCard from "../../components/flights/FareOptionCard";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { formatAirportRoute } from "../../data/airports";
import {
  listFareFamilyOptions,
  type FareFamily,
} from "../../lib/fare-families";
import {
  buildOneWayPassengersHref,
  buildRoundTripPassengersHref,
  buildRoundTripResultsHref,
  formatSearchDate,
  parsePositiveIntParam,
  parseTripType,
} from "../../lib/flight-search";
import {
  formatCompositionSummary,
  parsePassengerComposition,
  totalPassengers,
} from "../../lib/passenger-composition";
import {
  formatArrivalTime,
  formatDepartureDateShort,
  formatDepartureTime,
} from "../../lib/trip-formatting";
import { db } from "../../prisma/db";

type SearchParams = Promise<{
  tripType?: string;
  leg?: string;
  flight?: string;
  flightId?: string;
  outboundFlightId?: string;
  outboundFareFamily?: string;
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

type Props = {
  searchParams: SearchParams;
};

function FareMissing() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-950">
            Flight not found
          </h1>
          <p className="mt-3 text-slate-600">
            We could not load the selected flight for fare selection.
          </p>
          <Link
            href="/flights"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Back to search
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default async function FareSelectionPage({ searchParams }: Props) {
  const params = await searchParams;
  const tripType = parseTripType(params.tripType);
  const leg = params.leg === "return" ? "return" : "outbound";
  const composition = parsePassengerComposition({
    passengers: params.passengers,
    adults: params.adults,
    seniors: params.seniors,
    children: params.children,
    infants: params.infants,
  });
  const compositionFields = {
    passengers: String(totalPassengers(composition)),
    adults: String(composition.adults),
    seniors: String(composition.seniors),
    children: String(composition.children),
    infants: String(composition.infantsInSeat),
    composition,
  };
  const compositionSummary = formatCompositionSummary(composition);

  let flight =
    params.flight != null && params.flight.trim()
      ? await db.orm.public.Flight.where({ code: params.flight.trim() }).first()
      : null;

  const flightId = parsePositiveIntParam(params.flightId);
  if (!flight && flightId != null) {
    flight = await db.orm.public.Flight.where({ id: flightId }).first();
  }

  if (!flight || flight.status !== "SCHEDULED") {
    return <FareMissing />;
  }

  function hrefForFamily(family: FareFamily) {
    if (tripType === "one-way") {
      return buildOneWayPassengersHref({
        flightCode: flight!.code,
        fareFamily: family,
        ...compositionFields,
      });
    }

    if (leg === "outbound") {
      return buildRoundTripResultsHref({
        from: params.from ?? flight!.originCode,
        to: params.to ?? flight!.destinationCode,
        departure: params.departure ?? "",
        returnDate: params.returnDate ?? "",
        outboundFlightId: flight!.id,
        outboundFareFamily: family,
        ...compositionFields,
      });
    }

    const outboundFlightId = parsePositiveIntParam(params.outboundFlightId);
    const outboundFareFamily = params.outboundFareFamily ?? "BASIC";

    if (outboundFlightId == null) {
      return "/flights";
    }

    return buildRoundTripPassengersHref({
      outboundFlightId,
      returnFlightId: flight!.id,
      outboundFareFamily,
      returnFareFamily: family,
      ...compositionFields,
    });
  }

  const legLabel =
    tripType === "round-trip"
      ? leg === "return"
        ? "Choose your return fare"
        : "Choose your outbound fare"
      : "Choose your fare";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Choose your fare
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {formatAirportRoute(flight.originCode, flight.destinationCode)}
            </h1>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span>
                <strong className="font-medium text-slate-900">
                  {flight.code}
                </strong>
              </span>
              <span>{formatDepartureDateShort(flight)}</span>
              <span>
                {formatDepartureTime(flight)} → {formatArrivalTime(flight)}
              </span>
              <span>
                Passengers:{" "}
                <strong className="font-medium text-slate-900">
                  {totalPassengers(composition)}
                </strong>
                {compositionSummary ? (
                  <span className="text-slate-600"> · {compositionSummary}</span>
                ) : null}
              </span>
            </div>

            <p className="mt-4 text-lg font-medium text-slate-800">{legLabel}</p>
            <p className="mt-2 text-sm text-slate-500">
              Deep-link fallback. Flight Results now opens fare selection in a
              modal.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {listFareFamilyOptions(flight.price).map((option) => (
              <FareOptionCard
                key={option.family}
                option={option}
                href={hrefForFamily(option.family)}
              />
            ))}
          </div>

          {params.departure ? (
            <p className="mt-8 text-center text-sm text-slate-500">
              Search date {formatSearchDate(params.departure)} · fare prices are
              per passenger and do not include taxes
            </p>
          ) : null}
        </section>
      </main>

      <Footer />
    </>
  );
}
