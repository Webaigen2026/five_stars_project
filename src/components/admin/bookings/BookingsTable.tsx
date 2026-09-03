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
      return "bg-amber-50 text-amber-800";
    case "PAID":
    case "CONFIRMED":
    case "TICKETED":
      return "bg-sky-50 text-primary";
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

export default function BookingsTable({ rows }: { rows: AdminBookingRow[] }) {
  const [referenceQuery, setReferenceQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredRows = useMemo(() => {
    const query = referenceQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesReference =
        !query || row.bookingReference.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || row.status === statusFilter;

      return matchesReference && matchesStatus;
    });
  }, [rows, referenceQuery, statusFilter]);

  return (
    <div className="mt-8">
      <div className="mb-5 flex flex-wrap gap-4">
        <div className="min-w-64 flex-1">
          <label
            htmlFor="booking-reference-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Booking reference
          </label>
          <input
            id="booking-reference-search"
            value={referenceQuery}
            onChange={(event) => setReferenceQuery(event.target.value)}
            placeholder="SJ-XXXXXX"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="min-w-52">
          <label
            htmlFor="booking-status-filter"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="booking-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No bookings match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Booking</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Flight</th>
                <th className="px-5 py-4">Passengers</th>
                <th className="px-5 py-4">Pricing</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-slate-950">
                      {row.bookingReference}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    {row.customerLabel}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-slate-950">{row.flightCode}</p>
                    <p className="mt-1 text-slate-600">{row.route}</p>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-950">
                    {row.passengerCount}
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    <p>Subtotal {formatMoney(row.subtotal)}</p>
                    <p className="mt-1">Taxes {formatMoney(row.taxesAndFees)}</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      Total {formatMoney(row.total)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 align-top text-slate-600">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/admin/bookings/${row.id}`}
                      className="rounded-xl px-3 py-2 font-medium text-primary transition hover:bg-sky-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
