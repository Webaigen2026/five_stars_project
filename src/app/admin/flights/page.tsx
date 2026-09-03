import Link from "next/link";

import CreateFlightForm from "../../../components/admin/flights/CreateFlightForm";
import { isAdmin, requireStaffOrAdmin } from "../../../lib/authorization";
import { db } from "../../../prisma/db";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function statusClassName(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "bg-sky-50 text-primary";
    case "BOARDING":
      return "bg-amber-50 text-amber-800";
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

export default async function AdminFlightsPage() {
  const user = await requireStaffOrAdmin();
  const canManage = isAdmin(user.role);
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
    { label: "Total flights", value: String(totalFlights) },
    { label: "Scheduled", value: String(scheduledFlights) },
    { label: "Cancelled", value: String(cancelledFlights) },
    { label: "Available seats", value: String(totalAvailableSeats) },
  ];

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Flights
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Review the StarJet schedule.{" "}
        {canManage
          ? "Create and edit flights from this page."
          : "This view is read-only for staff."}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {canManage && (
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create flight
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Price is entered in dollars and stored as cents.
          </p>
          <CreateFlightForm />
        </section>
      )}

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Schedule
          </h2>
          <p className="text-sm text-slate-500">
            {flights.length} {flights.length === 1 ? "flight" : "flights"}
          </p>
        </div>

        {flights.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            No flights are stored yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Flight</th>
                  <th className="px-5 py-4">Route</th>
                  <th className="px-5 py-4">Times</th>
                  <th className="px-5 py-4">Seats</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Status</th>
                  {canManage && <th className="px-5 py-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {flights.map((flight) => (
                  <tr
                    key={flight.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-slate-950">{flight.code}</p>
                      <p className="mt-1 text-slate-600">{flight.airline}</p>
                      <p className="mt-1 text-slate-500">
                        {flight.aircraft ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-slate-950">
                        {flight.originCode} → {flight.destinationCode}
                      </p>
                      <p className="mt-1 text-slate-600">{flight.origin}</p>
                      <p className="mt-1 text-slate-600">{flight.destination}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-slate-950">
                        {formatDateTime(flight.departureTime)}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {formatDateTime(flight.arrivalTime)}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {formatDuration(flight.durationMinutes)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top text-slate-950">
                      {flight.availableSeats} / {flight.totalSeats}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top font-semibold text-slate-950">
                      ${(flight.price / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(flight.status)}`}
                      >
                        {flight.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-4 align-top">
                        <Link
                          href={`/admin/flights/${flight.id}/edit`}
                          className="rounded-xl px-3 py-2 font-medium text-primary transition hover:bg-sky-50"
                        >
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
