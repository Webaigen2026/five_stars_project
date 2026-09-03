import BookingsTable, {
  type AdminBookingRow,
} from "../../../components/admin/bookings/BookingsTable";
import { requireStaffOrAdmin } from "../../../lib/authorization";
import { db } from "../../../prisma/db";

function customerLabel(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
} | null) {
  if (!user) {
    return "Guest";
  }

  const name = [user.firstName, user.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return name ? `${name} · ${user.email}` : user.email;
}

export default async function AdminBookingsPage() {
  await requireStaffOrAdmin();

  const [bookings, users, flights] = await Promise.all([
    db.orm.public.Booking.all(),
    db.orm.public.User.select("id", "email", "firstName", "lastName").all(),
    db.orm.public.Flight.select(
      "id",
      "code",
      "origin",
      "originCode",
      "destination",
      "destinationCode"
    ).all(),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const flightsById = new Map(flights.map((flight) => [flight.id, flight]));

  const rows: AdminBookingRow[] = [...bookings]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
    )
    .map((booking) => {
      const flight = flightsById.get(booking.flightId);
      const user = booking.userId ? usersById.get(booking.userId) ?? null : null;

      return {
        id: booking.id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        customerLabel: customerLabel(user ?? null),
        flightCode: flight?.code ?? "Unknown",
        route: flight
          ? `${flight.originCode} → ${flight.destinationCode}`
          : "Unknown route",
        passengerCount: booking.passengerCount,
        subtotal: booking.subtotal,
        taxesAndFees: booking.taxesAndFees,
        total: booking.total,
        createdAt: booking.createdAt,
      };
    });

  const totalBookings = bookings.length;
  const draftBookings = bookings.filter(
    (booking) => booking.status === "DRAFT"
  ).length;
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  ).length;
  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED"
  ).length;
  const totalBookedPassengers = bookings.reduce(
    (sum, booking) => sum + booking.passengerCount,
    0
  );

  const summaries = [
    { label: "Total bookings", value: String(totalBookings) },
    { label: "Draft", value: String(draftBookings) },
    { label: "Confirmed", value: String(confirmedBookings) },
    { label: "Cancelled", value: String(cancelledBookings) },
    { label: "Booked passengers", value: String(totalBookedPassengers) },
  ];

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Bookings
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Review every persisted booking, including guest checkouts.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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

      <BookingsTable rows={rows} />
    </>
  );
}
