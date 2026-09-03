import Link from "next/link";

import LogoutButton from "../../components/auth/LogoutButton";
import { requireStaffOrAdmin } from "../../lib/authorization";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/flights", label: "Flights" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/passengers", label: "Passengers" },
  { href: "/admin/cargo", label: "Cargo" },
  { href: "/admin/charter", label: "Charter" },
  { href: "/admin/contact-messages", label: "Inbox" },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaffOrAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operations
            </p>
            <Link
              href="/admin"
              className="text-2xl font-bold tracking-tight text-slate-950"
            >
              StarJet Admin
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-primary">
              {user.role}
            </span>
            <Link
              href="/"
              className="rounded-xl px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Customer site
            </Link>
            <LogoutButton />
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-6 pb-4 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-slate-700 transition hover:bg-slate-100 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
    </div>
  );
}
