import Link from "next/link";

import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { requireUser } from "../../lib/authorization";
import { db } from "../../prisma/db";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MyMessagesPage() {
  const user = await requireUser();
  const messages = [
    ...(await db.orm.public.ContactMessage.select(
      "id",
      "reference",
      "category",
      "subject",
      "status",
      "createdAt"
    )
      .where({ userId: user.id })
      .all()),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              My Messages
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Your contact messages
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Messages submitted while signed in appear here.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          {messages.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">
                No messages yet
              </h2>
              <p className="mt-3 text-slate-600">
                Submit a contact message while signed in to track it here.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
              >
                Contact StarJet
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                        {item.reference}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                        {item.subject}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.category ?? "GENERAL"}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-primary">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-5 text-sm text-slate-500">
                    Created {formatDateTime(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
