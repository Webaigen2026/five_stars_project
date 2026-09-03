import Link from "next/link";

import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import { formatAirportRoute } from "../../../data/airports";
import {
  buildModifySearchHref,
  formatEmptyFlightSearchMessage,
  formatSearchDate,
} from "../../../lib/flight-search";
import { db } from "../../../prisma/db";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  departure?: string;
  passengers?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function toCalendarDate(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

export default async function FlightResultsPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const from = params.from ?? "";
  const to = params.to ?? "";
  const departure = params.departure ?? "";
  const passengers = params.passengers ?? "1";

  const fromQuery = from.toLowerCase().trim();
  const toQuery = to.toLowerCase().trim();

  const allFlights = await db.orm.public.Flight.all();

  const modifySearchHref = buildModifySearchHref({
    from,
    to,
    departure,
    passengers,
  });

  const matchingFlights = allFlights.filter((flight) => {
    const matchesOrigin =
      !fromQuery ||
      flight.origin.toLowerCase().includes(fromQuery) ||
      flight.originCode.toLowerCase().includes(fromQuery);

    const matchesDestination =
      !toQuery ||
      flight.destination.toLowerCase().includes(toQuery) ||
      flight.destinationCode.toLowerCase().includes(toQuery);

    const matchesStatus = flight.status === "SCHEDULED";

    const matchesDeparture =
      !departure ||
      toCalendarDate(flight.departureTime) === departure;

    return (
      matchesOrigin &&
      matchesDestination &&
      matchesStatus &&
      matchesDeparture
    );
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
              {departure && (
                <span>
                  Departure:{" "}
                  <strong className="font-medium text-slate-900">
                    {formatSearchDate(departure)}
                  </strong>
                </span>
              )}

              <span>
                Passengers:{" "}
                <strong className="font-medium text-slate-900">
                  {passengers}
                </strong>
              </span>
            </div>

            <Link
              href={modifySearchHref}
              className="mt-6 inline-flex text-sm font-semibold text-primary transition hover:text-primary-hover"
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
              {matchingFlights.length === 1
                ? "flight"
                : "flights"}{" "}
              found
            </p>
          </div>

          {matchingFlights.length > 0 ? (
            <div className="space-y-5">
              {matchingFlights.map((flight) => (
                <article
                  key={flight.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-primary">
                          {flight.code}
                        </span>

                        <span className="text-sm font-medium text-slate-500">
                          {flight.airline}
                        </span>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div>
                          <p className="text-2xl font-semibold text-slate-950">
                            {formatTime(
                              flight.departureTime
                            )}
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {flight.origin} ({flight.originCode})
                          </p>
                        </div>

                        <div className="min-w-0 text-left sm:min-w-40 sm:text-center">
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            {formatDuration(
                              flight.durationMinutes
                            )}
                          </p>

                          <div className="my-2 h-px bg-slate-300" />

                          <p className="text-xs text-slate-500">
                            Nonstop
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-2xl font-semibold text-slate-950">
                            {formatTime(
                              flight.arrivalTime
                            )}
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {flight.destination} ({flight.destinationCode})
                          </p>
                        </div>
                      </div>

                      <p className="mt-5 text-sm text-slate-500">
                        {flight.availableSeats} seats remaining
                      </p>
                    </div>

                    <div className="border-t border-slate-200 pt-6 lg:min-w-48 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                      <p className="text-sm text-slate-500">
                        From
                      </p>

                      <p className="mt-1 text-3xl font-semibold text-slate-950">
                        ${(flight.price / 100).toFixed(2)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        per passenger
                      </p>

                      <Link
                        href={`/passengers?flight=${flight.code}&passengers=${passengers}`}
                        className="mt-5 inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                      >
                        Select Flight
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <h2 className="text-2xl font-semibold text-slate-950">
                No flights found
              </h2>

              <p className="mt-3 text-slate-600">
                {formatEmptyFlightSearchMessage({ from, to, departure })}
              </p>

              <p className="mt-2 text-slate-600">
                Try another date or route.
              </p>

              <Link
                href={modifySearchHref}
                className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Modify search
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}