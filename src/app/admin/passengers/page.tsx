import Link from "next/link";

import { isAdmin, requireStaffOrAdmin } from "../../../lib/authorization";
import { formatPassengerTypeLabel } from "../../../lib/passenger-composition";
import { maskPassportNumber } from "../../../lib/sensitive-data";
import { getDecryptedPassportNumber } from "../../../lib/traveler-encryption";
import { db } from "../../../prisma/db";

export default async function AdminPassengersPage() {
  const user = await requireStaffOrAdmin();
  const canEdit = isAdmin(user.role);

  const [passengers, bookings, flights] = await Promise.all([
    db.orm.public.Passenger.select(
      "id",
      "bookingId",
      "firstName",
      "lastName",
      "nationality",
      "passengerType",
      "passportNumberEncrypted",
      "passportCountry",
      "passportExpiry"
    ).all(),
    db.orm.public.Booking.select("id", "bookingReference", "flightId").all(),
    db.orm.public.Flight.select("id", "code").all(),
  ]);

  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const flightsById = new Map(flights.map((flight) => [flight.id, flight]));

  const rows = [...passengers]
    .sort((left, right) => {
      if (left.bookingId !== right.bookingId) {
        return left.bookingId - right.bookingId;
      }

      const last = left.lastName.localeCompare(right.lastName);
      return last !== 0 ? last : left.firstName.localeCompare(right.firstName);
    })
    .map((passenger) => {
      const booking = bookingsById.get(passenger.bookingId);
      const flight = booking ? flightsById.get(booking.flightId) : undefined;

      return {
        id: passenger.id,
        fullName: `${passenger.firstName} ${passenger.lastName}`,
        bookingId: passenger.bookingId,
        bookingReference: booking?.bookingReference ?? "Unknown",
        flightCode: flight?.code ?? "Unknown",
        passengerTypeLabel: formatPassengerTypeLabel(passenger.passengerType),
        nationality: passenger.nationality,
        passportMasked: maskPassportNumber(
          getDecryptedPassportNumber(passenger)
        ),
        passportCountry: passenger.passportCountry,
        passportExpiry: passenger.passportExpiry,
      };
    });

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Passengers
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Review travelers across bookings. Passport numbers are masked.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No passengers are stored yet.
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Passenger</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Booking</th>
                <th className="px-5 py-4">Flight</th>
                <th className="px-5 py-4">Nationality</th>
                <th className="px-5 py-4">Passport</th>
                <th className="px-5 py-4">Passport country</th>
                <th className="px-5 py-4">Passport expiry</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium text-slate-950">
                    {row.fullName}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {row.passengerTypeLabel}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/bookings/${row.bookingId}`}
                      className="font-medium text-primary transition hover:text-primary-hover"
                    >
                      {row.bookingReference}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{row.flightCode}</td>
                  <td className="px-5 py-4 text-slate-700">{row.nationality}</td>
                  <td className="px-5 py-4 font-mono text-slate-950">
                    {row.passportMasked}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {row.passportCountry}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {row.passportExpiry}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/admin/bookings/${row.bookingId}`}
                        className="font-medium text-primary transition hover:text-primary-hover"
                      >
                        View booking
                      </Link>
                      {canEdit && (
                        <Link
                          href={`/admin/passengers/${row.id}/edit`}
                          className="font-medium text-primary transition hover:text-primary-hover"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
