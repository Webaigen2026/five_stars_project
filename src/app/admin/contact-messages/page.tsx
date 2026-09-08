import ContactMessagesTable, {
  type AdminContactMessageRow,
} from "../../../components/admin/contact/ContactMessagesTable";

import { requireStaffOrAdmin } from "../../../lib/authorization";

import { db } from "../../../prisma/db";

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

export default async function AdminContactMessagesPage() {
  await requireStaffOrAdmin();

  const messages = [...(await db.orm.public.ContactMessage.all())].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime()
  );

  const rows: AdminContactMessageRow[] = messages.map((item) => ({
    id: item.id,
    reference: item.reference,
    status: item.status,
    category: item.category,
    fullName: item.fullName,
    email: item.email,
    subject: item.subject,
    userId: item.userId,
    createdAt: item.createdAt,
  }));

  const summaries = [
    {
      label: "Total",
      value: String(messages.length),
      meta: "Inbox",
    },
    {
      label: "NEW",
      value: String(
        messages.filter((item) => item.status === "NEW").length
      ),
      meta: "Unread",
    },
    {
      label: "IN_PROGRESS",
      value: String(
        messages.filter((item) => item.status === "IN_PROGRESS").length
      ),
      meta: "Active",
    },
    {
      label: "RESOLVED",
      value: String(
        messages.filter((item) => item.status === "RESOLVED").length
      ),
      meta: "Resolved",
    },
    {
      label: "CLOSED",
      value: String(
        messages.filter((item) => item.status === "CLOSED").length
      ),
      meta: "Archived",
    },
  ];

  return (
    <>
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <div className="border-b border-slate-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
          Operations
        </p>

        <h1 className="font-american-sans mt-3 text-4xl font-light tracking-[-0.03em] text-slate-950 sm:text-5xl">
          Inbox
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Review contact messages submitted by guests and customers, track
          their status, and continue support follow-up from one place.
        </p>
      </div>

      {/* =========================================================
          SUMMARY TICKETS
      ========================================================= */}
      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {summaries.map((item) => (
          <div
            key={item.label}
            className="group relative isolate min-w-0"
          >
            {/* Soft floating shadow */}
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-7
                -bottom-3
                -z-10
                h-7
                rounded-[50%]
                bg-slate-950/[0.06]
                blur-xl
              "
            />

            {/* Ticket */}
            <div
              className="
                relative
                h-full
                overflow-hidden
                bg-white
                shadow-[0_7px_24px_rgba(15,23,42,0.06)]
                transition
                duration-200
                group-hover:-translate-y-0.5
                group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)]
              "
            >
              <TicketCutouts />

              <div className="flex min-h-[150px]">
                {/* Main metric */}
                <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      {item.meta}
                    </p>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-600">
                      {item.label.replaceAll("_", " ")}
                    </p>
                  </div>

                  <p
                    className="
                      fs-nums
                      mt-6
                      text-4xl
                      font-semibold
                      tracking-[-0.035em]
                      text-slate-950
                    "
                  >
                    {item.value}
                  </p>
                </div>

                {/* Perforated stub */}
                <div
                  className="
                    relative
                    w-[48px]
                    shrink-0
                    border-l
                    border-dashed
                    border-slate-300
                    bg-slate-50/70
                  "
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50"
                  />

                  <span
                    aria-hidden="true"
                    className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* =========================================================
          CONTACT MESSAGE RECORDS
      ========================================================= */}
      <section className="mt-12">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              Customer care
            </p>

            <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950 sm:text-3xl">
              Contact messages
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review customer requests, message categories, and support
              workflow status.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            {messages.length}{" "}
            {messages.length === 1 ? "message" : "messages"}
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="relative isolate">
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-10
                -bottom-3
                -z-10
                h-8
                rounded-[50%]
                bg-slate-950/[0.06]
                blur-2xl
              "
            />

            <div
              className="
                relative
                overflow-hidden
                bg-white
                px-6
                py-12
                text-center
                shadow-[0_8px_28px_rgba(15,23,42,0.06)]
              "
            >
              <TicketCutouts />

              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                Customer care
              </p>

              <h3 className="font-american-sans mt-3 text-2xl font-light tracking-[-0.025em] text-slate-950">
                No contact messages yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Messages submitted by guests and customers will appear here.
              </p>

              <div className="mx-auto mt-7 max-w-sm border-t border-dashed border-slate-300 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Five Stars • Customer care
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="
              overflow-hidden
              bg-white
              shadow-[0_8px_30px_rgba(15,23,42,0.05)]
            "
          >
            <ContactMessagesTable rows={rows} />

            <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Five Stars • Customer care operations
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}