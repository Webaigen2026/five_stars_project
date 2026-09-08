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

export default async function AdminBookingsPage() {
  await requireStaffOrAdmin();

  const [bookings, users, flights] = await Promise.all([
    db.orm.public.Booking.all(),

    db.orm.public.User.select(
      "id",
      "email",
      "firstName",
      "lastName"
    ).all(),

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

  const flightsById = new Map(
    flights.map((flight) => [flight.id, flight])
  );

  const rows: AdminBookingRow[] = [...bookings]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
    )
    .map((booking) => {
      const flight = flightsById.get(booking.flightId);

      const user = booking.userId
        ? usersById.get(booking.userId) ?? null
        : null;

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
    {
      label: "Total bookings",
      value: String(totalBookings),
      meta: "Reservations",
    },
    {
      label: "Draft",
      value: String(draftBookings),
      meta: "Action needed",
    },
    {
      label: "Confirmed",
      value: String(confirmedBookings),
      meta: "Completed",
    },
    {
      label: "Cancelled",
      value: String(cancelledBookings),
      meta: "Exceptions",
    },
    {
      label: "Booked passengers",
      value: String(totalBookedPassengers),
      meta: "Travelers",
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
          Bookings
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Review every persisted Five Stars booking, including guest
          checkouts.
        </p>
      </div>

      {/* =========================================================
          SUMMARY TICKETS
      ========================================================= */}
      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {summaries.map((item) => (
          <div
            key={item.label}
            className="group relative isolate min-w-0"
          >
            {/* Soft shadow */}
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-7
                -bottom-3
                -z-10
                h-7
                rounded-[50%]
                bg-slate-950/[0.06]
                blur-xl
              "
            />

            {/* Ticket */}
            <div
              className="
                relative
                h-full
                overflow-hidden
                bg-white
                shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                transition
                duration-200
                group-hover:-translate-y-0.5
                group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)]
              "
            >
              <TicketCutouts />

              <div className="flex min-h-[150px]">
                {/* Main metric */}
                <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      {item.meta}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {item.label}
                    </p>
                  </div>

                  <p
                    className="
                      fs-nums
                      mt-6
                      break-words
                      text-4xl
                      font-semibold
                      tracking-[-0.035em]
                      text-slate-950
                    "
                  >
                    {item.value}
                  </p>
                </div>

                {/* Perforated stub */}
                <div
                  className="
                    relative
                    w-[48px]
                    shrink-0
                    border-l
                    border-dashed
                    border-slate-300
                    bg-slate-50/70
                  "
                >
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
          BOOKINGS TABLE
      ========================================================= */}
      <section className="mt-12">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              Reservations
            </p>

            <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
              Booking records
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Search and review customer and guest bookings across the Five
              Stars operation.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "booking" : "bookings"}
          </p>
        </div>

        <div
          className="
            overflow-hidden
            bg-white
            shadow-[0_8px_30px_rgba(15,23,42,0.06)]
          "
        >
          <BookingsTable rows={rows} />

          <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Five Stars • Booking operations
            </p>
          </div>
        </div>
      </section>
    </>
  );
}