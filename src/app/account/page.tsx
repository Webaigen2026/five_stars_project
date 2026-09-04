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
    db.orm.public.Booking.where({ userId: currentUser.id }).aggregate(
      (aggregate) => ({
        total: aggregate.count(),
      })
    ),
    db.orm.public.CargoRequest.where({ userId: currentUser.id }).aggregate(
      (aggregate) => ({
        total: aggregate.count(),
      })
    ),
    db.orm.public.CharterRequest.where({ userId: currentUser.id }).aggregate(
      (aggregate) => ({
        total: aggregate.count(),
      })
    ),
    db.orm.public.ContactMessage.where({ userId: currentUser.id }).aggregate(
      (aggregate) => ({
        total: aggregate.count(),
      })
    ),
    db.orm.public.TravelerProfile.where({ userId: currentUser.id }).aggregate(
      (aggregate) => ({
        total: aggregate.count(),
      })
    ),
  ]);

  if (!user) {
    redirect("/login");
  }

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
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Account
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Your account
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Manage your profile, saved travelers, password, and account
              status in one place.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Personal profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Your details
              </h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-slate-500">Email</dt>
                  <dd className="min-w-0 break-all text-right font-medium text-slate-950">
                    {user.email}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Role</dt>
                  <dd className="font-medium text-slate-950">{user.role}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-right text-slate-950">
                    {formatDateTime(user.createdAt)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-slate-600">
                Email and role cannot be changed here.
              </p>
              <ProfileForm
                firstName={user.firstName ?? ""}
                lastName={user.lastName ?? ""}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Saved travelers
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Saved Travelers
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Manage traveler profiles, passport details, and reusable
                booking information.
              </p>
              <p className="mt-4 text-sm font-medium text-slate-950">
                {travelers.total === 1
                  ? "1 traveler on file"
                  : `${travelers.total} travelers on file`}
              </p>
              <Link
                href="/account/travelers"
                className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Manage saved travelers
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Security
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Password
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Other signed-in devices will be signed out after a successful
                password change.
              </p>
              <ChangePasswordForm />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Account status
              </p>
              <h2 className="mt-2 break-all text-2xl font-semibold text-slate-950">
                {user.email}
              </h2>
              <p className="mt-3 text-sm font-medium text-slate-950">
                {user.emailVerified ? "Email verified" : "Email not verified"}
              </p>
              {!user.emailVerified && (
                <ResendVerificationButton email={user.email} />
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2 md:p-8 lg:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Account activity
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Your records
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {activity.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <p className="text-sm font-medium text-slate-600">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
