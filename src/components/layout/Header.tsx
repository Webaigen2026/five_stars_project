"use client";

import { useState } from "react";
import Link from "next/link";

import HeaderAccountNav from "./HeaderAccountNav";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-slate-950"
        >
          StarJet
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link
            href="/flights"
            className="text-slate-700 transition hover:text-primary"
          >
            Flights
          </Link>

          <Link
            href="/cargo"
            className="text-slate-700 transition hover:text-primary"
          >
            Cargo
          </Link>

          <Link
            href="/charter"
            className="text-slate-700 transition hover:text-primary"
          >
            Charter
          </Link>

          <Link
            href="/contact"
            className="text-slate-700 transition hover:text-primary"
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <HeaderAccountNav />

          <Link
            href="/flights"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Book a Flight
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <span className="text-xl">×</span>
          ) : (
            <span className="text-xl">☰</span>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            <Link
              href="/flights"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Flights
            </Link>

            <Link
              href="/cargo"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cargo
            </Link>

            <Link
              href="/charter"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Charter
            </Link>

            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Contact
            </Link>

            <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <HeaderAccountNav />
              </div>

              <Link
                href="/flights"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Book Flight
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}