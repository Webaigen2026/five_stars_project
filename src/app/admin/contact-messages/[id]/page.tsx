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

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
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

function SectionPerforation() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -left-3 z-20 h-6 w-6 rounded-full bg-slate-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -right-3 z-20 h-6 w-6 rounded-full bg-slate-50"
      />
    </>
  );
}

function statusClassName(status: string) {
  switch (status) {
    case "NEW":
      return "bg-[#0078D2]/[0.07] text-[#0078D2]";

    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-800";

    case "RESOLVED":
      return "bg-emerald-50 text-emerald-800";

    case "CLOSED":
      return "bg-slate-100 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
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
    ? await db.orm.public.User.select(
        "id",
        "email",
        "firstName",
        "lastName"
      )
        .where({ id: contactMessage.userId })
        .first()
    : null;

  const linkedUserName = linkedUser
    ? [linkedUser.firstName, linkedUser.lastName]
        .filter((value) => Boolean(value?.trim()))
        .join(" ")
        .trim()
    : "";

  return (
    <>
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <div className="border-b border-slate-200 pb-8">
        <Link
          href="/admin/contact-messages"
          className="
            group
            inline-flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-500
            transition
            hover:text-[#0078D2]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-[#0078D2]/30
            focus-visible:ring-offset-4
          "
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            <ArrowLeftIcon />
          </span>

          Back to inbox
        </Link>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
          Operations
        </p>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-american-sans break-all text-4xl font-light tracking-[-0.03em] text-slate-950 sm:text-5xl">
              {contactMessage.reference}
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Review the customer message, sender details, support status, and
              internal follow-up.
            </p>
          </div>

          <span
            className={`
              inline-flex
              w-fit
              shrink-0
              rounded-full
              px-3
              py-1.5
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.1em]
              ${statusClassName(contactMessage.status)}
            `}
          >
            {contactMessage.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      {/* =========================================================
          MAIN CASE TICKET
      ========================================================= */}
      <section className="relative isolate mt-10 min-w-0">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 -bottom-4 -z-10 h-9 rounded-[50%] bg-slate-950/[0.07] blur-2xl"
        />

        <div className="relative overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <TicketCutouts />

          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* =====================================================
                MAIN MESSAGE BODY
            ===================================================== */}
            <div className="min-w-0">
              {/* Message header */}
              <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6 lg:px-8">
                <SectionPerforation />

                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                  Contact message
                </p>

                <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
                  {contactMessage.subject}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span>
                    From{" "}
                    <span className="font-medium text-slate-800">
                      {contactMessage.fullName}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block"
                  />

                  <span>{formatDateTime(contactMessage.createdAt)}</span>
                </div>
              </div>

              {/* Actual message */}
              <section
                className="px-5 py-6 sm:px-6 lg:px-8"
                aria-labelledby="message-body-heading"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Customer message
                </p>

                <h3
                  id="message-body-heading"
                  className="font-american-sans mt-2 text-xl font-light tracking-[-0.02em] text-slate-950"
                >
                  Message
                </h3>

                <div
                  className="
                    mt-4
                    whitespace-pre-wrap
                    border-l-2
                    border-[#0078D2]
                    bg-slate-50/70
                    px-4
                    py-4
                    text-sm
                    leading-7
                    text-slate-800
                    sm:px-5
                  "
                >
                  {contactMessage.message}
                </div>
              </section>

              {/* Internal note */}
              <section className="border-t border-dashed border-slate-200 px-5 py-6 sm:px-6 lg:px-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Internal use
                </p>

                <h3 className="font-american-sans mt-2 text-xl font-light tracking-[-0.02em] text-slate-950">
                  Internal note
                </h3>

                <div className="mt-4 bg-slate-50 px-4 py-4 sm:px-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {contactMessage.internalNote ?? "No internal note yet."}
                  </p>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center sm:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Five Stars • Customer care case
                </p>
              </div>
            </div>

            {/* =====================================================
                CASE STUB / OPERATIONS RAIL
            ===================================================== */}
            <aside
              className="
                relative
                min-w-0
                border-t
                border-dashed
                border-slate-300
                bg-slate-50/50
                lg:border-l
                lg:border-t-0
              "
              aria-label="Message operations"
            >
              {/* Mobile notches */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50 lg:hidden"
              />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50 lg:hidden"
              />

              {/* Desktop notches */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-3 -top-3 hidden h-6 w-6 rounded-full bg-slate-50 lg:block"
              />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 -left-3 hidden h-6 w-6 rounded-full bg-slate-50 lg:block"
              />

              <div className="space-y-7 px-5 py-6 sm:px-6 lg:sticky lg:top-6">
                {/* Status */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Case status
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`
                        inline-flex
                        rounded-full
                        px-3
                        py-1.5
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.1em]
                        ${statusClassName(contactMessage.status)}
                      `}
                    >
                      {contactMessage.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Category
                      </dt>

                      <dd className="mt-1.5 text-sm font-medium text-slate-950">
                        {contactMessage.category ?? "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Reference
                      </dt>

                      <dd className="fs-nums mt-1.5 break-all text-sm font-semibold tracking-[0.02em] text-slate-950">
                        {contactMessage.reference}
                      </dd>
                    </div>
                  </dl>
                </section>

                <div className="border-t border-dashed border-slate-300" />

                {/* Sender */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Sender
                  </p>

                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Name
                      </dt>

                      <dd className="mt-1.5 text-sm font-medium text-slate-950">
                        {contactMessage.fullName}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Email
                      </dt>

                      <dd className="mt-1.5 break-all text-sm text-slate-700">
                        {contactMessage.email}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Phone
                      </dt>

                      <dd className="mt-1.5 text-sm text-slate-700">
                        {contactMessage.phone ?? "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Account
                      </dt>

                      <dd className="mt-1.5 text-sm leading-6 text-slate-700">
                        {linkedUser ? (
                          <>
                            <span className="font-medium text-slate-950">
                              {linkedUserName || "Linked user"}
                            </span>

                            <span className="mt-1 block break-all text-xs text-slate-500">
                              {linkedUser.email}
                            </span>
                          </>
                        ) : (
                          "Guest message"
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>

                <div className="border-t border-dashed border-slate-300" />

                {/* Timestamps */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Timeline
                  </p>

                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Created
                      </dt>

                      <dd className="mt-1.5 text-sm text-slate-700">
                        {formatDateTime(contactMessage.createdAt)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Updated
                      </dt>

                      <dd className="mt-1.5 text-sm text-slate-700">
                        {formatDateTime(contactMessage.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <div className="border-t border-dashed border-slate-300" />

                {/* Actions */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Case management
                  </p>

                  <ContactMessageActions
                    messageId={contactMessage.id}
                    currentStatus={contactMessage.status}
                    currentInternalNote={contactMessage.internalNote}
                  />
                </section>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}