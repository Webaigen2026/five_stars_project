import Link from "next/link";
import { redirect } from "next/navigation";

import ChangePasswordForm from "../../components/account/ChangePasswordForm";
import ProfileForm from "../../components/account/ProfileForm";
import ResendVerificationButton from "../../components/auth/ResendVerificationButton";
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

function ArrowIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
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
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function MailIcon() {
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
      <path d="M4 4h16v16H4z" />
      <path d="m4 7 8 6 8-6" />
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

export default async function AccountPage() {
  const currentUser = await requireUser();

  const [user, trips, cargo, charter, messages, travelers] = await Promise.all([
    db.orm.public.User.select(
      "id",
      "email",
      "firstName",
      "lastName",
      "role",
      "emailVerified",
      "createdAt"
    )
      .where({ id: currentUser.id })
      .first(),

    db.orm.public.Booking.where({
      userId: currentUser.id,
    }).aggregate((aggregate) => ({
      total: aggregate.count(),
    })),

    db.orm.public.CargoRequest.where({
      userId: currentUser.id,
    }).aggregate((aggregate) => ({
      total: aggregate.count(),
    })),

    db.orm.public.CharterRequest.where({
      userId: currentUser.id,
    }).aggregate((aggregate) => ({
      total: aggregate.count(),
    })),

    db.orm.public.ContactMessage.where({
      userId: currentUser.id,
    }).aggregate((aggregate) => ({
      total: aggregate.count(),
    })),

    db.orm.public.TravelerProfile.where({
      userId: currentUser.id,
    }).aggregate((aggregate) => ({
      total: aggregate.count(),
    })),
  ]);

  if (!user) {
    redirect("/login");
  }

  const profileName = [user.firstName, user.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  const activity = [
    {
      label: "My Trips",
      href: "/my-trips",
      value: trips.total,
    },
    {
      label: "My Cargo",
      href: "/my-cargo",
      value: cargo.total,
    },
    {
      label: "My Charter",
      href: "/my-charter",
      value: charter.total,
    },
    {
      label: "Saved Travelers",
      href: "/account/travelers",
      value: travelers.total,
    },
  ];

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        {/* Page header */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14 xl:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
              Account
            </p>

            <h1 className="font-american-sans mt-3 text-4xl font-light tracking-[-0.03em] text-slate-950 sm:text-5xl">
              Your account
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Manage your profile, saved travelers, password, and account
              status in one place.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-10">
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            {/* Personal profile ticket */}
            <section className="relative isolate min-w-0">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/10 blur-2xl"
              />

              <div className="relative overflow-hidden bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/90">
                <TicketCutouts />

                {/* Ticket header */}
                <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6 md:px-8">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0078D2] font-american-sans text-xl font-light text-white shadow-[0_5px_14px_rgba(0,120,210,0.18)]">
                      {(user.firstName?.trim()?.charAt(0) ||
                        user.email.charAt(0) ||
                        "F"
                      ).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                          Personal profile
                        </p>

                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Five Stars
                        </span>
                      </div>

                      <h2 className="font-american-sans mt-2 truncate text-2xl font-light tracking-[-0.025em] text-slate-950">
                        {profileName || "Your details"}
                      </h2>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account metadata */}
                <div className="px-5 py-5 sm:px-6 md:px-8">
                  <dl className="divide-y divide-slate-100 text-sm">
                    <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
                      <dt className="shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Email
                      </dt>

                      <dd className="min-w-0 break-all text-right font-medium text-slate-950">
                        {user.email}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Role
                      </dt>

                      <dd>
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {user.role}
                        </span>
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-4 py-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Created
                      </dt>

                      <dd className="text-right text-sm font-medium text-slate-950">
                        {formatDateTime(user.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Email and role cannot be changed here.
                  </p>

                  <div className="mt-6 border-t border-dashed border-slate-300 pt-6">
                    <ProfileForm
                      firstName={user.firstName ?? ""}
                      lastName={user.lastName ?? ""}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Saved travelers ticket */}
            <section className="relative isolate min-w-0">
              <div className="relative h-full overflow-hidden bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/90">
                <TicketCutouts />

                <div className="flex h-full min-w-0">
                  <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-6 sm:px-6 md:px-8">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Saved travelers
                      </p>

                      <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                        Traveler profiles
                      </h2>

                      <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                        Manage traveler profiles, passport details, and reusable
                        booking information.
                      </p>

                      <p className="mt-5 text-sm font-semibold text-slate-950">
                        {travelers.total === 1
                          ? "1 traveler on file"
                          : `${travelers.total} travelers on file`}
                      </p>
                    </div>

                    <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Five Stars • Travel
                    </p>
                  </div>

                  <div className="relative flex w-[84px] shrink-0 flex-col items-center justify-center border-l border-dashed border-slate-300 bg-slate-50/80">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                    />

                    <Link
                      href="/account/travelers"
                      aria-label="Manage saved travelers"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0078D2] shadow-sm transition hover:border-[#0078D2]/30 hover:bg-[#0078D2] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
                    >
                      <ArrowIcon />
                    </Link>

                    <span className="mt-3 rotate-180 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 [writing-mode:vertical-rl]">
                      Manage
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Security ticket */}
            <section className="relative isolate min-w-0">
              <div className="relative overflow-hidden bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/90">
                <TicketCutouts />

                <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6 md:px-8">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />

                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Security
                  </p>

                  <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                    Password
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                    Other signed-in devices will be signed out after a
                    successful password change.
                  </p>
                </div>

                <div className="px-5 py-6 sm:px-6 md:px-8">
                  <ChangePasswordForm />
                </div>
              </div>
            </section>

            {/* Email-status ticket */}
            <section className="relative isolate min-w-0">
              <div className="relative h-full overflow-hidden bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/90">
                <TicketCutouts />

                <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6 md:px-8">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />

                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Account status
                  </p>

                  <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                    Email status
                  </h2>

                  <p className="mt-2 break-all text-sm text-slate-500">
                    {user.email}
                  </p>
                </div>

                <div className="px-5 py-6 sm:px-6 md:px-8">
                  {user.emailVerified ? (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                        <CheckIcon />
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          Email verified
                        </p>

                        <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                          Your email address has been confirmed.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm">
                          <MailIcon />
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-amber-800">
                            Not verified
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-700/80">
                            Confirm your email so we know we can reach you and
                            help keep your account secure. Sign-in works either
                            way.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <ResendVerificationButton email={user.email} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Account activity ticket */}
            <section className="relative isolate min-w-0 md:col-span-2 lg:col-span-2">
              <div className="relative overflow-hidden bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/90">
                <TicketCutouts />

                <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6 md:px-8">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                  />

                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Account activity
                  </p>

                  <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                    Your records
                  </h2>
                </div>

                <div className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:px-6 md:px-8 lg:grid-cols-4">
                  {activity.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group relative overflow-hidden border border-slate-200 bg-slate-50/50 p-4 transition hover:border-[#0078D2]/30 hover:bg-[#f5faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-white"
                      />

                      <p className="text-xs font-medium text-slate-500">
                        {item.label}
                      </p>

                      <div className="mt-3 flex items-end justify-between gap-4">
                        <p className="fs-nums text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                          {item.value}
                        </p>

                        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0078D2]">
                          <ArrowIcon />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 bg-slate-50/70 px-5 py-3 text-center sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Five Stars • Account activity
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}