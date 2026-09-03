import Link from "next/link";

import { requireStaffOrAdmin } from "../../../lib/authorization";
import { db } from "../../../prisma/db";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminCharterPage() {
  await requireStaffOrAdmin();

  const requests = [...(await db.orm.public.CharterRequest.all())].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const summaries = [
    { label: "Total", value: String(requests.length) },
    {
      label: "NEW",
      value: String(requests.filter((item) => item.status === "NEW").length),
    },
    {
      label: "REVIEWING",
      value: String(
        requests.filter((item) => item.status === "REVIEWING").length
      ),
    },
    {
      label: "Approved / scheduled",
      value: String(
        requests.filter(
          (item) => item.status === "APPROVED" || item.status === "SCHEDULED"
        ).length
      ),
    },
    {
      label: "COMPLETED",
      value: String(
        requests.filter((item) => item.status === "COMPLETED").length
      ),
    },
    {
      label: "CANCELLED",
      value: String(
        requests.filter((item) => item.status === "CANCELLED").length
      ),
    },
  ];

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Charter requests
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Review every private charter request submitted by guests and customers.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      {requests.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No charter requests yet.
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Request</th>
                <th className="px-5 py-4">Requester</th>
                <th className="px-5 py-4">Route</th>
                <th className="px-5 py-4">Travel</th>
                <th className="px-5 py-4">Aircraft / budget</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-slate-950">{item.reference}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-primary">
                      {item.status}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-slate-950">{item.fullName}</p>
                    <p className="mt-1 text-slate-600">{item.email}</p>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    {item.origin} → {item.destination}
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    <p>{item.departureDate}</p>
                    <p className="mt-1">Return {item.returnDate ?? "—"}</p>
                    <p className="mt-1">{item.passengerCount} passengers</p>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    <p>{item.aircraftPreference ?? "—"}</p>
                    <p className="mt-1">{item.budget ?? "—"}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 align-top text-slate-600">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/admin/charter/${item.id}`}
                      className="font-medium text-primary transition hover:text-primary-hover"
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
    </>
  );
}
