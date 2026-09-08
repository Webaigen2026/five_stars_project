"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { BOOKING_STATUSES } from "../../../lib/admin-bookings";

export type AdminBookingRow = {
  id: number;
  bookingReference: string;
  status: string;
  customerLabel: string;
  flightCode: string;
  route: string;
  passengerCount: number;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  createdAt: string;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

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

function statusClassName(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";

    case "PENDING_PAYMENT":
      return "bg-[#0078D2]/[0.07] text-[#0078D2]";

    case "PAID":
    case "CONFIRMED":
    case "TICKETED":
      return "bg-[#0078D2]/[0.07] text-[#0078D2]";

    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800";

    case "CANCELLED":
    case "FAILED":
      return "bg-rose-50 text-rose-800";

    case "REFUNDED":
      return "bg-indigo-50 text-indigo-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function SearchIcon() {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
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

export default function BookingsTable({
  rows,
}: {
  rows: AdminBookingRow[];
}) {
  const [referenceQuery, setReferenceQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredRows = useMemo(() => {
    const query = referenceQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesReference =
        !query || row.bookingReference.toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || row.status === statusFilter;

      return matchesReference && matchesStatus;
    });
  }, [rows, referenceQuery, statusFilter]);

  return (
    <div className="mt-8 ">
      {/* =========================================================
          FILTER BAR
      ========================================================= */}
      <div
        className="
          mb-6
          grid
          gap-4
          border-b
          border-dashed
          border-slate-200
          pb-6
          md:grid-cols-[minmax(0,1fr)_240px_auto]
          md:items-end
          mx-4
        "
      >
        {/* Reference search */}
        <div className="min-w-0 ">
          <label
            htmlFor="booking-reference-search"
            className="
              mb-2
              block
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-slate-500
            "
          >
            Booking reference
          </label>

          <div className="relative">
            <span
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            >
              <SearchIcon />
            </span>

            <input
              id="booking-reference-search"
              value={referenceQuery}
              onChange={(event) =>
                setReferenceQuery(event.target.value)
              }
              placeholder="SJ-XXXXXX"
              className="
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                py-3
                pl-11
                pr-4
                text-sm
                text-slate-950
                outline-none
                transition
                placeholder:text-slate-400
                hover:border-slate-400
                focus:border-[#0078D2]
                focus:ring-2
                focus:ring-[#0078D2]/15
              "
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="min-w-0">
          <label
            htmlFor="booking-status-filter"
            className="
              mb-2
              block
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-slate-500
            "
          >
            Status
          </label>

          <div className="relative">
            <select
              id="booking-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="
                w-full
                appearance-none
                rounded-lg
                border
                border-slate-300
                bg-white
                px-4
                py-3
                pr-10
                text-sm
                text-slate-950
                outline-none
                transition
                hover:border-slate-400
                focus:border-[#0078D2]
                focus:ring-2
                focus:ring-[#0078D2]/15
              "
            >
              <option value="">All statuses</option>

              {BOOKING_STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>

            <span
              className="
                pointer-events-none
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            >
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        {/* Result count */}
        <div className="pb-0.5 text-sm text-slate-500 md:text-right">
          <span className="fs-nums font-semibold text-slate-950">
            {filteredRows.length}
          </span>{" "}
          {filteredRows.length === 1 ? "result" : "results"}
        </div>
      </div>

      {/* =========================================================
          EMPTY STATE
      ========================================================= */}
      {filteredRows.length === 0 ? (
        <div
          className="
            relative
            overflow-hidden
            bg-white
            px-6
            py-12
            text-center
            shadow-[0_7px_24px_rgba(15,23,42,0.05)]
          "
        >
          <span
            aria-hidden="true"
            className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-slate-50"
          />

          <span
            aria-hidden="true"
            className="absolute -right-4 -top-4 h-8 w-8 rounded-full bg-slate-50"
          />

          <span
            aria-hidden="true"
            className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full bg-slate-50"
          />

          <span
            aria-hidden="true"
            className="absolute -bottom-4 -right-4 h-8 w-8 rounded-full bg-slate-50"
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
            Booking search
          </p>

          <h3 className="font-american-sans mt-3 text-2xl font-light tracking-[-0.025em] text-slate-950">
            No bookings match this filter
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Try another booking reference or choose a different status.
          </p>
        </div>
      ) : (
        <div
          className="
            overflow-hidden
            bg-white
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          {/* =====================================================
              DESKTOP TABLE
          ===================================================== */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Booking
                  </th>

                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Flight
                  </th>

                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Travelers
                  </th>

                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Pricing
                  </th>

                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Created
                  </th>

                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
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
                    {/* Booking */}
                    <td className="px-5 py-5 align-top">
                      <p
                        className="
                          fs-nums
                          break-all
                          text-sm
                          font-semibold
                          tracking-[0.02em]
                          text-slate-950
                        "
                      >
                        {row.bookingReference}
                      </p>

                      <span
                        className={`
                          mt-2
                          inline-flex
                          rounded-full
                          px-3
                          py-1.5
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.08em]
                          ${statusClassName(row.status)}
                        `}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="max-w-[250px] px-5 py-5 align-top">
                      <p className="break-words font-medium leading-6 text-slate-700">
                        {row.customerLabel}
                      </p>
                    </td>

                    {/* Flight */}
                    <td className="px-5 py-5 align-top">
                      <p className="font-semibold text-slate-950">
                        {row.flightCode}
                      </p>

                      <p
                        className="
                          font-american-sans
                          mt-1.5
                          text-lg
                          font-light
                          tracking-[-0.015em]
                          text-slate-700
                        "
                      >
                        {row.route}
                      </p>
                    </td>

                    {/* Passengers */}
                    <td className="px-5 py-5 align-top">
                      <p
                        className="
                          fs-nums
                          text-lg
                          font-semibold
                          text-slate-950
                        "
                      >
                        {row.passengerCount}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {row.passengerCount === 1
                          ? "traveler"
                          : "travelers"}
                      </p>
                    </td>

                    {/* Pricing */}
                    <td className="whitespace-nowrap px-5 py-5 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-5">
                          <span className="text-xs text-slate-500">
                            Subtotal
                          </span>

                          <span className="fs-nums text-xs font-medium text-slate-700">
                            {formatMoney(row.subtotal)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-5">
                          <span className="text-xs text-slate-500">
                            Taxes
                          </span>

                          <span className="fs-nums text-xs font-medium text-slate-700">
                            {formatMoney(row.taxesAndFees)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-5 border-t border-slate-100 pt-2">
                          <span className="text-xs font-semibold text-slate-700">
                            Total
                          </span>

                          <span className="fs-nums font-semibold text-slate-950">
                            {formatMoney(row.total)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Created */}
                    <td className="whitespace-nowrap px-5 py-5 align-top">
                      <p className="text-sm text-slate-600">
                        {formatDateTime(row.createdAt)}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-5 align-top">
                      <Link
                        href={`/admin/bookings/${row.id}`}
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
                        View

                        <span className="transition-transform duration-200 group-hover/view:translate-x-0.5">
                          <ArrowIcon />
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* =====================================================
              MOBILE / TABLET TICKET LIST
          ===================================================== */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {filteredRows.map((row) => (
              <article
                key={row.id}
                className="
                  relative
                  overflow-hidden
                  bg-white
                  px-4
                  py-5
                  sm:px-5
                "
              >
                {/* Ticket side cutouts */}
                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -left-2
                    top-1/2
                    h-4
                    w-4
                    -translate-y-1/2
                    rounded-full
                    bg-slate-50
                  "
                />

                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -right-2
                    top-1/2
                    h-4
                    w-4
                    -translate-y-1/2
                    rounded-full
                    bg-slate-50
                  "
                />

                {/* Booking + status */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Booking
                    </p>

                    <p
                      className="
                        fs-nums
                        mt-1
                        break-all
                        text-sm
                        font-semibold
                        tracking-[0.02em]
                        text-slate-950
                      "
                    >
                      {row.bookingReference}
                    </p>
                  </div>

                  <span
                    className={`
                      inline-flex
                      shrink-0
                      rounded-full
                      px-3
                      py-1.5
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.08em]
                      ${statusClassName(row.status)}
                    `}
                  >
                    {row.status}
                  </span>
                </div>

                {/* Route */}
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                    {row.flightCode}
                  </p>

                  <p className="font-american-sans mt-1 text-2xl font-light tracking-[-0.025em] text-slate-950">
                    {row.route}
                  </p>
                </div>

                {/* Details */}
                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-dashed border-slate-200 pt-4">
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Customer
                    </dt>

                    <dd className="mt-1 break-words text-sm font-medium text-slate-700">
                      {row.customerLabel}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Travelers
                    </dt>

                    <dd className="fs-nums mt-1 text-sm font-semibold text-slate-950">
                      {row.passengerCount}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Total
                    </dt>

                    <dd className="fs-nums mt-1 text-sm font-semibold text-slate-950">
                      {formatMoney(row.total)}
                    </dd>
                  </div>

                  <div className="col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Created
                    </dt>

                    <dd className="mt-1 text-sm text-slate-600">
                      {formatDateTime(row.createdAt)}
                    </dd>
                  </div>
                </dl>

                {/* Mobile action */}
                <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
                  <Link
                    href={`/admin/bookings/${row.id}`}
                    className="
                      group/view
                      inline-flex
                      min-h-11
                      w-full
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
                </div>
              </article>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Five Stars • Booking records
            </p>
          </div>
        </div>
      )}
    </div>
  );
}