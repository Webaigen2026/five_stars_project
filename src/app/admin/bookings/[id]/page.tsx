import Link from "next/link";
import { notFound } from "next/navigation";

import BookingStatusForm from "../../../../components/admin/bookings/BookingStatusForm";
import { parsePositiveInt } from "../../../../lib/admin-bookings";
import { isAdmin, requireStaffOrAdmin } from "../../../../lib/authorization";
import { maskPassportNumber } from "../../../../lib/sensitive-data";
import { getAllowedAdminBookingTransitions } from "../../../../lib/booking-lifecycle";
import { db } from "../../../../prisma/db";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function customerDisplay(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
} | null) {
  if (!user) {
    return {
      name: "Guest",
      email: "No account",
    };
  }

  const name = [user.firstName, user.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return {
    name: name || user.email,
    email: user.email,
  };
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireStaffOrAdmin();
  const canEditPassengers = isAdmin(currentUser.role);
  const { id: rawId } = await params;
  const id = parsePositiveInt(rawId);

  if (id == null) {
    notFound();
  }

  const booking = await db.orm.public.Booking.where({ id }).first();

  if (!booking) {
    notFound();
  }

  const [customer, flight, passengers, payment] = await Promise.all([
    booking.userId
      ? db.orm.public.User.select("id", "email", "firstName", "lastName")
          .where({ id: booking.userId })
          .first()
      : Promise.resolve(null),
    db.orm.public.Flight.select(
      "id",
      "code",
      "airline",
      "origin",
      "originCode",
      "destination",
      "destinationCode",
      "departureTime",
      "arrivalTime"
    )
      .where({ id: booking.flightId })
      .first(),
    db.orm.public.Passenger.where({ bookingId: booking.id }).all(),
    db.orm.public.Payment.where({ bookingId: booking.id }).first(),
  ]);

  const sortedPassengers = [...passengers].sort((left, right) => {
    const last = left.lastName.localeCompare(right.lastName);
    return last !== 0 ? last : left.firstName.localeCompare(right.firstName);
  });

  const customerInfo = customerDisplay(customer);
  const allowedTransitions = getAllowedAdminBookingTransitions(booking.status);
  const route = flight
    ? `${flight.originCode} → ${flight.destinationCode}`
    : "Unknown route";

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        {booking.bookingReference}
      </h1>

      <p className="mt-4">
        <Link
          href="/admin/bookings"
          className="text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          ← Back to bookings
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Booking</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-slate-950">{booking.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Passengers</dt>
              <dd className="font-medium text-slate-950">
                {booking.passengerCount}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-950">
                {formatDateTime(booking.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Updated</dt>
              <dd className="text-slate-950">
                {formatDateTime(booking.updatedAt)}
              </dd>
            </div>
          </dl>

          <BookingStatusForm
            bookingId={booking.id}
            currentStatus={booking.status}
            allowedTransitions={allowedTransitions}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Customer</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {customerInfo.name}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 text-slate-950">{customerInfo.email}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Flight</h2>
          {flight ? (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Code</dt>
                <dd className="font-semibold text-slate-950">{flight.code}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Airline</dt>
                <dd className="text-slate-950">{flight.airline}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Route</dt>
                <dd className="text-slate-950">{route}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Cities</dt>
                <dd className="mt-1 text-slate-950">
                  {flight.origin} → {flight.destination}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Flight details are unavailable.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Pricing</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="text-slate-950">{formatMoney(booking.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Taxes & fees</dt>
              <dd className="text-slate-950">
                {formatMoney(booking.taxesAndFees)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
              <dt className="font-semibold text-slate-950">Total</dt>
              <dd className="text-xl font-semibold text-slate-950">
                {formatMoney(booking.total)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Payment</h2>
        {payment ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Provider</dt>
              <dd className="font-medium text-slate-950">
                {payment.provider ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-slate-950">{payment.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-slate-950">{formatMoney(payment.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Currency</dt>
              <dd className="text-slate-950">{payment.currency}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:col-span-2">
              <dt className="text-slate-500">Stripe checkout</dt>
              <dd className="font-mono text-slate-950">
                {payment.stripeCheckoutId ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:col-span-2">
              <dt className="text-slate-500">Paid at</dt>
              <dd className="text-slate-950">
                {payment.paidAt ? formatDateTime(payment.paidAt) : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No payment has been started for this booking.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">
          Passenger manifest
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Passport details are visible only in this protected operations area.
        </p>

        {sortedPassengers.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            No passengers are attached to this booking.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Date of birth</th>
                  <th className="py-3 pr-4">Gender</th>
                  <th className="py-3 pr-4">Nationality</th>
                  <th className="py-3 pr-4">Passport</th>
                  <th className="py-3 pr-4">Country</th>
                  <th className="py-3 pr-4">Expiry</th>
                  {canEditPassengers && <th className="py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedPassengers.map((passenger) => (
                  <tr
                    key={passenger.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-950">
                      {passenger.firstName} {passenger.lastName}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {passenger.dateOfBirth}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {passenger.gender}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {passenger.nationality}
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-950">
                      {maskPassportNumber(passenger.passportNumber)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {passenger.passportCountry}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {passenger.passportExpiry}
                    </td>
                    {canEditPassengers && (
                      <td className="py-3">
                        <Link
                          href={`/admin/passengers/${passenger.id}/edit`}
                          className="font-medium text-primary transition hover:text-primary-hover"
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
