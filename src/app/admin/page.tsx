import Link from "next/link";

import { db } from "../../prisma/db";

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
      meta: "Inventory",
    },
    {
      label: "Bookings",
      value: String(bookingCount),
      href: "/admin/bookings",
      note: "Persisted booking records",
      meta: "Reservations",
    },
    {
      label: "Passengers",
      value: String(passengerCount),
      href: "/admin/passengers",
      note: "Passenger records on bookings",
      meta: "Travelers",
    },
    {
      label: "Cargo",
      value: String(cargo.total),
      href: "/admin/cargo",
      note: "Persisted cargo requests",
      meta: "Shipping",
    },
    {
      label: "Charter",
      value: String(charter.total),
      href: "/admin/charter",
      note: "Persisted charter requests",
      meta: "Private",
    },
    {
      label: "Contact Messages",
      value: String(contact.total),
      href: "/admin/contact-messages",
      note: `${newContact.total} NEW`,
      meta: "Support",
    },
    {
      label: "Revenue",
      value: "Not built yet",
      href: "/admin/bookings",
      note: "Analytics will come after payments",
      meta: "Analytics",
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="border-b border-slate-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
          Operations
        </p>

        <h1 className="font-american-sans mt-3 text-4xl font-light tracking-[-0.03em] text-slate-950 sm:text-5xl">
          Admin dashboard
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Review operational counts and open each area when you are ready to
          manage it.
        </p>
      </div>

      {/* Operations tickets */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="
              group
              relative
              isolate
              min-w-0
              transition-transform
              duration-200
              hover:-translate-y-0.5
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              focus-visible:ring-offset-4
            "
          >
            {/* Floating shadow */}
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-8
                -bottom-3
                -z-10
                h-7
                rounded-[50%]
                bg-slate-950/[0.07]
                blur-xl
                transition
                group-hover:bg-slate-950/10
              "
            />

            {/* Ticket */}
            <div
              className="
                relative
                h-full
                overflow-hidden
                bg-white
                shadow-[0_8px_28px_rgba(15,23,42,0.06)]
                transition-shadow
                duration-200
                group-hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]
              "
            >
              <TicketCutouts />

              <div className="flex h-full min-w-0">
                {/* Main ticket body */}
                <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-6 sm:px-6">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                          {card.meta}
                        </p>

                        <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                          {card.label}
                        </h2>
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Five Stars
                      </span>
                    </div>

                    <div className="mt-6">
                      <p
                        className="
                          fs-nums
                          break-words
                          text-4xl
                          font-semibold
                          tracking-[-0.035em]
                          text-slate-950
                        "
                      >
                        {card.value}
                      </p>

                      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                        {card.note}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 border-t border-dashed border-slate-200 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Operations summary
                    </p>
                  </div>
                </div>

                {/* Action stub */}
                <div
                  className="
                    relative
                    flex
                    w-[76px]
                    shrink-0
                    flex-col
                    items-center
                    justify-center
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

                  <span
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-slate-200
                      bg-white
                      text-[#0078D2]
                      shadow-sm
                      transition
                      duration-200
                      group-hover:border-[#0078D2]/30
                      group-hover:bg-[#0078D2]
                      group-hover:text-white
                    "
                  >
                    <ArrowIcon />
                  </span>

                  <span
                    className="
                      mt-3
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.14em]
                      text-slate-400
                    "
                  >
                    Open
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}