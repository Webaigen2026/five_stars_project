"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  CONTACT_CATEGORIES,
  CONTACT_STATUSES,
} from "../../../lib/contact";

export type AdminContactMessageRow = {
  id: number;
  reference: string;
  status: string;
  category: string | null;
  fullName: string;
  email: string;
  subject: string;
  userId: number | null;
  createdAt: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ContactMessagesTable({
  rows,
}: {
  rows: AdminContactMessageRow[];
}) {
  const [referenceQuery, setReferenceQuery] = useState("");
  const [nameEmailQuery, setNameEmailQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filteredRows = useMemo(() => {
    const reference = referenceQuery.trim().toLowerCase();
    const nameEmail = nameEmailQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesReference =
        !reference || row.reference.toLowerCase().includes(reference);
      const matchesNameEmail =
        !nameEmail ||
        row.fullName.toLowerCase().includes(nameEmail) ||
        row.email.toLowerCase().includes(nameEmail);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesCategory =
        !categoryFilter || row.category === categoryFilter;

      return (
        matchesReference &&
        matchesNameEmail &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [rows, referenceQuery, nameEmailQuery, statusFilter, categoryFilter]);

  return (
    <div className="mt-10">
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label
            htmlFor="contact-reference-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Reference
          </label>
          <input
            id="contact-reference-search"
            value={referenceQuery}
            onChange={(event) => setReferenceQuery(event.target.value)}
            placeholder="CT-XXXXXX"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="contact-name-email-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Name or email
          </label>
          <input
            id="contact-name-email-search"
            value={nameEmailQuery}
            onChange={(event) => setNameEmailQuery(event.target.value)}
            placeholder="Search sender"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="contact-status-filter"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="contact-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="contact-category-filter"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Category
          </label>
          <select
            id="contact-category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All categories</option>
            {CONTACT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No contact messages match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Message</th>
                <th className="px-5 py-4">Sender</th>
                <th className="px-5 py-4">Subject</th>
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
                      {row.reference}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase text-primary">
                      {row.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.category ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-slate-950">{row.fullName}</p>
                    <p className="mt-1 text-slate-600">{row.email}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {row.userId ? "Linked user" : "Guest"}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    {row.subject}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 align-top text-slate-600">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/admin/contact-messages/${row.id}`}
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
    </div>
  );
}
