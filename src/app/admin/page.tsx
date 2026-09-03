import Link from "next/link";

import { db } from "../../prisma/db";

export default async function AdminDashboardPage() {
  const [flights, bookings, passengers, cargo, charter, contact, newContact] =
    await Promise.all([
      db.orm.public.Flight.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.Booking.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.Passenger.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.CargoRequest.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.CharterRequest.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.ContactMessage.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.ContactMessage.where({ status: "NEW" }).aggregate(
        (aggregate) => ({
          total: aggregate.count(),
        })
      ),
    ]);

  const flightCount = flights.total;
  const bookingCount = bookings.total;
  const passengerCount = passengers.total;

  const cards = [
    {
      label: "Flights",
      value: String(flightCount),
      href: "/admin/flights",
      note: "Scheduled and stored flights",
    },
    {
      label: "Bookings",
      value: String(bookingCount),
      href: "/admin/bookings",
      note: "Persisted booking records",
    },
    {
      label: "Passengers",
      value: String(passengerCount),
      href: "/admin/passengers",
      note: "Passenger records on bookings",
    },
    {
      label: "Cargo",
      value: String(cargo.total),
      href: "/admin/cargo",
      note: "Persisted cargo requests",
    },
    {
      label: "Charter",
      value: String(charter.total),
      href: "/admin/charter",
      note: "Persisted charter requests",
    },
    {
      label: "Contact Messages",
      value: String(contact.total),
      href: "/admin/contact-messages",
      note: `${newContact.total} NEW`,
    },
    {
      label: "Revenue",
      value: "Not built yet",
      href: "/admin/bookings",
      note: "Analytics will come after payments",
    },
  ];

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Admin dashboard
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Review operational counts and open each area when you are ready to
        manage it.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-slate-600">{card.note}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
