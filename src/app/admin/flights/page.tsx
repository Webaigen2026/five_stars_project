import Link from "next/link";

import CreateFlightForm from "../../../components/admin/flights/CreateFlightForm";
import PassengerManifestExportControl from "../../../components/admin/PassengerManifestExportControl";

import { describeFlightAircraft } from "../../../lib/aircraft-config";

import {
  canViewSensitiveTravelerData,
  isAdmin,
  requireStaffOrAdmin,
} from "../../../lib/authorization";

import {
  formatArrivalDateTime,
  formatDepartureDateTime,
  formatDuration,
} from "../../../lib/trip-formatting";

import { db } from "../../../prisma/db";

function ArrowIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 -top-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-4 z-20 h-8 w-8 rounded-full bg-slate-50"
      />
    </>
  );
}

function statusClassName(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "bg-[#0078D2]/[0.07] text-[#0078D2]";

    case "BOARDING":
      return "bg-violet-50 text-violet-800";

    case "DEPARTED":
      return "bg-indigo-50 text-indigo-800";

    case "ARRIVED":
      return "bg-emerald-50 text-emerald-800";

    case "CANCELLED":
      return "bg-rose-50 text-rose-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function seatMapBadgeClassName(supported: boolean) {
  return supported
    ? "bg-emerald-50 text-emerald-800"
    : "bg-slate-100 text-slate-600";
}

