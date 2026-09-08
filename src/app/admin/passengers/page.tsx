import Link from "next/link";

import { isAdmin, requireStaffOrAdmin } from "../../../lib/authorization";
import { formatPassengerTypeLabel } from "../../../lib/passenger-composition";
import { maskPassportNumber } from "../../../lib/sensitive-data";
import { getDecryptedPassportNumber } from "../../../lib/traveler-encryption";

import { db } from "../../../prisma/db";

function getPassengerPassportDisplay(passenger: {
  passportNumberEncrypted?: string | null;
}) {
  if (!passenger.passportNumberEncrypted?.trim()) {
    return "Unavailable";
  }

  try {
    return maskPassportNumber(getDecryptedPassportNumber(passenger));
  } catch {
    return "Unavailable";
  }
}

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

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
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

    db.orm.public.Booking.select(
      "id",
      "bookingReference",
      "flightId"
    ).all(),

    db.orm.public.Flight.select(
      "id",
      "code"
    ).all(),
  ]);

  const bookingsById = new Map(
    bookings.map((booking) => [booking.id, booking])
  );

  const flightsById = new Map(
    flights.map((flight) => [flight.id, flight])
  );

  const rows = [...passengers]
    .sort((left, right) => {
      if (left.bookingId !== right.bookingId) {
        return left.bookingId - right.bookingId;
      }

      const last = left.lastName.localeCompare(right.lastName);

      return last !== 0
        ? last
        : left.firstName.localeCompare(right.firstName);
    })
    .map((passenger) => {
      const booking = bookingsById.get(passenger.bookingId);

      const flight = booking
        ? flightsById.get(booking.flightId)
        : undefined;

      return {
        id: passenger.id,
        fullName: `${passenger.firstName} ${passenger.lastName}`,
        bookingId: passenger.bookingId,
        bookingReference: booking?.bookingReference ?? "Unknown",
        flightCode: flight?.code ?? "Unknown",
        passengerTypeLabel: formatPassengerTypeLabel(
          passenger.passengerType
        ),
        nationality: passenger.nationality,
        passportMasked: getPassengerPassportDisplay(passenger),
        passportCountry: passenger.passportCountry,
        passportExpiry: passenger.passportExpiry,
      };
    });

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
          Passengers
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Review travelers across bookings. Passport numbers remain masked in
          this operational view.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full bg-[#0078D2]/[0.07] px-3 py-1.5 text-xs font-semibold text-[#0078D2]">
            {rows.length} {rows.length === 1 ? "passenger" : "passengers"}
          </span>

          <span className="text-xs text-slate-500">
            Sensitive passport data is not shown in full.
          </span>
        </div>
      </div>

      {/* =========================================================
          EMPTY STATE
      ========================================================= */}
      {rows.length === 0 ? (
        <section className="relative isolate mt-10">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/[0.06] blur-2xl"
          />

          <div className="relative overflow-hidden bg-white px-6 py-12 text-center shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
            <TicketCutouts />

            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              Passenger records
            </p>

            <h2 className="font-american-sans mt-3 text-2xl font-light tracking-[-0.025em] text-slate-950">
              No passengers stored yet
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Passenger records will appear here when bookings are created.
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-10">
          {/* =====================================================
              DESKTOP TABLE
          ===================================================== */}
          <div
            className="
              hidden
              overflow-hidden
              bg-white
              shadow-[0_8px_30px_rgba(15,23,42,0.05)]
              lg:block
            "
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1240px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Passenger
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Type
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Booking
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Flight
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Nationality
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Passport
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Passport country
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Passport expiry
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="
                        border-b
                        border-slate-100
                        transition-colors
                        hover:bg-[#0078D2]/[0.025]
                        last:border-b-0
                      "
                    >
                      {/* Passenger */}
                      <td className="px-5 py-5 align-top">
                        <p className="font-american-sans text-lg font-light tracking-[-0.015em] text-slate-950">
                          {row.fullName}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-5 align-top">
                        <span
                          className="
                            inline-flex
                            rounded-md
                            bg-slate-100
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[0.08em]
                            text-slate-700
                          "
                        >
                          {row.passengerTypeLabel}
                        </span>
                      </td>

                      {/* Booking */}
                      <td className="px-5 py-5 align-top">
                        <Link
                          href={`/admin/bookings/${row.bookingId}`}
                          className="
                            fs-nums
                            break-all
                            text-sm
                            font-semibold
                            tracking-[0.02em]
                            text-[#0078D2]
                            transition
                            hover:text-[#006bbd]
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#0078D2]/30
                          "
                        >
                          {row.bookingReference}
                        </Link>
                      </td>

                      {/* Flight */}
                      <td className="px-5 py-5 align-top">
                        <p className="font-semibold text-slate-950">
                          {row.flightCode}
                        </p>
                      </td>

                      {/* Nationality */}
                      <td className="px-5 py-5 align-top text-slate-700">
                        {row.nationality}
                      </td>

                      {/* Passport */}
                      <td className="px-5 py-5 align-top">
                        <p className="font-mono text-sm font-medium text-slate-950">
                          {row.passportMasked}
                        </p>

                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Masked
                        </p>
                      </td>

                      {/* Passport country */}
                      <td className="px-5 py-5 align-top text-slate-700">
                        {row.passportCountry}
                      </td>

                      {/* Passport expiry */}
                      <td className="whitespace-nowrap px-5 py-5 align-top text-slate-700">
                        {row.passportExpiry}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-5 align-top">
                        <div className="flex min-w-[140px] flex-col items-start gap-2">
                          <Link
                            href={`/admin/bookings/${row.bookingId}`}
                            className="
                              group/view
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
                            View booking

                            <span className="transition-transform duration-200 group-hover/view:translate-x-0.5">
                              <ArrowIcon />
                            </span>
                          </Link>

                          {canEdit ? (
                            <Link
                              href={`/admin/passengers/${row.id}/edit`}
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
                                text-slate-600
                                transition
                                hover:bg-slate-100
                                hover:text-slate-950
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-slate-300
                              "
                            >
                              Edit

                              <span className="transition-transform duration-200 group-hover/edit:translate-x-0.5">
                                <EditIcon />
                              </span>
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Five Stars • Passenger operations
              </p>
            </div>
          </div>

          {/* =====================================================
              MOBILE / TABLET PASSENGER TICKETS
          ===================================================== */}
          <div className="grid gap-5 lg:hidden">
            {rows.map((row) => (
              <article
                key={row.id}
                className="group relative isolate min-w-0"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 -bottom-3 -z-10 h-7 rounded-[50%] bg-slate-950/[0.06] blur-xl"
                />

                <div
                  className="
                    relative
                    overflow-hidden
                    bg-white
                    shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                  "
                >
                  <TicketCutouts />

                  <div className="relative border-b border-dashed border-slate-300 px-5 py-5 sm:px-6">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                          Passenger
                        </p>

                        <h2 className="font-american-sans mt-2 break-words text-2xl font-light tracking-[-0.025em] text-slate-950">
                          {row.fullName}
                        </h2>
                      </div>

                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                        {row.passengerTypeLabel}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-5">
                      <div className="col-span-2">
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Booking
                        </dt>

                        <dd className="mt-1.5">
                          <Link
                            href={`/admin/bookings/${row.bookingId}`}
                            className="fs-nums break-all text-sm font-semibold tracking-[0.02em] text-[#0078D2]"
                          >
                            {row.bookingReference}
                          </Link>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Flight
                        </dt>

                        <dd className="mt-1 text-sm font-semibold text-slate-950">
                          {row.flightCode}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Nationality
                        </dt>

                        <dd className="mt-1 text-sm font-medium text-slate-700">
                          {row.nationality}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Passport
                        </dt>

                        <dd className="mt-1">
                          <span className="font-mono text-sm font-medium text-slate-950">
                            {row.passportMasked}
                          </span>

                          <span className="ml-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Masked
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Passport country
                        </dt>

                        <dd className="mt-1 text-sm font-medium text-slate-700">
                          {row.passportCountry}
                        </dd>
                      </div>

                      <div className="col-span-2">
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Passport expiry
                        </dt>

                        <dd className="mt-1 text-sm font-medium text-slate-700">
                          {row.passportExpiry}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-col gap-3 border-t border-dashed border-slate-200 pt-4 sm:flex-row">
                      <Link
                        href={`/admin/bookings/${row.bookingId}`}
                        className="
                          group/view
                          inline-flex
                          min-h-11
                          flex-1
                          items-center
                          justify-center
                          gap-2
                          rounded-lg
                          bg-[#0078D2]
                          px-5
                          text-sm
                          font-semibold
                          text-white
                          shadow-[0_4px_12px_rgba(0,120,210,0.16)]
                          transition
                          hover:bg-[#006bbd]
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#0078D2]/30
                          focus-visible:ring-offset-2
                        "
                      >
                        View booking

                        <span className="transition-transform duration-200 group-hover/view:translate-x-0.5">
                          <ArrowIcon />
                        </span>
                      </Link>

                      {canEdit ? (
                        <Link
                          href={`/admin/passengers/${row.id}/edit`}
                          className="
                            inline-flex
                            min-h-11
                            flex-1
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            border
                            border-slate-300
                            bg-white
                            px-5
                            text-sm
                            font-semibold
                            text-slate-700
                            transition
                            hover:border-[#0078D2]/30
                            hover:bg-[#f5faff]
                            hover:text-[#0078D2]
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#0078D2]/30
                          "
                        >
                          Edit
                          <EditIcon />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}