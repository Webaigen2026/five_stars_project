import Link from "next/link";
import { notFound } from "next/navigation";

import RequestStatusForm from "../../../../components/admin/RequestStatusForm";
import EditCargoForm from "../../../../components/admin/cargo/EditCargoForm";
import { parsePositiveInt } from "../../../../lib/admin-bookings";
import { isAdmin, requireStaffOrAdmin } from "../../../../lib/authorization";
import { CARGO_STATUSES, toSafeCargoRequest } from "../../../../lib/cargo";
import { db } from "../../../../prisma/db";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminCargoDetailPage({
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

  const cargoRequest = await db.orm.public.CargoRequest.where({ id }).first();

  if (!cargoRequest) {
    notFound();
  }

  const linkedUser = cargoRequest.userId
    ? await db.orm.public.User.select("id", "email", "firstName", "lastName")
        .where({ id: cargoRequest.userId })
        .first()
    : null;

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        {cargoRequest.reference}
      </h1>
      <p className="mt-4">
        <Link
          href="/admin/cargo"
          className="text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          ← Back to cargo requests
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Status</h2>
          <p className="mt-3 text-sm text-slate-600">
            Current status:{" "}
            <span className="font-semibold text-slate-950">
              {cargoRequest.status}
            </span>
          </p>
          <RequestStatusForm
            actionUrl={`/api/admin/cargo/${cargoRequest.id}`}
            currentStatus={cargoRequest.status}
            statuses={CARGO_STATUSES}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Requester</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {cargoRequest.fullName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 text-slate-950">{cargoRequest.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 text-slate-950">
                {cargoRequest.phone ?? "—"}
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
          <h2 className="text-xl font-semibold text-slate-950">Shipment</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Route</dt>
              <dd className="mt-1 text-slate-950">
                {cargoRequest.origin} → {cargoRequest.destination}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="mt-1 text-slate-950">{cargoRequest.cargoType}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Quantity</dt>
              <dd className="mt-1 text-slate-950">
                {cargoRequest.quantity ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Weight</dt>
              <dd className="mt-1 text-slate-950">
                {cargoRequest.weight ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Preferred date</dt>
              <dd className="mt-1 text-slate-950">
                {cargoRequest.preferredDate ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Description</dt>
              <dd className="mt-1 text-slate-950">
                {cargoRequest.description ?? "—"}
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
                {formatDateTime(cargoRequest.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd className="mt-1 text-slate-950">
                {formatDateTime(cargoRequest.updatedAt)}
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
          <EditCargoForm cargoRequest={toSafeCargoRequest(cargoRequest)} />
        </section>
      )}
    </>
  );
}
