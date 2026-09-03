import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "../../components/auth/LogoutButton";
import ResendVerificationButton from "../../components/auth/ResendVerificationButton";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const welcomeName = user.firstName?.trim() || user.email;

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
              Welcome, {welcomeName}
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Manage your StarJet trips, cargo requests, and charter
              requests from one place.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/my-trips"
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Travel
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  My Trips
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  View and continue your flight bookings.
                </p>
              </Link>

              <Link
                href="/my-cargo"
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Shipping
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  My Cargo
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Track cargo requests submitted from your account.
                </p>
              </Link>

              <Link
                href="/my-charter"
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Private
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  My Charter
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Track charter requests submitted from your account.
                </p>
              </Link>

              <Link
                href="/my-messages"
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Support
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  My Messages
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Track contact messages submitted from your account.
                </p>
              </Link>

              <Link
                href="/account"
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  Account
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Profile
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Update your personal details and password.
                </p>
              </Link>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Profile
              </p>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {user.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Role</dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {user.role}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Email verification</dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {user.emailVerified
                      ? "Email verified"
                      : "Email not verified"}
                  </dd>
                  {!user.emailVerified && (
                    <ResendVerificationButton email={user.email} />
                  )}
                </div>
              </dl>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <LogoutButton className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70" />
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
