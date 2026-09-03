import Link from "next/link";
import { notFound } from "next/navigation";

import RequestStatusForm from "../../../../components/admin/RequestStatusForm";
import EditCharterForm from "../../../../components/admin/charter/EditCharterForm";
import { parsePositiveInt } from "../../../../lib/admin-bookings";
import { isAdmin, requireStaffOrAdmin } from "../../../../lib/authorization";
import { CHARTER_STATUSES, toSafeCharterRequest } from "../../../../lib/charter";
import { db } from "../../../../prisma/db";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminCharterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireStaffOrAdmin();
  const canEdit = isAdmin(currentUser.role);
  const { id: rawId } = await params;
  const id = parsePositiveInt(rawId);

  if (id == null) {
    notFound();
  }

  const charterRequest = await db.orm.public.CharterRequest.where({
    id,
  }).first();

  if (!charterRequest) {
    notFound();
  }

  const linkedUser = charterRequest.userId
    ? await db.orm.public.User.select("id", "email", "firstName", "lastName")
        .where({ id: charterRequest.userId })
        .first()
    : null;

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        {charterRequest.reference}
      </h1>
      <p className="mt-4">
        <Link
          href="/admin/charter"
          className="text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          ← Back to charter requests
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Status</h2>
          <p className="mt-3 text-sm text-slate-600">
            Current status:{" "}
            <span className="font-semibold text-slate-950">
              {charterRequest.status}
            </span>
          </p>
          <RequestStatusForm
            actionUrl={`/api/admin/charter/${charterRequest.id}`}
            currentStatus={charterRequest.status}
            statuses={CHARTER_STATUSES}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Requester</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {charterRequest.fullName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 text-slate-950">{charterRequest.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.phone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Account</dt>
              <dd className="mt-1 text-slate-950">
                {linkedUser
                  ? `Linked user · ${linkedUser.email}`
                  : "Guest request"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Trip</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Route</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.origin} → {charterRequest.destination}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Departure</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.departureDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Return</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.returnDate ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Passengers</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.passengerCount}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Aircraft preference</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.aircraftPreference ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Budget</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.budget ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Notes</dt>
              <dd className="mt-1 text-slate-950">
                {charterRequest.notes ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Timestamps</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="mt-1 text-slate-950">
                {formatDateTime(charterRequest.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd className="mt-1 text-slate-950">
                {formatDateTime(charterRequest.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {canEdit && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-semibold text-slate-950">
            Edit request details
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Reference and linked user cannot be changed.
          </p>
          <EditCharterForm
            charterRequest={toSafeCharterRequest(charterRequest)}
          />
        </section>
      )}
    </>
  );
}
