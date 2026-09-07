import Link from "next/link";
import { notFound } from "next/navigation";

import EditPassengerForm from "../../../../../components/admin/passengers/EditPassengerForm";
import { parsePositiveInt } from "../../../../../lib/admin-bookings";
import { formatPassengerTypeLabel } from "../../../../../lib/passenger-composition";
import { toPassengerEditView } from "../../../../../lib/admin-passengers";
import {
  canViewSensitiveTravelerData,
  requireAdmin,
} from "../../../../../lib/authorization";
import { db } from "../../../../../prisma/db";

export default async function EditPassengerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAdmin();

  const { id: rawId } = await params;
  const id = parsePositiveInt(rawId);

  if (id == null) {
    notFound();
  }

  const passenger = await db.orm.public.Passenger.select(
    "id",
    "bookingId",
    "firstName",
    "lastName",
    "dateOfBirth",
    "gender",
    "nationality",
    "passengerType",
    "passportNumberEncrypted",
    "passportCountry",
    "passportExpiry",
    "createdAt",
    "updatedAt"
  )
    .where({ id })
    .first();

  if (!passenger) {
    notFound();
  }

  const booking = await db.orm.public.Booking.select(
    "id",
    "bookingReference"
  )
    .where({ id: passenger.bookingId })
    .first();

  const editView = toPassengerEditView(passenger, {
    canReplacePassport: canViewSensitiveTravelerData(currentUser),
  });

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Edit passenger
      </h1>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Update identity and travel-document fields for{" "}
        {passenger.firstName} {passenger.lastName}
        {booking ? ` on ${booking.bookingReference}` : ""}. Booking category:{" "}
        <span className="font-semibold text-slate-900">
          {formatPassengerTypeLabel(passenger.passengerType)}
        </span>
        .
      </p>

      <p className="mt-4">
        <Link
          href={`/admin/bookings/${passenger.bookingId}`}
          className="text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          ← Back to booking
        </Link>
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <EditPassengerForm passenger={editView} />
      </section>
    </>
  );
}
