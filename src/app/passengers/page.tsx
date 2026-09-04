import { Suspense } from "react";

import PassengersContent, {
  type RoundTripFlightSummary,
} from "../../components/booking/PassengersContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import {
  calendarDateInTimeZone,
  getAirportTimeZone,
} from "../../lib/airport-timezones";
import {
  isValidRoundTripPair,
  parsePositiveIntParam,
  parseTripType,
} from "../../lib/flight-search";
import { resolvePassengerDetailsModel } from "../../lib/passenger-composition";
import { db } from "../../prisma/db";

type SearchParams = Promise<{
  tripType?: string;
  flight?: string;
  passengers?: string;
  adults?: string;
  seniors?: string;
  children?: string;
  infants?: string;
  outboundFlightId?: string;
  returnFlightId?: string;
}>;

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

function toSummary(flight: {
  id: number;
  code: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
}): RoundTripFlightSummary {
  return {
    id: flight.id,
    code: flight.code,
    origin: flight.origin,
    originCode: flight.originCode,
    destination: flight.destination,
    destinationCode: flight.destinationCode,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
  };
}

function outboundCalendarDate(flight: {
  departureTime: string;
  originCode: string;
}) {
  return calendarDateInTimeZone(
    flight.departureTime,
    getAirportTimeZone(flight.originCode)
  );
}

export default async function PassengersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tripType = parseTripType(params.tripType);
  const compositionParams = {
    passengers: params.passengers,
    adults: params.adults,
    seniors: params.seniors,
    children: params.children,
    infants: params.infants,
  };
  const detailsModel = resolvePassengerDetailsModel(compositionParams);

  let roundTripOutbound: RoundTripFlightSummary | null = null;
  let roundTripReturn: RoundTripFlightSummary | null = null;
  let roundTripInvalid = false;
  let outboundDepartureDate: string | null = null;

  if (tripType === "round-trip") {
    const outboundId = parsePositiveIntParam(params.outboundFlightId);
    const returnId = parsePositiveIntParam(params.returnFlightId);
    const passengers = String(detailsModel.passengerCount);

    if (outboundId == null || returnId == null) {
      roundTripInvalid = true;
    } else {
      const [outbound, returnFlight] = await Promise.all([
        db.orm.public.Flight.where({ id: outboundId }).first(),
        db.orm.public.Flight.where({ id: returnId }).first(),
      ]);

      if (!isValidRoundTripPair(outbound, returnFlight, passengers)) {
        roundTripInvalid = true;
      } else if (outbound && returnFlight) {
        roundTripOutbound = toSummary(outbound);
        roundTripReturn = toSummary(returnFlight);
        outboundDepartureDate = outboundCalendarDate(outbound);
      }
    }
  } else if (params.flight) {
    const flight = await db.orm.public.Flight.where({
      code: params.flight.trim(),
    }).first();

    if (flight) {
      outboundDepartureDate = outboundCalendarDate(flight);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <Suspense fallback={<PassengersFallback />}>
          <PassengersContent
            tripType={tripType}
            roundTripOutbound={roundTripOutbound}
            roundTripReturn={roundTripReturn}
            roundTripInvalid={roundTripInvalid}
            outboundDepartureDate={outboundDepartureDate}
            initialTravelerSlots={detailsModel.slots}
            initialPassengerCount={detailsModel.passengerCount}
            initialCompositionSummary={detailsModel.summary}
            initialCompositionParams={compositionParams}
          />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
