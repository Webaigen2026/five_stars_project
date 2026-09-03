import ContactMessagesTable, {
  type AdminContactMessageRow,
} from "../../../components/admin/contact/ContactMessagesTable";
import { requireStaffOrAdmin } from "../../../lib/authorization";
import { db } from "../../../prisma/db";

export default async function AdminContactMessagesPage() {
  await requireStaffOrAdmin();

  const messages = [...(await db.orm.public.ContactMessage.all())].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
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
    { label: "Total", value: String(messages.length) },
    {
      label: "NEW",
      value: String(messages.filter((item) => item.status === "NEW").length),
    },
    {
      label: "IN_PROGRESS",
      value: String(
        messages.filter((item) => item.status === "IN_PROGRESS").length
      ),
    },
    {
      label: "RESOLVED",
      value: String(
        messages.filter((item) => item.status === "RESOLVED").length
      ),
    },
    {
      label: "CLOSED",
      value: String(messages.filter((item) => item.status === "CLOSED").length),
    },
  ];

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Operations
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Inbox
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Review contact messages submitted by guests and customers.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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

      {messages.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No contact messages yet.
        </div>
      ) : (
        <ContactMessagesTable rows={rows} />
      )}
    </>
  );
}
