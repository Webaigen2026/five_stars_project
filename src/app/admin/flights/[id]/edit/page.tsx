import Link from "next/link";
import { notFound } from "next/navigation";

import AdminFlightForm from "../../../../../components/admin/flights/AdminFlightForm";
import { toSafeFlight } from "../../../../../lib/admin-flights";
import { requireAdmin } from "../../../../../lib/authorization";
import { db } from "../../../../../prisma/db";

function parseFlightId(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export default async function EditFlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id: rawId } = await params;
  const id = parseFlightId(rawId);

  if (id == null) {
    notFound();
  }

  const flight = await db.orm.public.Flight.select(
    "id",
    "code",
    "airline",
    "aircraft",
    "origin",
    "originCode",
    "destination",
    "destinationCode",
    "departureTime",
    "arrivalTime",
    "durationMinutes",
    "price",
    "totalSeats",
    "availableSeats",
    "status",
    "createdAt",
    "updatedAt"
  )
    .where({ id })
    .first();

  if (!flight) {
    notFound();
  }

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Edit {flight.code}
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Update schedule, seats, price, or status. Price is entered in dollars
        and stored as cents.
      </p>

      <p className="mt-4">
        <Link
          href="/admin/flights"
          className="text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          ← Back to flights
        </Link>
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <AdminFlightForm mode="edit" flight={toSafeFlight(flight)} />
      </section>
    </>
  );
}
