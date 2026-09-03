import Link from "next/link";
import { notFound } from "next/navigation";

import ContactMessageActions from "../../../../components/admin/contact/ContactMessageActions";
import { parsePositiveInt } from "../../../../lib/admin-bookings";
import { requireStaffOrAdmin } from "../../../../lib/authorization";
import { db } from "../../../../prisma/db";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminContactMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffOrAdmin();
  const { id: rawId } = await params;
  const id = parsePositiveInt(rawId);

  if (id == null) {
    notFound();
  }

  const contactMessage = await db.orm.public.ContactMessage.where({
    id,
  }).first();

  if (!contactMessage) {
    notFound();
  }

  const linkedUser = contactMessage.userId
    ? await db.orm.public.User.select("id", "email", "firstName", "lastName")
        .where({ id: contactMessage.userId })
        .first()
    : null;

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        {contactMessage.reference}
      </h1>
      <p className="mt-4">
        <Link
          href="/admin/contact-messages"
          className="text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          ← Back to inbox
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Status</h2>
          <p className="mt-3 text-sm text-slate-600">
            Current status:{" "}
            <span className="font-semibold text-slate-950">
              {contactMessage.status}
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Category:{" "}
            <span className="font-semibold text-slate-950">
              {contactMessage.category ?? "—"}
            </span>
          </p>
          <ContactMessageActions
            messageId={contactMessage.id}
            currentStatus={contactMessage.status}
            currentInternalNote={contactMessage.internalNote}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Sender</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {contactMessage.fullName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 text-slate-950">{contactMessage.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 text-slate-950">
                {contactMessage.phone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Account</dt>
              <dd className="mt-1 text-slate-950">
                {linkedUser
                  ? `Linked user · ${linkedUser.email}`
                  : "Guest message"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Message</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Subject</dt>
              <dd className="mt-1 text-slate-950">{contactMessage.subject}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Message</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-950">
                {contactMessage.message}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Internal note</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-950">
                {contactMessage.internalNote ?? "—"}
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
                {formatDateTime(contactMessage.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd className="mt-1 text-slate-950">
                {formatDateTime(contactMessage.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