export default async function AdminFlightsPage() {
  const user = await requireStaffOrAdmin();

  const canManage = isAdmin(user.role);

  const canExportManifest = canViewSensitiveTravelerData(user);

  const showActions = canManage || canExportManifest;

  const flights = [...(await db.orm.public.Flight.all())].sort(
    (left, right) =>
      new Date(left.departureTime).getTime() -
      new Date(right.departureTime).getTime()
  );

  const totalFlights = flights.length;

  const scheduledFlights = flights.filter(
    (flight) => flight.status === "SCHEDULED"
  ).length;

  const cancelledFlights = flights.filter(
    (flight) => flight.status === "CANCELLED"
  ).length;

  const totalAvailableSeats = flights.reduce(
    (sum, flight) => sum + flight.availableSeats,
    0
  );

  const summaries = [
    {
      label: "Total flights",
      value: String(totalFlights),
      meta: "Schedule",
    },
    {
      label: "Scheduled",
      value: String(scheduledFlights),
      meta: "Active",
    },
    {
      label: "Cancelled",
      value: String(cancelledFlights),
      meta: "Exceptions",
    },
    {
      label: "Available seats",
      value: String(totalAvailableSeats),
      meta: "Inventory",
    },
  ];

  return (
    <>
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <div className="border-b border-slate-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
          Operations
        </p>

        <h1 className="font-american-sans mt-3 text-4xl font-light tracking-[-0.03em] text-slate-950 sm:text-5xl">
          Flights
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Review the Five Stars schedule.{" "}
          {canManage
            ? "Create and edit flights from this page."
            : "This view is read-only for staff."}
        </p>
      </div>

      {/* =========================================================
          SUMMARY TICKETS
      ========================================================= */}
      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaries.map((item) => (
          <div
            key={item.label}
            className="group relative isolate min-w-0"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 -bottom-3 -z-10 h-7 rounded-[50%] bg-slate-950/[0.06] blur-xl"
            />

            <div className="relative overflow-hidden bg-white shadow-[0_7px_24px_rgba(15,23,42,0.06)]">
              <TicketCutouts />

              <div className="flex min-h-[150px]">
                <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      {item.meta}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {item.label}
                    </p>
                  </div>

                  <p className="fs-nums mt-6 text-4xl font-semibold tracking-[-0.035em] text-slate-950">
                    {item.value}
                  </p>
                </div>

                <div className="relative w-[52px] shrink-0 border-l border-dashed border-slate-300 bg-slate-50/70">
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50"
                  />

                  <span
                    aria-hidden="true"
                    className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* =========================================================
          CREATE FLIGHT
      ========================================================= */}
      {canManage ? (
        <section className="relative isolate mt-10 min-w-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/[0.07] blur-2xl"
          />

          <div className="relative overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.07)]">
            <TicketCutouts />

            <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6 md:px-8">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
              />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
              />

              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                Flight management
              </p>

              <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
                Create flight
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add a flight to the Five Stars schedule. Price is entered in
                dollars and stored as cents.
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 md:px-8">
              <CreateFlightForm />
            </div>

            <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Five Stars • Flight operations
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* =========================================================
          SCHEDULE
      ========================================================= */}
      <section className="mt-12">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              Schedule
            </p>

            <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
              Flight schedule
            </h2>
          </div>

          <p className="text-sm text-slate-500">
            {flights.length} {flights.length === 1 ? "flight" : "flights"}
          </p>
        </div>

        {flights.length === 0 ? (
          <div className="relative isolate">
            <div className="relative overflow-hidden bg-white px-6 py-10 text-center shadow-[0_7px_24px_rgba(15,23,42,0.06)]">
              <TicketCutouts />

              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                Flight schedule
              </p>

              <h3 className="font-american-sans mt-3 text-2xl font-light tracking-[-0.025em] text-slate-950">
                No flights stored yet
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Flights will appear here once they are created.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="
              overflow-hidden
              bg-white
              shadow-[0_8px_30px_rgba(15,23,42,0.06)]
            "
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Flight
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Aircraft
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Route
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Times
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Seats
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Price
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </th>

                    {showActions ? (
                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>

                <tbody>
                  {flights.map((flight) => {
                    const aircraftInfo = describeFlightAircraft(
                      flight.aircraft
                    );

                    return (
                      <tr
                        key={flight.id}
                        className="
                          border-b
                          border-slate-100
                          transition
                          hover:bg-[#0078D2]/[0.025]
                          last:border-b-0
                        "
                      >
                        {/* Flight */}
                        <td className="px-5 py-5 align-top">
                          <p className="font-semibold text-slate-950">
                            {flight.code}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {flight.airline}
                          </p>
                        </td>

                        {/* Aircraft */}
                        <td className="px-5 py-5 align-top">
                          <p className="font-medium text-slate-950">
                            {aircraftInfo.displayValue}
                          </p>

                          <span
                            className={`
                              mt-2
                              inline-flex
                              rounded-md
                              px-2
                              py-1
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-[0.08em]
                              ${seatMapBadgeClassName(
                                aircraftInfo.supported
                              )}
                            `}
                          >
                            {aircraftInfo.supportLabel}
                          </span>
                        </td>

                        {/* Route */}
                        <td className="px-5 py-5 align-top">
                          <p className="font-american-sans text-lg font-light tracking-[-0.015em] text-slate-950">
                            {flight.originCode}
                            <span className="mx-2 text-[#0078D2]">→</span>
                            {flight.destinationCode}
                          </p>

                          <p className="mt-2 max-w-[200px] truncate text-sm text-slate-500">
                            {flight.origin}
                          </p>

                          <p className="mt-1 max-w-[200px] truncate text-sm text-slate-500">
                            {flight.destination}
                          </p>
                        </td>

                        {/* Times */}
                        <td className="px-5 py-5 align-top">
                          <p className="text-sm font-medium text-slate-950">
                            {formatDepartureDateTime(flight)}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {formatArrivalDateTime(flight)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDuration(flight.durationMinutes)}
                          </p>
                        </td>

                        {/* Seats */}
                        <td className="whitespace-nowrap px-5 py-5 align-top">
                          <p className="fs-nums font-semibold text-slate-950">
                            {flight.availableSeats}
                            <span className="font-normal text-slate-400">
                              {" "}
                              / {flight.totalSeats}
                            </span>
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            available
                          </p>
                        </td>

                        {/* Price */}
                        <td className="whitespace-nowrap px-5 py-5 align-top">
                          <p className="fs-nums text-base font-semibold text-slate-950">
                            ${(flight.price / 100).toFixed(2)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            base fare
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-5 align-top">
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              px-3
                              py-1.5
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-[0.08em]
                              ${statusClassName(flight.status)}
                            `}
                          >
                            {flight.status}
                          </span>
                        </td>

                        {/* Actions */}
                        {showActions ? (
                          <td className="px-5 py-5 align-top">
                            <div className="flex min-w-[120px] flex-col items-start gap-2">
                              {canManage ? (
                                <Link
                                  href={`/admin/flights/${flight.id}/edit`}
                                  className="
                                    group/edit
                                    inline-flex
                                    min-h-9
                                    items-center
                                    gap-2
                                    rounded-lg
                                    px-3
                                    text-sm
                                    font-semibold
                                    text-[#0078D2]
                                    transition
                                    hover:bg-[#0078D2]/[0.06]
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-[#0078D2]/30
                                  "
                                >
                                  Edit

                                  <span className="transition-transform duration-200 group-hover/edit:translate-x-0.5">
                                    <ArrowIcon />
                                  </span>
                                </Link>
                              ) : null}

                              <PassengerManifestExportControl
                                flightId={flight.id}
                                flightCode={flight.code}
                                canExport={canExportManifest}
                              />
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Five Stars • Flight schedule
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}